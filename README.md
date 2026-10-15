# AirDraw

Draw in the air with your webcam. AirDraw tracks your hand in the browser and
lets you draw by pinching your thumb and index finger together.

## Features
- Real-time hand tracking with MediaPipe Hand Landmarker
- Pinch-to-draw gesture with hysteresis, so the pen doesn't flicker
- Smoothing (exponential moving average) for cleaner lines
- Color picker, brush size slider, clear button, and save as PNG
- Runs entirely in the browser: your video never leaves your device

## Tech
HTML, CSS, vanilla JavaScript, Canvas API, MediaPipe Tasks Vision

## Run locally
The webcam only works on `localhost` or HTTPS, so use a local server:

    python server.py

Then open http://localhost:8001 (use whatever port is set in `server.py`).

## How to use
1. Allow camera access.
2. Pinch your thumb and index finger to draw; open them to move without drawing.
3. Press **S** to toggle smoothing on and off.