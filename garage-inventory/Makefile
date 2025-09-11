.PHONY: setup run lint fmt test

setup:
		python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt && pip install pytest black ruff

run:
		. .venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

lint:
		. .venv/bin/activate && ruff check app

fmt:
		. .venv/bin/activate && black app

test:
		. .venv/bin/activate && pytest -q
