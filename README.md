# Filter

A local natural-language photo editor. Laya turns a prompt into a bounded recipe; the browser applies it to the original photo. Image data stays on the device.

## Requirements

- Python 3.14 and `uv`
- Node.js 20+
- The Laya checkpoint in `backend/models/laya`

The model folder is Git-ignored. If it is missing, download it once:

```sh
cd backend
uv sync
uv run python scripts/fetch_model.py
```

## Run

Start the backend in one terminal:

```sh
cd backend
uv sync
uv run uvicorn backend.main:app --reload --app-dir src --port 8000
```

Start the frontend in another:

```sh
cd frontend
npm install
npm run dev
```

Open <http://127.0.0.1:5173>. The API health check is at <http://127.0.0.1:8000/api/health>.

The backend accepts only a text prompt at `POST /api/edit-recipe`; it never receives the photo. Recipes contain nine color and tone controls, each ranging from -5 to +5.

