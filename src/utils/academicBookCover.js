// src/utils/academicBookCover.js

import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker?url";
import openjpegWasmUrl from "pdfjs-dist/wasm/openjpeg.wasm?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Generate a JPEG cover thumbnail from the first page
 * of an academic book PDF.
 *
 * Returns a JPEG Blob suitable for uploading to S3.
 */
export async function generateAcademicBookCover(file) {
  if (!file) {
    throw new Error("Please select an academic book PDF.");
  }

  const buffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
  data: buffer,
  wasmUrl: new URL(".", new URL(openjpegWasmUrl, window.location.href)).href,
});
  let pdf;

  try {
    pdf = await loadingTask.promise;

    // Render only the first page.
    const page = await pdf.getPage(1);

    const originalViewport = page.getViewport({
      scale: 1,
    });

    // Limit thumbnail width to 320 pixels.
    const scale = Math.min(
      1,
      320 / originalViewport.width
    );

    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Unable to create book cover image.");
    }

    // Use a white background for PDF transparency.
    context.fillStyle = "#ffffff";
    context.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    const coverBlob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(
              new Error("Failed to generate book cover.")
            );
          }
        },
        "image/jpeg",
        0.8
      );
    });

    page.cleanup();

    return coverBlob;
   } finally {
    await loadingTask.destroy();
  }
 }