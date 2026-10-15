import {
  HandLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

const video = document.getElementById("video");
const overlay = document.getElementById("overlay");
const overlayCtx = overlay.getContext("2d");
const drawing = document.getElementById("drawing");
const drawCtx = drawing.getContext("2d");
const statusEl = document.getElementById("status");
const clearBtn = document.getElementById("clearBtn");
const saveBtn = document.getElementById("saveBtn");         // NEW
const sizeSlider = document.getElementById("sizeSlider");   // NEW
const swatches = document.querySelectorAll(".swatch");      // NEW

const PINCH_START = 0.3;
const PINCH_STOP = 0.45;
const SMOOTHING = 0.35;

let handLandmarker;
let lastVideoTime = -1;
let prevPoint = null;
let isDrawing = false;
let smoothedCursor = null;
let smoothingOn = true;
let brushColor = "#ffe14d"; // NEW
let brushSize = 6;          // NEW

// 1. Load the model
async function loadModel() {
  statusEl.textContent = "Loading hand model...";

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
  );

  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 1,
  });
}

// 2. Start the camera
function startCamera() {
  return new Promise(async (resolve, reject) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });
      video.srcObject = stream;
      video.addEventListener("loadeddata", () => {
        overlay.width = drawing.width = video.videoWidth;
        overlay.height = drawing.height = video.videoHeight;
        resolve();
      });
    } catch (err) {
      reject(err);
    }
  });
}

// 3. Helpers
function toPixels(landmark) {
  return {
    x: (1 - landmark.x) * overlay.width,
    y: landmark.y * overlay.height,
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function smooth(prev, next, alpha) {
  if (!prev) return next;
  return {
    x: prev.x + alpha * (next.x - prev.x),
    y: prev.y + alpha * (next.y - prev.y),
  };
}

function drawDot(point, color, radius) {
  overlayCtx.beginPath();
  overlayCtx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  overlayCtx.fillStyle = color;
  overlayCtx.fill();
}

// 4. CHANGED: line now uses the chosen color and size
function drawLine(from, to) {
  drawCtx.beginPath();
  drawCtx.moveTo(from.x, from.y);
  drawCtx.lineTo(to.x, to.y);
  drawCtx.strokeStyle = brushColor;
  drawCtx.lineWidth = brushSize;
  drawCtx.lineCap = "round";
  drawCtx.lineJoin = "round";
  drawCtx.stroke();
}

// 5. The detection loop
function detectLoop() {
  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;

    const result = handLandmarker.detectForVideo(video, performance.now());

    overlayCtx.clearRect(0, 0, overlay.width, overlay.height);

    if (result.landmarks.length > 0) {
      const hand = result.landmarks[0];

      const indexTip = toPixels(hand[8]);
      const thumbTip = toPixels(hand[4]);
      const wrist = toPixels(hand[0]);
      const middleBase = toPixels(hand[9]);

      const handSize = distance(wrist, middleBase);
      const pinchRatio = distance(indexTip, thumbTip) / handSize;

      if (!isDrawing && pinchRatio < PINCH_START) {
        isDrawing = true;
      } else if (isDrawing && pinchRatio > PINCH_STOP) {
        isDrawing = false;
      }

      const rawCursor = midpoint(indexTip, thumbTip);
      smoothedCursor = smooth(smoothedCursor, rawCursor, SMOOTHING);
      const cursor = smoothingOn ? smoothedCursor : rawCursor;

      if (isDrawing) {
        if (prevPoint) drawLine(prevPoint, cursor);
        prevPoint = cursor;
      } else {
        prevPoint = null;
      }

      // CHANGED: the cursor previews the brush (color and size)
      drawDot(indexTip, "#ff3b6b", 4);
      drawDot(thumbTip, "#3bb0ff", 4);
      drawDot(cursor, isDrawing ? brushColor : "#ffffff", Math.max(brushSize / 2, 5));

      statusEl.textContent =
        `${isDrawing ? "Drawing" : "Pen up"} | smoothing: ${smoothingOn ? "ON" : "OFF"} (press S)`;
    } else {
      prevPoint = null;
      isDrawing = false;
      smoothedCursor = null;
      statusEl.textContent = "No hand detected";
    }
  }

  requestAnimationFrame(detectLoop);
}

// 6. Clear button
clearBtn.addEventListener("click", () => {
  drawCtx.clearRect(0, 0, drawing.width, drawing.height);
});

// 7. NEW: color swatches
swatches.forEach((swatch) => {
  swatch.addEventListener("click", () => {
    brushColor = swatch.dataset.color;
    swatches.forEach((s) => s.classList.remove("active"));
    swatch.classList.add("active");
  });
});

// 8. NEW: brush size slider
sizeSlider.addEventListener("input", () => {
  brushSize = Number(sizeSlider.value);
});

// 9. NEW: save the drawing as a PNG
saveBtn.addEventListener("click", () => {
  // Build a temporary canvas: dark background + the drawing on top
  const out = document.createElement("canvas");
  out.width = drawing.width;
  out.height = drawing.height;
  const outCtx = out.getContext("2d");

  outCtx.fillStyle = "#111";
  outCtx.fillRect(0, 0, out.width, out.height);
  outCtx.drawImage(drawing, 0, 0);

  // Turn it into a file and trigger a download
  const link = document.createElement("a");
  link.download = "airdraw.png";
  link.href = out.toDataURL("image/png");
  link.click();
});

// 10. Toggle smoothing with the S key
window.addEventListener("keydown", (e) => {
  if (e.key === "s" || e.key === "S") smoothingOn = !smoothingOn;
});

// 11. Put it all together
async function main() {
  try {
    await loadModel();
    await startCamera();
    statusEl.textContent = "Ready: show your hand";
    detectLoop();
  } catch (err) {
    statusEl.textContent = "Error: " + err.message;
    console.error(err);
  }
}

main();