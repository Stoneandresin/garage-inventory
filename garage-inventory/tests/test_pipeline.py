from pathlib import Path
from app.services import pipeline


def test_pipeline_returns_detection(tmp_path):
    test_file = tmp_path / "test.jpg"
    test_file.write_bytes(b"fake")
    detections = pipeline.process_image(test_file)
    assert detections and detections[0]["label"] == "object"
