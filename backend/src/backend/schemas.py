from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

# Five signed intensity steps in each direction plus neutral.
Adjustment = Literal[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]


class EditingRecipe(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    exposure: Adjustment = 0
    contrast: Adjustment = 0
    highlights: Adjustment = 0
    shadows: Adjustment = 0
    temperature: Adjustment = 0
    tint: Adjustment = 0
    saturation: Adjustment = 0
    vibrance: Adjustment = 0
    vignette: Adjustment = 0

    @model_validator(mode="before")
    @classmethod
    def reject_non_integer_levels(cls, value):
        if isinstance(value, dict):
            for key, level in value.items():
                if type(level) is not int:
                    raise ValueError(f"{key} must be an integer level")
        return value


class EditRecipeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    prompt: str = Field(min_length=3, max_length=1000)


class EditRecipeResponse(BaseModel):
    recipe: EditingRecipe
    explanation: str = Field(min_length=1, max_length=500)
