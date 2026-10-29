//AcademicBooksHandlerPackage//
import crypto from "node:crypto";
import CFB from "cfb";
import {
  DynamoDBClient,
  DescribeTableCommand,
  QueryCommand,
  PutItemCommand,
  GetItemCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import supertokens from "supertokens-node/index.js";
import Session from "supertokens-node/recipe/session/index.js";
import {
  wrapRequest,
  wrapResponse,
} from "supertokens-node/framework/awsLambda/index.js";
const ddb = new DynamoDBClient({});
const BOOKS_TABLE = process.env.BOOKS_TABLE;

const s3 = new S3Client({});
const BOOKS_BUCKET = process.env.BOOKS_BUCKET;

// CloudFront signed URL configuration.
const CLOUDFRONT_BOOKS_DOMAIN =
  process.env.CLOUDFRONT_BOOKS_DOMAIN;

const CLOUDFRONT_PUBLIC_KEY_ID =
  process.env.CLOUDFRONT_PUBLIC_KEY_ID;

// Retrieve and validate the CloudFront private key from Lambda
// environment variables without calling AWS Systems Manager.
async function getCloudFrontPrivateKey() {
  const privateKey = process.env.CLOUDFRONT_PRIVATE_KEY;

  if (!privateKey || !privateKey.trim()) {
    throw new Error("CLOUDFRONT_PRIVATE_KEY_NOT_CONFIGURED");
  }

  const normalized = privateKey
    .replace(/\\n/g, "\n")
    .replace(/\r/g, "")
    .trim();

  const match = normalized.match(
    /-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/
  );

  if (!match) {
    throw new Error("INVALID_CLOUDFRONT_PRIVATE_KEY_FORMAT");
  }

  const encodedKey = match[1].replace(/\s/g, "");

  const pemKey =
    "-----BEGIN PRIVATE KEY-----\n" +
    encodedKey.match(/.{1,64}/g).join("\n") +
    "\n-----END PRIVATE KEY-----\n";

  try {
    crypto.createPrivateKey(pemKey);
  } catch {
    throw new Error("CLOUDFRONT_PRIVATE_KEY_DECODING_FAILED");
  }

  return pemKey;
}
async function generateCloudFrontBookUrl(objectKey) {
  if (!CLOUDFRONT_BOOKS_DOMAIN || !CLOUDFRONT_PUBLIC_KEY_ID) {
    throw new Error("CLOUDFRONT_SIGNING_NOT_CONFIGURED");
  }

  const privateKey = await getCloudFrontPrivateKey();

  const expiresIn = 300;
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

  const encodedKey = objectKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  const resourceUrl =
    `${CLOUDFRONT_BOOKS_DOMAIN.replace(/\/$/, "")}/${encodedKey}`;

  const policy = JSON.stringify({
    Statement: [
      {
        Resource: resourceUrl,
        Condition: {
          DateLessThan: {
            "AWS:EpochTime": expiresAt,
          },
        },
      },
    ],
  });

  const signature = crypto.sign(
    "RSA-SHA1",
    Buffer.from(policy),
    privateKey
  );

  const cloudFrontBase64 = (value) =>
    Buffer.from(value)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/=/g, "_")
      .replace(/\//g, "~");

  const separator = resourceUrl.includes("?") ? "&" : "?";

  return {
    readUrl:
      `${resourceUrl}${separator}` +
      `Policy=${cloudFrontBase64(policy)}` +
      `&Signature=${cloudFrontBase64(signature)}` +
      `&Key-Pair-Id=${encodeURIComponent(CLOUDFRONT_PUBLIC_KEY_ID)}`,
    expiresIn,
  };
}

supertokens.init({
  framework: "awsLambda",
  supertokens: {
    connectionURI:
  process.env.SUPERTOKENS_CONNECTION_URI || "http://172.31.27.14:3567",
  },
  appInfo: {
    appName: "ScholarsKnowledge",
    apiDomain: "https://gkqrobez5e.execute-api.us-east-1.amazonaws.com",
    websiteDomain: "http://localhost:5176",
    apiBasePath: "/api/auth-st",
  },
  recipeList: [
    Session.init({
      antiCsrf: "VIA_CUSTOM_HEADER",
    }),
  ],
});

// Read a bounded byte range from an academic book stored in S3.
async function readAcademicBookRange(objectKey, start, length) {
  const MAX_RANGE_BYTES = 128 * 1024;

  if (
    !Number.isSafeInteger(start) ||
    start < 0 ||
    !Number.isSafeInteger(length) ||
    length < 1 ||
    length > MAX_RANGE_BYTES ||
    !Number.isSafeInteger(start + length - 1)
  ) {
    throw new Error("INVALID_ACADEMIC_BOOK_RANGE");
  }

  const response = await s3.send(
    new GetObjectCommand({
      Bucket: BOOKS_BUCKET,
      Key: objectKey,
      Range: `bytes=${start}-${start + length - 1}`,
    })
  );

  if (response.$metadata?.httpStatusCode !== 206) {
    response.Body?.destroy?.();
    throw new Error("ACADEMIC_BOOK_RANGE_NOT_HONORED");
  }

  const bytes = Buffer.from(
    await response.Body.transformToByteArray()
  );

  if (bytes.length !== length) {
    throw new Error("INVALID_ACADEMIC_BOOK_RANGE_LENGTH");
  }

  return bytes;
}

// Read the ZIP end-of-central-directory search region.
async function readAcademicBookZipTail(objectKey, objectSize) {
  const MAX_ZIP_TAIL_BYTES = 65557;

  if (
    !Number.isSafeInteger(objectSize) ||
    objectSize < 22
  ) {
    throw new Error("INVALID_ACADEMIC_BOOK_ZIP_SIZE");
  }

  const length = Math.min(objectSize, MAX_ZIP_TAIL_BYTES);
  const start = objectSize - length;

  return {
    start,
    bytes: await readAcademicBookRange(
      objectKey,
      start,
      length
    ),
  };
}

// Locate and validate a standard ZIP End of Central Directory record.
function parseAcademicBookZipEocd(tail, objectSize) {
  const { start, bytes } = tail;

  if (
    !Number.isSafeInteger(objectSize) ||
    !Number.isSafeInteger(start) ||
    start < 0 ||
    start + bytes.length !== objectSize
  ) {
    throw new Error("INVALID_PPTX_ZIP_TAIL");
  }

  for (let i = bytes.length - 22; i >= 0; i--) {
    if (
      bytes.readUInt32LE(i) !== 0x06054b50
    ) {
      continue;
    }

    const commentLength = bytes.readUInt16LE(i + 20);

    // The EOCD record must end at the end of the ZIP file.
    if (i + 22 + commentLength !== bytes.length) {
      continue;
    }

    const diskNumber = bytes.readUInt16LE(i + 4);
    const centralDirectoryDisk = bytes.readUInt16LE(i + 6);
    const entriesOnDisk = bytes.readUInt16LE(i + 8);
    const totalEntries = bytes.readUInt16LE(i + 10);
    const directorySize = bytes.readUInt32LE(i + 12);
    const directoryOffset = bytes.readUInt32LE(i + 16);

    // Reject multi-disk archives and ZIP64 sentinel values.
    if (
      diskNumber !== 0 ||
      centralDirectoryDisk !== 0 ||
      entriesOnDisk !== totalEntries ||
      totalEntries === 0 ||
      totalEntries === 0xffff ||
      directorySize === 0xffffffff ||
      directoryOffset === 0xffffffff
    ) {
      throw new Error("UNSUPPORTED_PPTX_ZIP_STRUCTURE");
    }


    // Bound the amount of ZIP metadata we will inspect.
    const MAX_DIRECTORY_BYTES = 128 * 1024;
    const MAX_ZIP_ENTRIES = 2048;

    if (
      directorySize > MAX_DIRECTORY_BYTES ||
      totalEntries > MAX_ZIP_ENTRIES
    ) {
      throw new Error("PPTX_ZIP_METADATA_LIMIT_EXCEEDED");
    }

    const eocdOffset = start + i;

    // Standard ZIP archives place the central directory before EOCD.
    if (
      directorySize === 0 ||
      directoryOffset + directorySize !== eocdOffset
    ) {
      throw new Error("INVALID_PPTX_CENTRAL_DIRECTORY");
    }

    return {
      directoryOffset,
      directorySize,
      totalEntries,
    };
  }

  throw new Error("PPTX_ZIP_END_NOT_FOUND");
}

// Read the PPTX ZIP central directory without decompressing entries.
async function readAcademicBookZipDirectory(
  objectKey,
  objectSize
) {
  const tail = await readAcademicBookZipTail(
    objectKey,
    objectSize
  );

  const directory = parseAcademicBookZipEocd(
    tail,
    objectSize
  );

  const bytes = await readAcademicBookRange(
    objectKey,
    directory.directoryOffset,
    directory.directorySize
  );

  return {
    bytes,
    totalEntries: directory.totalEntries,
    directoryOffset: directory.directoryOffset,
  };
}

export const handler = async (event) => {
  const method =
    event.requestContext?.http?.method ||
    event.httpMethod ||
    "GET";

  const path =
    event.rawPath ||
    event.path ||
    "/";

  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };

  if (method === "GET" && path.endsWith("/health")) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        service: "AcademicBooksHandler",
        tableConfigured: Boolean(BOOKS_TABLE),
      }),
    };
  }

  // Read-only DynamoDB connectivity check
  if (method === "GET" && path.endsWith("/db-check")) {
    try {
      if (!BOOKS_TABLE) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            ok: false,
            error: "BOOKS_TABLE_NOT_CONFIGURED",
          }),
        };
      }

      const result = await ddb.send(
        new DescribeTableCommand({
          TableName: BOOKS_TABLE,
        })
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          table: result.Table?.TableName,
          status: result.Table?.TableStatus,
        }),
      };
    } catch (error) {
      console.error("DynamoDB connectivity check failed:", error);

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          ok: false,
          error: error.name || "DYNAMODB_CHECK_FAILED",
        }),
      };
    }
  }
  // --------------------------------------------------
  // GET /books — Public academic books feed
  // --------------------------------------------------
  if (
    method === "GET" &&
    (path === "/books" || path.endsWith("/books"))
  ) {
    try {
      if (!BOOKS_TABLE) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            ok: false,
            error: "BOOKS_TABLE_NOT_CONFIGURED",
          }),
        };
      }

      const qs = event.queryStringParameters || {};

      // Optional academic discipline and subcategory filters.
      const subject = String(qs.subject || "").trim();
      const subcategory = String(qs.subcategory || "").trim();

      const requestedLimit = Number(qs.limit);
      const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(Math.floor(requestedLimit), 50)
        : 20;

      let exclusiveStartKey;

      if (qs.cursor) {
        try {
          const decoded = JSON.parse(
            Buffer.from(
              String(qs.cursor),
              "base64url"
            ).toString("utf8")
          );

          if (
            !decoded ||
            typeof decoded !== "object" ||
            Array.isArray(decoded)
          ) {
            throw new Error("Invalid cursor");
          }

          exclusiveStartKey = decoded;
        } catch {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              ok: false,
              error: "INVALID_CURSOR",
            }),
          };
        }
      }

      // Build optional academic book filters.
      const filterParts = [];
      const filterNames = {};
      const filterValues = {};

      if (subject && subject !== "All") {
        filterParts.push("#subject = :subject");
        filterNames["#subject"] = "subject";
        filterValues[":subject"] = { S: subject };
      }

      if (subcategory && subcategory !== "All") {
        filterParts.push("#subcategory = :subcategory");
        filterNames["#subcategory"] = "subcategory";
        filterValues[":subcategory"] = { S: subcategory };
      }
      // Allow bounded continuation through empty filtered pages.
      const hasBookFilters = filterParts.length > 0;
      const maxQueryPages = hasBookFilters ? 5 : 1;

      let queryPageCount = 0;
      let result;

      do {
        result = await ddb.send(
          new QueryCommand({
            TableName: BOOKS_TABLE,
            IndexName: "gsi1",

            KeyConditionExpression: "#gpk = :gpk",

            ExpressionAttributeNames: {
              "#gpk": "gsi1pk",
              ...filterNames,
            },

            ExpressionAttributeValues: {
              ":gpk": { S: "BOOKS" },
              ...filterValues,
            },

            ...(hasBookFilters
              ? { FilterExpression: filterParts.join(" AND ") }
              : {}),

            ScanIndexForward: false,
            Limit: limit,

            ...(exclusiveStartKey
              ? { ExclusiveStartKey: exclusiveStartKey }
              : {}),
          })
        );

        queryPageCount += 1;

        // Stop when matching books are found or no more pages exist.
        if ((result.Items || []).length > 0 || !result.LastEvaluatedKey) {
          break;
        }

        // Continue from the last evaluated item.
        exclusiveStartKey = result.LastEvaluatedKey;
      } while (queryPageCount < maxQueryPages);

      const books = await Promise.all(
        (result.Items || []).map(async (item) => {
          const output = {};

        for (const [key, value] of Object.entries(item)) {
          if (value.S !== undefined) {
            output[key] = value.S;
          } else if (value.N !== undefined) {
            output[key] = Number(value.N);
          } else if (value.BOOL !== undefined) {
            output[key] = value.BOOL;
          } else if (value.NULL === true) {
            output[key] = null;
          } else if (value.L !== undefined || value.M !== undefined) {
            // Preserve nested DynamoDB values for later
            // attachment and metadata support.
            output[key] = value;
          }
        }

        if (output.coverKey) {
          output.coverUrl = await getSignedUrl(
            s3,
            new GetObjectCommand({
              Bucket: BOOKS_BUCKET,
              Key: output.coverKey,
            }),
            { expiresIn: 3600 }
          );
        }

        return output;
        })
      );

      const nextCursor = result.LastEvaluatedKey
        ? Buffer.from(
            JSON.stringify(result.LastEvaluatedKey),
            "utf8"
          ).toString("base64url")
        : null;

      return {
  statusCode: 200,
  headers: {
    ...headers,
    "Cache-Control": "public, max-age=60, s-maxage=300",
  },
  body: JSON.stringify({
    ok: true,
    books,
    cursor: nextCursor,
  }),
};

    } catch (error) {
      console.error("Academic books feed failed:", error);

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "BOOKS_FEED_FAILED",
        }),
      };
    }
  }

   // --------------------------------------------------
  // GET /books/my-shared — Books published by current user
  // --------------------------------------------------
  if (method === "GET" && path.endsWith("/books/my-shared")) {
    try {
      // 1. Verify the existing ScholarsKnowledge session.
      const request = wrapRequest(event);
      const response = wrapResponse({});

      let session;

      try {
        session = await Session.getSession(request, response, {
          sessionRequired: true,
        });
      } catch {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            ok: false,
            error: "UNAUTHORIZED",
          }),
        };
      }

      // 2. Enforce seven-day absolute session expiration.
      const sessionData = await session.getSessionDataFromDatabase();
      const absoluteExpiresAt = sessionData?.absoluteExpiresAt;

      if (
        !Number.isSafeInteger(absoluteExpiresAt) ||
        absoluteExpiresAt <= Date.now()
      ) {
        await session.revokeSession();

        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            ok: false,
            error: "SESSION_EXPIRED",
          }),
        };
      }

      // 3. Identify the authenticated publisher.
      const uploaderId = session.getUserId();

      if (!BOOKS_TABLE || !BOOKS_BUCKET) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            ok: false,
            error: "BOOKS_CONFIGURATION_MISSING",
          }),
        };
      }

      // 4. Validate pagination parameters.
      const qs = event.queryStringParameters || {};
      // Optional academic discipline and subcategory filters.
      const subject = String(qs.subject || "").trim();
      const subcategory = String(qs.subcategory || "").trim();
      const requestedLimit = Number(qs.limit);

      const limit =
        Number.isFinite(requestedLimit) && requestedLimit > 0
          ? Math.min(Math.floor(requestedLimit), 50)
          : 20;

      let exclusiveStartKey;

      if (qs.cursor) {
        try {
          const decoded = JSON.parse(
            Buffer.from(String(qs.cursor), "base64url").toString("utf8")
          );

          if (
            !decoded ||
            typeof decoded !== "object" ||
            Array.isArray(decoded)
          ) {
            throw new Error("Invalid cursor");
          }

          exclusiveStartKey = decoded;
        } catch {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              ok: false,
              error: "INVALID_CURSOR",
            }),
          };
        }
      }

      // 5. Query only books published by this user.
      const result = await ddb.send(
        new QueryCommand({
          TableName: BOOKS_TABLE,
          IndexName: "gsi2",

          KeyConditionExpression: "#gpk = :gpk",

          ExpressionAttributeNames: {
            "#gpk": "gsi2pk",
          },

          ExpressionAttributeValues: {
            ":gpk": { S: `USER#${uploaderId}` },
          },

          ScanIndexForward: false,
          Limit: limit,

          ...(exclusiveStartKey
            ? { ExclusiveStartKey: exclusiveStartKey }
            : {}),
        })
      );

      // 6. Convert DynamoDB items and generate cover URLs.
      const books = await Promise.all(
        (result.Items || []).map(async (item) => {
          const output = {};

          for (const [key, value] of Object.entries(item)) {
            if (value.S !== undefined) {
              output[key] = value.S;
            } else if (value.N !== undefined) {
              output[key] = Number(value.N);
            } else if (value.BOOL !== undefined) {
              output[key] = value.BOOL;
            } else if (value.NULL === true) {
              output[key] = null;
            } else if (value.L !== undefined || value.M !== undefined) {
              output[key] = value;
            }
          }

          if (output.coverKey) {
            output.coverUrl = await getSignedUrl(
              s3,
              new GetObjectCommand({
                Bucket: BOOKS_BUCKET,
                Key: output.coverKey,
              }),
              { expiresIn: 3600 }
            );
          }

          return output;
        })
      );

      // 7. Return the next pagination cursor.
      const nextCursor = result.LastEvaluatedKey
        ? Buffer.from(
            JSON.stringify(result.LastEvaluatedKey),
            "utf8"
          ).toString("base64url")
        : null;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          books,
          cursor: nextCursor,
        }),
      };
    } catch (error) {
      console.error("My Shared Books retrieval failed:", error);

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "MY_SHARED_BOOKS_FAILED",
        }),
      };
    }
  }

  // --------------------------------------------------
// GET /books/saved — Books saved by the current user
// --------------------------------------------------
if (method === "GET" && path.endsWith("/books/saved")) {
  try {
    // 1. Authenticate the current user.
    const request = wrapRequest(event);
    const response = wrapResponse({});

    let session;

    try {
      session = await Session.getSession(request, response, {
        sessionRequired: true,
      });
    } catch {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "UNAUTHORIZED",
        }),
      };
    }

    // 2. Enforce seven-day absolute session expiration.
    const sessionData = await session.getSessionDataFromDatabase();
    const absoluteExpiresAt = sessionData?.absoluteExpiresAt;

    if (
      !Number.isSafeInteger(absoluteExpiresAt) ||
      absoluteExpiresAt <= Date.now()
    ) {
      await session.revokeSession();

      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "SESSION_EXPIRED",
        }),
      };
    }

    if (!BOOKS_TABLE || !BOOKS_BUCKET) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "BOOKS_CONFIGURATION_MISSING",
        }),
      };
    }

    const userId = session.getUserId();

    // 3. Validate pagination parameters.
    const qs = event.queryStringParameters || {};
    const requestedLimit = Number(qs.limit);

    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(Math.floor(requestedLimit), 50)
        : 20;

    let exclusiveStartKey;

    if (qs.cursor) {
      try {
        const decoded = JSON.parse(
          Buffer.from(
            String(qs.cursor),
            "base64url"
          ).toString("utf8")
        );

        if (
          !decoded ||
          typeof decoded !== "object" ||
          Array.isArray(decoded) ||
          decoded.pk?.S !== `USER#${userId}` ||
          typeof decoded.sk?.S !== "string" ||
          !decoded.sk.S.startsWith("SAVEDBOOK#")
        ) {
          throw new Error("Invalid cursor");
        }

        exclusiveStartKey = decoded;
      } catch {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            ok: false,
            error: "INVALID_CURSOR",
          }),
        };
      }
    }

    // 4. Query this user's saved-book references.
    const result = await ddb.send(
      new QueryCommand({
        TableName: BOOKS_TABLE,

        KeyConditionExpression:
          "#pk = :pk AND begins_with(#sk, :prefix)",

        ExpressionAttributeNames: {
          "#pk": "pk",
          "#sk": "sk",
        },

        ExpressionAttributeValues: {
          ":pk": { S: `USER#${userId}` },
          ":prefix": { S: "SAVEDBOOK#" },
        },

        Limit: limit,

        ...(exclusiveStartKey
          ? { ExclusiveStartKey: exclusiveStartKey }
          : {}),
      })
    );

    // 5. Retrieve original book metadata.
    const books = await Promise.all(
      (result.Items || []).map(async (savedItem) => {
        const bookId = savedItem.bookId?.S;

        if (!bookId) return null;

        const bookResult = await ddb.send(
          new GetItemCommand({
            TableName: BOOKS_TABLE,
            Key: {
              pk: { S: `BOOK#${bookId}` },
              sk: { S: "METADATA" },
            },
          })
        );

        if (!bookResult.Item) return null;

        const output = {};

        for (const [key, value] of Object.entries(
          bookResult.Item
        )) {
          if (value.S !== undefined) {
            output[key] = value.S;
          } else if (value.N !== undefined) {
            output[key] = Number(value.N);
          } else if (value.BOOL !== undefined) {
            output[key] = value.BOOL;
          } else if (value.NULL === true) {
            output[key] = null;
          } else if (
            value.L !== undefined ||
            value.M !== undefined
          ) {
            output[key] = value;
          }
        }

        if (output.coverKey) {
          output.coverUrl = await getSignedUrl(
            s3,
            new GetObjectCommand({
              Bucket: BOOKS_BUCKET,
              Key: output.coverKey,
            }),
            { expiresIn: 3600 }
          );
        }

        output.savedAt = savedItem.savedAt?.S || null;

        return output;
      })
    );

    // 6. Return the next pagination cursor.
    const nextCursor = result.LastEvaluatedKey
      ? Buffer.from(
          JSON.stringify(result.LastEvaluatedKey),
          "utf8"
        ).toString("base64url")
      : null;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        books: books.filter(Boolean),
        cursor: nextCursor,
      }),
    };
  } catch (error) {
    console.error("Saved Books retrieval failed:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: "SAVED_BOOKS_FAILED",
      }),
    };
  }
}
  // --------------------------------------------------
// POST /books/{bookId}/save — Save an academic book
// --------------------------------------------------
if (
  method === "POST" &&
  /^\/books\/[^/]+\/save$/.test(path)
) {
  try {
    const bookId = path.split("/")[2];

    // 1. Validate the book ID.
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(bookId)
    ) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "INVALID_BOOK_ID",
        }),
      };
    }

    // 2. Authenticate the current user.
    const request = wrapRequest(event);
    const response = wrapResponse({});

    let session;

    try {
      session = await Session.getSession(request, response, {
        sessionRequired: true,
      });
    } catch {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "UNAUTHORIZED",
        }),
      };
    }

    // 3. Enforce seven-day absolute session expiration.
    const sessionData = await session.getSessionDataFromDatabase();
    const absoluteExpiresAt = sessionData?.absoluteExpiresAt;

    if (
      !Number.isSafeInteger(absoluteExpiresAt) ||
      absoluteExpiresAt <= Date.now()
    ) {
      await session.revokeSession();

      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "SESSION_EXPIRED",
        }),
      };
    }

    const userId = session.getUserId();

    if (!BOOKS_TABLE) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "BOOKS_TABLE_NOT_CONFIGURED",
        }),
      };
    }

    // 4. Confirm the book exists.
    const existingBook = await ddb.send(
      new GetItemCommand({
        TableName: BOOKS_TABLE,
        Key: {
          pk: { S: `BOOK#${bookId}` },
          sk: { S: "METADATA" },
        },
      })
    );

    if (!existingBook.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "BOOK_NOT_FOUND",
        }),
      };
    }

    // 5. Save the relationship, not another PDF copy.
    await ddb.send(
      new PutItemCommand({
        TableName: BOOKS_TABLE,
        Item: {
          pk: { S: `USER#${userId}` },
          sk: { S: `SAVEDBOOK#${bookId}` },
          bookId: { S: bookId },
          savedAt: { S: new Date().toISOString() },
        },
      })
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        bookId,
        saved: true,
      }),
    };
  } catch (error) {
    console.error("Save academic book failed:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: "SAVE_BOOK_FAILED",
      }),
    };
  }
}

// --------------------------------------------------
// DELETE /books/{bookId}/save — Unsave an academic book
// --------------------------------------------------
if (
  method === "DELETE" &&
  /^\/books\/[^/]+\/save$/.test(path)
) {
  try {
    const bookId = path.split("/")[2];

    // 1. Validate the book ID.
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(bookId)
    ) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "INVALID_BOOK_ID",
        }),
      };
    }

    // 2. Verify the authenticated session.
    const request = wrapRequest(event);
    const response = wrapResponse({});

    let session;

    try {
      session = await Session.getSession(request, response, {
        sessionRequired: true,
      });
    } catch {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "UNAUTHORIZED",
        }),
      };
    }

    // 3. Enforce seven-day absolute session expiration.
    const sessionData = await session.getSessionDataFromDatabase();
    const absoluteExpiresAt = sessionData?.absoluteExpiresAt;

    if (
      !Number.isSafeInteger(absoluteExpiresAt) ||
      absoluteExpiresAt <= Date.now()
    ) {
      await session.revokeSession();

      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "SESSION_EXPIRED",
        }),
      };
    }

    if (!BOOKS_TABLE) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "BOOKS_TABLE_NOT_CONFIGURED",
        }),
      };
    }

    // 4. Delete only this user's saved-book relationship.
    const userId = session.getUserId();

    await ddb.send(
      new DeleteItemCommand({
        TableName: BOOKS_TABLE,
        Key: {
          pk: { S: `USER#${userId}` },
          sk: { S: `SAVEDBOOK#${bookId}` },
        },
      })
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        bookId,
        saved: false,
      }),
    };
  } catch (error) {
    console.error("Unsave academic book failed:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: "UNSAVE_BOOK_FAILED",
      }),
    };
  }
}


  // --------------------------------------------------
// GET /books/{bookId}/read-url — Secure PDF reading URL
// --------------------------------------------------
if (method === "GET" && /^\/books\/[^/]+\/read-url$/.test(path)) {
  try {
    const bookId = path.split("/")[2];

    // 1. Validate the requested book ID.
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(bookId)
    ) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "INVALID_BOOK_ID",
        }),
      };
    }

    // 2. Verify the existing ScholarsKnowledge session.
    const request = wrapRequest(event);
    const response = wrapResponse({});

    let session;

    try {
      session = await Session.getSession(request, response, {
        sessionRequired: true,
      });
    } catch (error) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "UNAUTHORIZED",
        }),
      };
    }

    // 3. Enforce the seven-day absolute session lifetime.
    const sessionData = await session.getSessionDataFromDatabase();
    const absoluteExpiresAt = sessionData?.absoluteExpiresAt;

    if (
      !Number.isSafeInteger(absoluteExpiresAt) ||
      absoluteExpiresAt <= Date.now()
    ) {
      await session.revokeSession();

      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "SESSION_EXPIRED",
        }),
      };
    }

    // 4. Retrieve the published book from DynamoDB.
    if (!BOOKS_TABLE || !BOOKS_BUCKET) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "BOOKS_CONFIGURATION_MISSING",
        }),
      };
    }

    const result = await ddb.send(
      new GetItemCommand({
        TableName: BOOKS_TABLE,
        Key: {
          pk: { S: `BOOK#${bookId}` },
          sk: { S: "METADATA" },
        },
        ConsistentRead: true,
      })
    );

    if (!result.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "BOOK_NOT_FOUND",
        }),
      };
    }

    // 5. Use the stored book key, never a client-supplied S3 key.
const objectKey = result.Item.objectKey?.S;
const uploaderId = result.Item.uploaderId?.S;

const allowedContentTypes = {
  pdf: "application/pdf",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

const extension = String(objectKey || "")
  .toLowerCase()
  .split(".")
  .pop();

const expectedContentType = allowedContentTypes[extension];

const expectedKey =
  uploaderId && expectedContentType
    ? `books/${Buffer.from(uploaderId).toString("hex")}/${bookId}.${extension}`
    : null;

if (!objectKey || !expectedKey || objectKey !== expectedKey) {
  return {
    statusCode: 500,
    headers,
    body: JSON.stringify({
      ok: false,
      error: "INVALID_BOOK_STORAGE_KEY",
    }),
  };
}

// Verify the stored content type when present.
// Existing PDF records remain compatible.
const storedContentType = result.Item.contentType?.S;

if (
  storedContentType &&
  storedContentType !== expectedContentType
) {
  return {
    statusCode: 500,
    headers,
    body: JSON.stringify({
      ok: false,
      error: "INVALID_BOOK_CONTENT_TYPE",
    }),
  };
}

// 6. Generate a temporary, read-only file URL.
// PDFs open in the reader; PowerPoint files download.
/*const readUrl = await getSignedUrl(
  s3,
  new GetObjectCommand({
    Bucket: BOOKS_BUCKET,
    Key: objectKey,
    ResponseContentType: expectedContentType,
    ResponseContentDisposition:
      extension === "pdf"
        ? "inline"
        : `attachment; filename="${bookId}.${extension}"`,
  }),
  { expiresIn: 300 }
);*/
// 6. Generate a temporary CloudFront signed URL.
// Existing authentication and book-access checks remain unchanged.
const { readUrl, expiresIn } =
  await generateCloudFrontBookUrl(objectKey);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        bookId,
        readUrl,
        /*expiresIn: 300,*/
        expiresIn,
      }),
    };
  } catch (error) {
    console.error("Academic book reading URL failed:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: "BOOK_READ_URL_FAILED",
      }),
    };
  }
}

   // --------------------------------------------------
  // POST /books — Publish academic book metadata
  // --------------------------------------------------
  if (method === "POST" && path.endsWith("/books")) {
    try {
      // 1. Verify the existing ScholarsKnowledge session.
      const request = wrapRequest(event);
      const response = wrapResponse({});

      let session;

      try {
        session = await Session.getSession(request, response, {
          sessionRequired: true,
        });
      } catch (error) {
        console.error("Book publication authentication failed:", error);

        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            ok: false,
            error: "UNAUTHORIZED",
          }),
        };
      }

      // 2. Enforce the seven-day absolute session lifetime.
      const sessionData = await session.getSessionDataFromDatabase();
      const absoluteExpiresAt = sessionData?.absoluteExpiresAt;

      if (
        !Number.isSafeInteger(absoluteExpiresAt) ||
        absoluteExpiresAt <= Date.now()
      ) {
        await session.revokeSession();

        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            ok: false,
            error: "SESSION_EXPIRED",
          }),
        };
      }

      const uploaderId = session.getUserId();

      // 3. Validate book metadata.
      let body;

      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            ok: false,
            error: "INVALID_JSON",
          }),
        };
      }

      const title = String(body.title || "").trim();
      const author = String(body.author || "").trim();
      const subject = String(body.subject || "").trim();
      const subcategory = String(body.subcategory || "").trim();
      const description = String(body.description || "").trim();
      const bookId = String(body.bookId || "").trim();
      const objectKey = String(body.objectKey || "").trim();
      const coverKey = String(body.coverKey || "").trim();

      if (
        !title ||
        !author ||
        !subject ||
        !bookId ||
        !objectKey ||
        title.length > 300 ||
        author.length > 200 ||
        subject.length > 150 ||
        subcategory.length > 150 ||
        description.length > 5000
      ) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            ok: false,
            error: "INVALID_BOOK_METADATA",
          }),
        };
      }

      // 4. Verify the S3 key belongs to this user.
const userKey = Buffer.from(uploaderId).toString("hex");

const allowedContentTypes = {
  pdf: "application/pdf",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

const extension = objectKey.toLowerCase().split(".").pop();
const expectedContentType = allowedContentTypes[extension];

const expectedObjectKey =
  `books/${userKey}/${bookId}.${extension}`;

if (
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(bookId) ||
  !expectedContentType ||
  objectKey !== expectedObjectKey
) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({
            ok: false,
            error: "INVALID_BOOK_OWNERSHIP",
          }),
        };
      }

      // Validate the optional JPEG cover key.
// It must belong to the authenticated uploader and book.
if (coverKey && coverKey !== `books/${userKey}/${bookId}-cover.jpg`) {
  return {
    statusCode: 403,
    headers,
    body: JSON.stringify({
      ok: false,
      error: "INVALID_COVER_OWNERSHIP",
    }),
  };
}

      // 5. Confirm that the PDF exists in S3.
      let objectInfo;

      try {
        objectInfo = await s3.send(
          new HeadObjectCommand({
            Bucket: BOOKS_BUCKET,
            Key: objectKey,
          })
        );
      } catch (error) {
        if (
          error.name === "NotFound" ||
          error.name === "NoSuchKey"
        ) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              ok: false,
              error: "PDF_NOT_UPLOADED",
            }),
          };
        }

        throw error;
      }

      const actualSize = Number(objectInfo.ContentLength);

if (
  !Number.isSafeInteger(actualSize) ||
  actualSize <= 0 ||
  actualSize > 50 * 1024 * 1024 ||
  objectInfo.ContentType !== expectedContentType
) {
  return {
    statusCode: 400,
    headers,
    body: JSON.stringify({
      ok: false,
      error: "INVALID_ACADEMIC_BOOK_OBJECT",
    }),
  };
}
      // 6. Verify the uploaded file signature by format.
const fileStart = await s3.send(
  new GetObjectCommand({
    Bucket: BOOKS_BUCKET,
    Key: objectKey,
    Range: "bytes=0-7",
  })
);

const signatureBytes = Buffer.from(
  await fileStart.Body.transformToByteArray()
);

let validSignature = false;

if (extension === "pdf") {
  validSignature =
    signatureBytes.subarray(0, 5).toString("ascii") === "%PDF-";
}

if (extension === "ppt") {
  // Microsoft Office legacy Compound File Binary Format.
  const pptSignature = Buffer.from([
    0xd0, 0xcf, 0x11, 0xe0,
    0xa1, 0xb1, 0x1a, 0xe1,
  ]);

  validSignature =
    signatureBytes.length >= 8 &&
    signatureBytes.subarray(0, 8).equals(pptSignature);
}

if (extension === "pptx") {
  // Office Open XML presentations use a ZIP container.
  validSignature =
    signatureBytes.length >= 4 &&
    signatureBytes[0] === 0x50 &&
    signatureBytes[1] === 0x4b &&
    signatureBytes[2] === 0x03 &&
    signatureBytes[3] === 0x04;
}

if (!validSignature) {
  return {
    statusCode: 400,
    headers,
    body: JSON.stringify({
      ok: false,
      error: "INVALID_ACADEMIC_BOOK_SIGNATURE",
    }),
  };
}

      // Verify the optional JPEG cover before publication.
if (coverKey) {
  let coverInfo;

  try {
    coverInfo = await s3.send(
      new HeadObjectCommand({
        Bucket: BOOKS_BUCKET,
        Key: coverKey,
      })
    );
  } catch (error) {
    if (
      error.name === "NotFound" ||
      error.name === "NoSuchKey"
    ) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "COVER_NOT_UPLOADED",
        }),
      };
    }

    throw error;
  }

  const coverSize = Number(coverInfo.ContentLength);

  if (
    !Number.isSafeInteger(coverSize) ||
    coverSize <= 0 ||
    coverSize > 1024 * 1024 ||
    coverInfo.ContentType !== "image/jpeg"
  ) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        ok: false,
        error: "INVALID_COVER_OBJECT",
      }),
    };
  }

  // Verify the JPEG file signature.
  const coverStart = await s3.send(
    new GetObjectCommand({
      Bucket: BOOKS_BUCKET,
      Key: coverKey,
      Range: "bytes=0-2",
    })
  );

  const coverSignature = Buffer.from(
    await coverStart.Body.transformToByteArray()
  );

  if (
    coverSignature.length !== 3 ||
    coverSignature[0] !== 0xff ||
    coverSignature[1] !== 0xd8 ||
    coverSignature[2] !== 0xff
  ) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        ok: false,
        error: "INVALID_COVER_SIGNATURE",
      }),
    };
  }
}

      // 7. Save metadata in ScholarsAcademicBooks.
      if (!BOOKS_TABLE || !BOOKS_BUCKET) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            ok: false,
            error: "BOOKS_CONFIGURATION_MISSING",
          }),
        };
      }

      const createdAt = new Date().toISOString();

      await ddb.send(
        new PutItemCommand({
          TableName: BOOKS_TABLE,
          Item: {
            pk: { S: `BOOK#${bookId}` },
            sk: { S: "METADATA" },

            gsi1pk: { S: "BOOKS" },
            gsi1sk: { S: `${createdAt}#${bookId}` },
            // Index for retrieving books shared by a specific user.
            gsi2pk: { S: `USER#${uploaderId}` },
            gsi2sk: { S: `${createdAt}#${bookId}` },

            bookId: { S: bookId },
            title: { S: title },
            author: { S: author },
            subject: { S: subject },
            ...(subcategory ? { subcategory: { S: subcategory } } : {}),
            description: { S: description },

            uploaderId: { S: uploaderId },
objectKey: { S: objectKey },

// Save the cover reference only when a cover was uploaded.
...(coverKey ? { coverKey: { S: coverKey } } : {}),

fileSize: { N: String(actualSize) },
contentType: { S: expectedContentType },
createdAt: { S: createdAt },
          },

          ConditionExpression:
            "attribute_not_exists(pk) AND attribute_not_exists(sk)",
        })
      );

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          ok: true,
          bookId,
          message: "BOOK_PUBLISHED",
        }),
      };

    } catch (error) {
      console.error("Academic book publication failed:", error);

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "BOOK_PUBLICATION_FAILED",
        }),
      };
    }
  }

  // --------------------------------------------------
  // POST /books/cover-upload-url — Generate JPEG cover upload URL
  // --------------------------------------------------
  if (method === "POST" && path.endsWith("/books/cover-upload-url")) {
    try {
      // 1. Verify the existing ScholarsKnowledge session.
      const request = wrapRequest(event);
      const response = wrapResponse({});

      let session;

      try {
        session = await Session.getSession(request, response, {
          sessionRequired: true,
        });
      } catch (error) {
        console.error("Book cover authentication failed:", error);

        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            ok: false,
            error: "UNAUTHORIZED",
          }),
        };
      }

      // 2. Enforce the seven-day absolute session lifetime.
      const sessionData = await session.getSessionDataFromDatabase();
      const absoluteExpiresAt = sessionData?.absoluteExpiresAt;

      if (
        !Number.isSafeInteger(absoluteExpiresAt) ||
        absoluteExpiresAt <= Date.now()
      ) {
        await session.revokeSession();

        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            ok: false,
            error: "SESSION_EXPIRED",
          }),
        };
      }

      // 3. Validate the request.
      let body;

      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            ok: false,
            error: "INVALID_JSON",
          }),
        };
      }

      const bookId = String(body.bookId || "").trim();
      const fileSize = Number(body.fileSize);
      const contentType = String(body.contentType || "");

      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(bookId) ||
        contentType !== "image/jpeg" ||
        !Number.isSafeInteger(fileSize) ||
        fileSize <= 0 ||
        fileSize > 1024 * 1024
      ) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            ok: false,
            error: "INVALID_COVER_FILE",
          }),
        };
      }

      if (!BOOKS_BUCKET) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            ok: false,
            error: "BOOKS_BUCKET_NOT_CONFIGURED",
          }),
        };
      }

      // 4. Verify the PDF exists under this user's prefix.
      const userKey = Buffer.from(session.getUserId()).toString("hex");
      const pdfKey = `books/${userKey}/${bookId}.pdf`;

      try {
        const pdfInfo = await s3.send(
          new HeadObjectCommand({
            Bucket: BOOKS_BUCKET,
            Key: pdfKey,
          })
        );

        if (pdfInfo.ContentType !== "application/pdf") {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              ok: false,
              error: "INVALID_PDF_OBJECT",
            }),
          };
        }
      } catch (error) {
        if (
          error.name === "NotFound" ||
          error.name === "NoSuchKey"
        ) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              ok: false,
              error: "PDF_NOT_UPLOADED",
            }),
          };
        }

        throw error;
      }

      // 5. Generate a short-lived JPEG cover upload URL.
const coverKey = `books/${userKey}/${bookId}-cover.jpg`;

const command = new PutObjectCommand({
  Bucket: BOOKS_BUCKET,
  Key: coverKey,
  ContentType: "image/jpeg",
  ContentLength: fileSize,
});

const uploadUrl = await getSignedUrl(s3, command, {
  expiresIn: 300,
});

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          bookId,
          coverKey,
          uploadUrl,
          expiresIn: 300,
        }),
      };
    } catch (error) {
      console.error("Academic book cover upload URL failed:", error);

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "COVER_UPLOAD_URL_FAILED",
        }),
      };
    }
  }

  // --------------------------------------------------
  // POST /books/upload-url — Generate PDF upload URL
  // --------------------------------------------------
  if (method === "POST" && path.endsWith("/books/upload-url")) {
    try {
  // Require a valid SuperTokens session before issuing an upload URL.
      const request = wrapRequest(event);
      const response = wrapResponse({});

      let session;

      try {
        session = await Session.getSession(request, response, {
          sessionRequired: true,
        });
      } catch (authError) {
        console.error("Academic books session verification failed:", authError);

        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            ok: false,
            error: "UNAUTHORIZED",
          }),
        };
      }

      // Enforce the same seven-day absolute session expiration
// used by AuthHandlerSuperTokensProd.
const sessionData = await session.getSessionDataFromDatabase();
const absoluteExpiresAt = sessionData?.absoluteExpiresAt;

if (
  !Number.isSafeInteger(absoluteExpiresAt) ||
  absoluteExpiresAt <= Date.now()
) {
  await session.revokeSession();

  return {
    statusCode: 401,
    headers,
    body: JSON.stringify({
      ok: false,
      error: "SESSION_EXPIRED",
    }),
  };
}

      const authenticatedUserId = session.getUserId();
      if (!BOOKS_BUCKET) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            ok: false,
            error: "BOOKS_BUCKET_NOT_CONFIGURED",
          }),
        };
      }

      const body = JSON.parse(event.body || "{}");

      const fileName = String(body.fileName || "");
      const contentType = String(body.contentType || "");
      const fileSize = Number(body.fileSize);

      const extension = fileName.toLowerCase().split(".").pop();

const allowedContentTypes = {
  pdf: "application/pdf",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

const expectedContentType = allowedContentTypes[extension];

const validFileType =
  Boolean(expectedContentType) &&
  contentType === expectedContentType;

      /*if (
        !fileName.toLowerCase().endsWith(".pdf") ||
        contentType !== "application/pdf" ||
        !Number.isFinite(fileSize) ||
        fileSize <= 0 ||
        fileSize > 50 * 1024 * 1024
      ) {*/
      if (
  !validFileType ||
  !Number.isSafeInteger(fileSize) ||
  fileSize <= 0 ||
  fileSize > 50 * 1024 * 1024
) {


        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            ok: false,
            error: "INVALID_ACADEMIC_BOOK_FILE",
          }),
        };
      }

      const bookId = crypto.randomUUID();

const userKey = Buffer.from(authenticatedUserId)
  .toString("hex");

const objectKey = `books/${userKey}/${bookId}.${extension}`;

const command = new PutObjectCommand({
  Bucket: BOOKS_BUCKET,
  Key: objectKey,
  ContentType: expectedContentType,
  ContentLength: fileSize,
  ContentDisposition:
    extension === "pdf"
      ? "inline"
      : `attachment; filename="${bookId}.${extension}"`,
});

      const uploadUrl = await getSignedUrl(s3, command, {
        expiresIn: 300,
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          bookId,
          objectKey,
          uploadUrl,
          expiresIn: 300,
        }),
      };
    } catch (error) {
      console.error("Academic book upload URL failed:", error);

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "UPLOAD_URL_FAILED",
        }),
      };
    }
  }

  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({
      ok: false,
      error: "NOT_FOUND",
    }),
  };
};