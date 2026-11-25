/**
 * S18c-02: whether Continue and No sit inside the phone sheet.
 * The drawer and the centred dialog both stop at 85% of the screen (sheet.css).
 * The confirm block is the first thing in the sheet body, under the grab and the title.
 */

/** `.sheet-drawer` / `.sheet-dialog` max-height. */
export const SHEET_MAX_FRACTION = 0.85;
/** Grab, title row and the padding above the sheet body, from sheet.css. */
export const SHEET_CHROME_PX = 75;

/** The question wraps onto two lines under about 420 px of text, then one row of answers. */
export function confirmBlockHeight(viewportWidth: number): number {
  const textWidth = Math.max(0, viewportWidth - 32);
  const lines = textWidth >= 420 ? 1 : 2;
  return lines * 24 + 8 + 44;
}

/** True when that top block is fully inside an 85% sheet on a screen of `height`. */
export function confirmFitsOnScreen(viewport: { width: number; height: number }): boolean {
  const sheetHeight = viewport.height * SHEET_MAX_FRACTION;
  return SHEET_CHROME_PX + confirmBlockHeight(viewport.width) <= sheetHeight;
}
