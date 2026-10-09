from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from .decision_engine import create_recipe
from .schemas import EditRecipeRequest, EditRecipeResponse

app = FastAPI(title="Filter", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/edit-recipe", response_model=EditRecipeResponse)
def edit_recipe(request: EditRecipeRequest) -> EditRecipeResponse:
    try:
        recipe, explanation = create_recipe(request.prompt)
        return EditRecipeResponse(recipe=recipe, explanation=explanation)
    except ValidationError as exc:
        raise HTTPException(status_code=502, detail="Laya returned an invalid editing recipe.") from exc
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Laya inference failed. Confirm the local model is available and try again ({type(exc).__name__}).",
        ) from exc
