// SkVideosHandler - DynamoDB-backed videos API for ScholarsKnowledge
// Supports:
//   GET  /api/videos/latest        -> returns latest active video (global) (optionally filter by audience)
//   GET  /api/videos               -> list latest active videos (global)
//   POST /api/videos               -> create/update a video (admin)
//   POST /api/videos/activate      -> activate a video id (moves into ACTIVE feed)
//   POST /api/videos/deactivate    -> deactivate a video id (removes from ACTIVE feed)

import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";

const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
const TABLE = process.env.VIDEOS_TABLE;
const GSI = process.env.VIDEOS_GSI || "gsi1";

const ddb = new DynamoDBClient({ region: REGION });

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type,authorization",
      ...extraHeaders,
    },
    body: JSON.stringify(body ?? {}),
  };
}

function bad(msg, extra = {}) {
  return json(400, { ok: false, error: msg, ...extra });
}

function ok(body) {
  return json(200, { ok: true, ...body });
}

function nowMs() {
  return Date.now();
}

function str(v) {
  return v == null ? "" : String(v);
}

function normalizeAudience(aud) {
  const a = str(aud).toLowerCase().trim();
  if (a === "students" || a === "student") return "students";
  if (a === "lecturers" || a === "lecturer") return "lecturers";
  if (a === "both" || a === "all") return "both";
  return "students"; // safe default
}

function matchesAudience(itemAudience, requestAudience) {
  // requestAudience can be students/lecturers, if "both" return any active
  const req = normalizeAudience(requestAudience || "both");
  const it = normalizeAudience(itemAudience || "both");
  if (req === "both") return true;
  // students should see students + both
  if (req === "students") return it === "students" || it === "both";
  // lecturers should see lecturers + both
  if (req === "lecturers") return it === "lecturers" || it === "both";
  return true;
}

function parseBody(event) {
  if (!event?.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
}

function pathOf(event) {
  return str(event?.rawPath || event?.path || "");
}

function methodOf(event) {
  return str(event?.requestContext?.http?.method || event?.httpMethod || "").toUpperCase();
}

function q(event) {
  return event?.queryStringParameters || {};
}

// DynamoDB item schema
// pk: "VIDEO"
// sk: "VIDEO#<id>"
// gsi1pk: "VIDEOS#ACTIVE" (or "VIDEOS#INACTIVE")
// gsi1sk: createdAtMs (Number)
// attrs: id, title, videoUrlOrId, audience, active, createdAt, updatedAt
function videoKey(id) {
  return {
    pk: { S: "VIDEO" },
    sk: { S: `VIDEO#${id}` },
  };
}

function toItem(video) {
  const createdAt = Number(video.createdAt || nowMs());
  const updatedAt = Number(video.updatedAt || nowMs());
  const active = !!video.active;

  const audience = normalizeAudience(video.audience || "both");

  const item = {
    ...videoKey(video.id),
    id: { S: str(video.id) },
    title: { S: str(video.title || "") },
    videoUrlOrId: { S: str(video.videoUrlOrId || "") },
    audience: { S: audience },
    active: { BOOL: active },
    createdAt: { N: String(createdAt) },
    updatedAt: { N: String(updatedAt) },
  };

  // Put active items on the ACTIVE feed (GSI), inactive on INACTIVE feed
  item.gsi1pk = { S: active ? "VIDEOS#ACTIVE" : "VIDEOS#INACTIVE" };
  item.gsi1sk = { N: String(createdAt) };

  return item;
}

function fromItem(it) {
  if (!it) return null;
  return {
    id: it.id?.S || "",
    title: it.title?.S || "",
    videoUrlOrId: it.videoUrlOrId?.S || "",
    audience: it.audience?.S || "both",
    active: !!it.active?.BOOL,
    createdAt: it.createdAt?.N ? Number(it.createdAt.N) : null,
    updatedAt: it.updatedAt?.N ? Number(it.updatedAt.N) : null,
  };
}

async function listActiveVideos(limit = 10) {
  if (!TABLE) throw new Error("Missing env VIDEOS_TABLE");

  const cmd = new QueryCommand({
    TableName: TABLE,
    IndexName: GSI,
    KeyConditionExpression: "gsi1pk = :p",
    ExpressionAttributeValues: {
      ":p": { S: "VIDEOS#ACTIVE" },
    },
    ScanIndexForward: false, // newest first
    Limit: Math.max(1, Math.min(Number(limit) || 10, 50)),
  });

  const res = await ddb.send(cmd);
  return (res.Items || []).map(fromItem).filter(Boolean);
}

async function getVideoById(id) {
  const res = await ddb.send(
    new GetItemCommand({
      TableName: TABLE,
      Key: videoKey(id),
    })
  );
  return fromItem(res.Item);
}

async function upsertVideo(input) {
  if (!TABLE) throw new Error("Missing env VIDEOS_TABLE");

  const id = str(input.id || input.videoId || "").trim() || `v_${nowMs()}`;
  const createdAt = input.createdAt ? Number(input.createdAt) : nowMs();
  const updatedAt = nowMs();

  const video = {
    id,
    title: str(input.title || "").trim(),
    videoUrlOrId: str(input.videoUrlOrId || input.url || input.idOrUrl || "").trim(),
    audience: normalizeAudience(input.audience || "both"),
    active: input.active == null ? true : !!input.active,
    createdAt,
    updatedAt,
  };

  if (!video.videoUrlOrId) return { error: "videoUrlOrId is required" };

  await ddb.send(
    new PutItemCommand({
      TableName: TABLE,
      Item: toItem(video),
    })
  );

  return { video };
}

async function setActive(id, active) {
  if (!TABLE) throw new Error("Missing env VIDEOS_TABLE");

  // We update:
  // - active (BOOL)
  // - gsi1pk to ACTIVE/INACTIVE
  // - updatedAt
  const cmd = new UpdateItemCommand({
    TableName: TABLE,
    Key: videoKey(id),
    UpdateExpression: "SET #a = :a, #gpk = :gpk, #ua = :ua",
    ExpressionAttributeNames: {
      "#a": "active",
      "#gpk": "gsi1pk",
      "#ua": "updatedAt",
    },
    ExpressionAttributeValues: {
      ":a": { BOOL: !!active },
      ":gpk": { S: active ? "VIDEOS#ACTIVE" : "VIDEOS#INACTIVE" },
      ":ua": { N: String(nowMs()) },
    },
    ReturnValues: "ALL_NEW",
  });

  const res = await ddb.send(cmd);
  return fromItem(res.Attributes);
}

export async function handler(event) {
  const method = methodOf(event);

  if (method === "OPTIONS") {
    return json(200, { ok: true });
  }

  try {
    const path = pathOf(event);

    // GET /api/videos/latest?audience=students|lecturers|both
    if (method === "GET" && path.endsWith("/api/videos/latest")) {
      const { audience = "both" } = q(event);
      // Query a handful then audience-filter to support "both + students" behavior
      const list = await listActiveVideos(15);
      const latest = list.find((v) => matchesAudience(v.audience, audience)) || null;
      return ok({ latestVideo: latest });
    }

    // GET /api/videos?limit=10
    if (method === "GET" && path.endsWith("/api/videos")) {
      const { limit = "10" } = q(event);
      const list = await listActiveVideos(limit);
      return ok({ videos: list });
    }

    // POST /api/videos  body: { id?, title, videoUrlOrId, audience?, active? }
    if (method === "POST" && path.endsWith("/api/videos")) {
      const body = parseBody(event);
      const out = await upsertVideo(body);
      if (out.error) return bad(out.error);
      return ok({ video: out.video });
    }

    // POST /api/videos/activate body: { id }
    if (method === "POST" && path.endsWith("/api/videos/activate")) {
      const body = parseBody(event);
      const id = str(body.id || body.videoId || "").trim();
      if (!id) return bad("id is required");
      const updated = await setActive(id, true);
      return ok({ video: updated });
    }

    // POST /api/videos/deactivate body: { id }
    if (method === "POST" && path.endsWith("/api/videos/deactivate")) {
      const body = parseBody(event);
      const id = str(body.id || body.videoId || "").trim();
      if (!id) return bad("id is required");
      const updated = await setActive(id, false);
      return ok({ video: updated });
    }

    return json(404, { ok: false, error: "Not found", path });
  } catch (err) {
    console.error("SkVideosHandler error:", err);
    return json(500, { ok: false, error: "Server error", detail: String(err?.message || err) });
  }
}