import type { EditingRecipe } from './types';

declare global {
  interface Window { fx?: FxLibrary }
}
interface FxTexture { destroy: () => void }
interface FxCanvas extends HTMLCanvasElement {
  texture: (source: HTMLImageElement) => FxTexture;
  draw: (texture: FxTexture) => FxCanvas;
  update: () => FxCanvas;
  brightnessContrast: (brightness: number, contrast: number) => FxCanvas;
  hueSaturation: (hue: number, saturation: number) => FxCanvas;
  vibrance: (amount: number) => FxCanvas;
  vignette: (size: number, amount: number) => FxCanvas;
}
interface FxLibrary { canvas: () => FxCanvas }
const fail = (message: string): Error => new Error(message);

/** Lightroom-inspired tone and color controls, adapted to the filters glfx.js actually provides. */
export function renderEditedImage(original: HTMLImageElement, recipe: EditingRecipe): string {
  if (!window.fx) throw fail('The local glfx.js library did not load. Refresh the page and try again.');
  let canvas: FxCanvas;
  try { canvas = window.fx.canvas(); }
  catch { throw fail('WebGL could not start. Enable hardware acceleration or try a browser with WebGL support.'); }

  let texture: FxTexture | undefined;
  try {
    texture = canvas.texture(original);
    canvas.draw(texture)
      .brightnessContrast(recipe.exposure * 0.08, recipe.contrast * 0.14)
      .hueSaturation(0, recipe.saturation * 0.18)
      .vibrance(recipe.vibrance * 0.2);
    // Vignette is easy to overdo, so keep its per-level effect gentler than the other controls.
    if (recipe.vignette > 0) canvas.vignette(0.5, recipe.vignette * 0.08);
    canvas.update();

    const output = document.createElement('canvas');
    output.width = canvas.width; output.height = canvas.height;
    const ctx = output.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw fail('This browser could not create an image canvas.');
    ctx.drawImage(canvas, 0, 0);
    applyMissingColorControls(ctx, output.width, output.height, recipe);
    return output.toDataURL('image/jpeg', 0.94);
  } catch (error) {
    if (error instanceof Error && error.message.includes('could not')) throw error;
    throw fail('glfx.js could not process this photo. Try a smaller or standard JPEG/PNG image.');
  } finally { texture?.destroy(); }
}

/** glfx.js lacks dedicated temperature, tint, highlights and shadows controls. */
function applyMissingColorControls(ctx: CanvasRenderingContext2D, width: number, height: number, recipe: EditingRecipe) {
  const frame = ctx.getImageData(0, 0, width, height);
  const px = frame.data;
  const temp = recipe.temperature * 6;
  const tint = recipe.tint * 4;
  const highlight = recipe.highlights * 0.1;
  const shadow = recipe.shadows * 0.08;
  const vignette = recipe.vignette < 0 ? recipe.vignette * 0.03 : 0;
  const cx = width / 2, cy = height / 2, maxD = Math.hypot(cx, cy);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    let r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const hi = Math.max(0, (lum - 0.45) / 0.55), sh = Math.max(0, (0.55 - lum) / 0.55);
    const edge = Math.max(0, Math.hypot(x - cx, y - cy) / maxD - 0.25) / 0.75;
    r += temp / 255 + tint / 510 + highlight * hi + shadow * sh + vignette * edge;
    g += -tint / 255 + highlight * hi + shadow * sh + vignette * edge;
    b += -temp / 255 + tint / 510 + highlight * hi + shadow * sh + vignette * edge;
    px[i] = clamp(r * 255); px[i + 1] = clamp(g * 255); px[i + 2] = clamp(b * 255);
  }
  ctx.putImageData(frame, 0, 0);
}
function clamp(value: number) { return Math.max(0, Math.min(255, value)); }
