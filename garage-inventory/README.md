# Garage Inventory

Minimal implementation of a local-first inventory system using FastAPI and SQLite.
Configuration values are read from environment variables; copy `.env.example`
to `.env` and adjust as needed.

## Development

- Install requirements: `pip install -r requirements.txt`
- Run tests: `pytest -q`
- Start app: `uvicorn app.main:app --reload`

## Preview detector

By default the scan page loads a lightweight TensorFlow.js `coco-ssd` model to
draw dashed preview boxes directly in the browser before the server responds.
To disable this and rely solely on server detections set
`PREVIEW_DETECTOR=none` in your `.env` file.  Running the model on-device
increases CPU usage and will drain battery faster.  All inference happens
locally – only captured frames are uploaded to the server for authoritative
results.

