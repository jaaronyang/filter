# Filter API

From this directory, install dependencies and start the server:

```sh
uv sync
uv run uvicorn backend.main:app --reload --app-dir src --port 8000
```

The local model must be present in `models/laya`. If it is missing, run `uv run python scripts/fetch_model.py` once while Hugging Face access is available.

- `GET /api/health` checks that the API is running.
- `POST /api/edit-recipe` accepts `{ "prompt": "..." }` and returns a validated editing recipe. It does not accept image data.
