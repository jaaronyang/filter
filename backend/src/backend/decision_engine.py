"""Laya structured decisions, isolated from the HTTP contract."""

from functools import lru_cache
import os
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, create_model

from .schemas import EditingRecipe


CORE_CHOICES = {
    "exposure": ("very dark", "dark", "slightly dark", "a little darker", "slightly dimmer", "unchanged", "slightly brighter", "a little brighter", "bright", "very bright", "extremely bright"),
    "contrast": ("very soft", "soft", "slightly soft", "a little softer", "slightly lower", "unchanged", "slightly higher", "a little stronger", "strong", "very strong", "extreme contrast"),
    "highlights": ("strongly protect highlights", "protect highlights", "slightly protect highlights", "gently protect highlights", "slightly lower highlights", "unchanged", "slightly lift highlights", "gently lift highlights", "lift highlights", "strongly lift highlights", "extremely lift highlights"),
    "shadows": ("much deeper shadows", "deeper shadows", "slightly deeper shadows", "gently deepen shadows", "slightly darker shadows", "unchanged", "slightly lifted shadows", "gently lifted shadows", "lifted shadows", "strongly lifted shadows", "extremely lifted shadows"),
    "temperature": ("much cooler", "cooler", "slightly cooler", "gently cooler", "slightly cool", "neutral", "slightly warm", "gently warmer", "warmer", "much warmer", "extremely warm"),
    "tint": ("strongly green", "green", "slightly green", "gently green", "slightly greener", "neutral", "slightly magenta", "gently magenta", "magenta", "strongly magenta", "extremely magenta"),
    "saturation": ("much more muted", "more muted", "slightly muted", "gently muted", "slightly less saturated", "unchanged", "slightly richer", "gently richer", "richer", "much richer", "extremely saturated"),
    "vibrance": ("much less vivid", "less vivid", "slightly less vivid", "gently reduce vibrance", "slightly less vibrance", "unchanged", "slightly more vivid", "gently more vivid", "more vivid", "much more vivid", "extremely vivid"),
    "vignette": ("strongly brighten edges", "brighten edges", "slightly brighten edges", "gently brighten edges", "slightly brighter edges", "none", "subtle dark edges", "gently darken edges", "dark edges", "strong dark edges", "extreme vignette"),
}
CORE_DESCRIPTIONS = {
    "exposure": "Negative darkens the whole image; positive brightens the whole image; zero leaves it unchanged.",
    "contrast": "Negative softens contrast; positive strengthens contrast; zero leaves it unchanged.",
    "highlights": "Negative lowers bright areas to protect or recover detail. Positive raises highlight brightness. Do not confuse bright highlights with highlight protection.",
    "shadows": "Negative darkens shadow areas. Positive lifts and brightens shadow areas.",
    "temperature": "Negative shifts toward cool blue. Positive shifts toward warm yellow.",
    "tint": "Negative shifts toward green. Positive shifts toward magenta. Leave neutral unless a tint supports the requested look.",
    "saturation": "Negative reduces saturation. Positive increases saturation.",
    "vibrance": "Negative reduces color in less-saturated areas. Positive enhances color in less-saturated areas.",
    "vignette": "Negative brightens the edges. Positive darkens the edges. Keep neutral or subtle unless edge darkening/brightening is requested.",
}
CORE_VALUES = tuple(range(-5, 6))

fields = {
    name: (
        Literal.__getitem__(choices),
        Field(description=CORE_DESCRIPTIONS[name])
    )
    for name, choices in CORE_CHOICES.items()
}
_LayaRecipe = create_model("_LayaRecipe", __config__=ConfigDict(extra="forbid", strict=True), **fields)


@lru_cache(maxsize=1)
def _router():
    # Load the project-local English checkpoint and never contact an external model service.
    os.environ["HF_HUB_OFFLINE"] = "1"
    from laya import Router

    model_dir = Path(__file__).resolve().parents[2] / "models" / "laya"
    if not (model_dir / "model.safetensors").is_file():
        raise FileNotFoundError(f"Project-local Laya model is missing: {model_dir}")
    return Router(models={"english": str(model_dir)}, default="english", preload=False)


def _explanation(recipe: EditingRecipe) -> str:
    return "No changes suggested." if not any(recipe.model_dump().values()) else "Applied."


def create_recipe(prompt: str) -> tuple[EditingRecipe, str]:
    """Ask Laya to interpret the prompt and validate its finite recipe choices."""
    choices = _router().decide(
        {"system_instructions": "Interpret the user's full text as one coherent photographic style request. Use its meaning, including mood, metaphor, color associations, lighting, or film-era references, to choose all relevant controls. Follow each control's stated positive/negative direction carefully. In particular, making highlights brighter means increasing highlight brightness, while protecting highlights means reducing it. Prefer balanced, natural-looking edits and use 0 when an adjustment is unnecessary. Express cool or warm color mainly with temperature; use tint only when a green or magenta cast supports the request. Keep vignette subtle unless strong edge darkening/brightening is requested. Choose the strength that best matches the request from the allowed levels; avoid extreme combinations unless the request calls for them. The request is about photo treatment, not changing scene contents. Never claim to inspect an image because none was provided.", "photographic_style_request": prompt},
        schema=_LayaRecipe,
        model="english",
        return_details=False,
    )
    levels = {name: CORE_VALUES[CORE_CHOICES[name].index(value)] for name, value in choices.items()}
    recipe = EditingRecipe.model_validate(levels)
    return recipe, _explanation(recipe)
