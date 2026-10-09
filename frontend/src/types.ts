export type Level = -5 | -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5;
export type EditingRecipe = {
  exposure: Level; contrast: Level; highlights: Level; shadows: Level;
  temperature: Level; tint: Level; saturation: Level; vibrance: Level; vignette: Level;
};
export type RecipeResponse = { recipe: EditingRecipe; explanation: string };
