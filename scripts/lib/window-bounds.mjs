/**
 * window-bounds.mjs — where the app window sits inside a bridge capture.
 *
 * The capture is the window, scaled to fit the 1920x1080 raster with its aspect
 * preserved and anchored at the top-left; whatever is left over is padding. The
 * window's screen position does not appear in the frame at all.
 *
 * Established by probing three window aspects and comparing the measured
 * content edge against the prediction:
 *
 *   1180x1000 -> scale min(1920/1180, 1080/1000) = 1.080 -> 1274x1080  (cov 0.663)
 *   1400x900  -> scale min(1920/1400, 1080/900)  = 1.200 -> 1680x1080
 *   900x1200  -> scale min(1920/900,  1080/1200) = 0.900 ->  810x1080
 *
 * and by moving the window to (100,60): its traffic lights still landed at
 * ~(24,24) in the image — 20pt * 1.08 — confirming the top-left anchor and that
 * position is discarded.
 *
 * Two consequences worth keeping in mind:
 *
 *   · The crop is arithmetic. An earlier version guessed the edges from pixel
 *     brightness and quietly ate the left rail on every dark-theme capture.
 *     Geometry the system will tell you should not be inferred from pixels.
 *   · A window whose aspect differs from 16:9 is scaled *down* to fit, so it
 *     lands with padding and less detail than the raster could hold. Sizing the
 *     window to 16:9 makes the scale maximal and the padding vanish, which is
 *     why the capture driver picks such a size (see `IDEAL_ASPECT`).
 */
import { execFileSync } from "node:child_process";

/** The raster the bridge's capture path emits. */
export const RASTER = { width: 1920, height: 1080 };

/** Aspect that fills that raster exactly, leaving no padding. */
export const IDEAL_ASPECT = RASTER.width / RASTER.height;

/** Pixel dimensions of an image, via sips (already a build dependency). */
export function imageDims(file) {
  const out = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", file], { encoding: "utf8" });
  const g = (k) => Number(new RegExp(`${k}:\\s*(\\d+)`).exec(out)[1]);
  return { width: g("pixelWidth"), height: g("pixelHeight") };
}

/**
 * Crop box for the window inside a capture.
 *
 * @param {string} file   the capture
 * @param {object} frame  the window's AX frame in points: {w, h} (x/y unused)
 */
export function windowBox(file, frame) {
  const img = imageDims(file);
  const scale = Math.min(img.width / frame.w, img.height / frame.h);

  const width = Math.min(img.width, Math.round(frame.w * scale));
  const height = Math.min(img.height, Math.round(frame.h * scale));

  return {
    x: 0, y: 0, width, height,
    imageWidth: img.width,
    imageHeight: img.height,
    scale,
    /* Fraction of the raster the window fills. Below ~0.95 means the window's
       aspect is off 16:9 and detail is being thrown away to padding — resize
       rather than accept it. */
    coverage: (width * height) / (img.width * img.height),
  };
}

/** Window size, in points, that fills the raster at a given height. */
export function idealWindowSize(height = 1000) {
  return { w: Math.round(height * IDEAL_ASPECT), h: height };
}
