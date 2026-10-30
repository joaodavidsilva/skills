import { contrastOfLuminance, luminanceOfRgb } from "./contrast";
import type { SceneBackdrop, Slide } from "./types";

// Readability findings measured on a rendered slide: text that a slide edge
// cuts, and text whose colour is too close to what was composed behind it.
//
// Contrast is read from a render taken with the text hidden. Reading the final
// render instead would sample the glyphs' own ink, and a patch of art the same
// colour as the text (white on white) would be mistaken for ink and dropped.
// The worst tile along a line decides, not the average: half a headline that
// reads and half that does not average to one that seems to.

export type TextKind = "label" | "headline" | "text";

/** A rectangle in slide pixels (CSS px of the untransformed slide root). */
export type Rect = { left: number; top: number; width: number; height: number };

/** One rendered line: where it sits, and the part of it that survives every clipping ancestor. */
export type TextLine = { box: Rect; visible: Rect | null };

export type TextProbe = {
  kind: TextKind;
  /** The copy, for naming the finding. */
  text: string;
  /** Computed text colour as 0-255 channels. */
  color: [number, number, number];
  lines: TextLine[];
};

export type ReadabilityFinding = {
  kind: "cut" | "contrast";
  text: TextKind;
  /** First words of the copy, enough to find it on the slide. */
  excerpt: string;
  /** Contrast ratio of the worst tile, for `contrast` findings. */
  ratio?: number;
};

/** Pixels the way `getImageData` returns them. */
export type Pixels = { data: Uint8ClampedArray; width: number; height: number };

/** Contrast the text should reach against what is behind it, per kind. */
const MIN_CONTRAST: Record<TextKind, number> = { headline: 4.5, text: 4.5, label: 3 };
/** A line box is the glyph advance box; ink and rounding may sit this far outside it. */
const EDGE_TOLERANCE = 2;
/** Tile width as a share of the line's height: a patch worth seeing owns one outright. */
const TILE_OF_LINE_HEIGHT = 1 / 3;
/** Read every Nth pixel along each axis of a tile: the median does not need them all. */
const STRIDE = 2;

export function parseRgb(value: string): [number, number, number] | null {
  const m = /^rgba?\(\s*(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)/.exec(value.trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

type Edges = { left: number; top: number; right: number; bottom: number };

/**
 * What survives of `box` once every ancestor that clips its overflow, up to and
 * including `root`, has had its say. Null when nothing does: that is text of a
 * neighbouring screen, hidden by its own screen's edge.
 */
function survivingRect(el: HTMLElement, root: HTMLElement, box: Edges): Edges | null {
  const kept = { ...box };
  for (let node = el.parentElement; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    const clipX = style.overflowX !== "visible";
    const clipY = style.overflowY !== "visible";
    if (clipX || clipY) {
      const r = node.getBoundingClientRect();
      if (clipX) {
        kept.left = Math.max(kept.left, r.left);
        kept.right = Math.min(kept.right, r.right);
      }
      if (clipY) {
        kept.top = Math.max(kept.top, r.top);
        kept.bottom = Math.min(kept.bottom, r.bottom);
      }
    }
    if (node === root) break;
  }
  return kept.right > kept.left && kept.bottom > kept.top ? kept : null;
}

/** Every rendered text under `root`, with its line boxes in `root`'s own pixel space. */
export function probeText(root: HTMLElement): TextProbe[] {
  const origin = root.getBoundingClientRect();
  const toRect = (e: Edges): Rect => ({ left: e.left - origin.left, top: e.top - origin.top, width: e.right - e.left, height: e.bottom - e.top });
  const probes: TextProbe[] = [];
  root.querySelectorAll<HTMLElement>("[data-text-kind]").forEach((el) => {
    const text = (el.textContent ?? "").trim();
    if (!text) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    const lines = Array.from(range.getClientRects())
      .filter((r) => r.width > 0 && r.height > 0)
      .map((r) => {
        const edges = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
        const visible = survivingRect(el, root, edges);
        return { box: toRect(edges), visible: visible && toRect(visible) };
      });
    const color = parseRgb(getComputedStyle(el).color);
    if (lines.length === 0 || !color) return;
    probes.push({ kind: el.dataset.textKind as TextKind, text, color, lines });
  });
  return probes;
}

const excerpt = (text: string) => (text.length > 28 ? `${text.slice(0, 27).trimEnd()}…` : text).replace(/\s+/g, " ");

/**
 * Text that is partly visible and partly clipped, by the slide edge or by the
 * box it sits in. A line with nothing visible belongs to a neighbouring screen
 * and is not this slide's to answer for.
 */
export function cutText(probes: TextProbe[]): ReadabilityFinding[] {
  return probes
    .filter((probe) =>
      probe.lines.some(
        ({ box, visible }) =>
          visible !== null && (box.width - visible.width > EDGE_TOLERANCE || box.height - visible.height > EDGE_TOLERANCE),
      ),
    )
    .map((probe) => ({ kind: "cut", text: probe.kind, excerpt: excerpt(probe.text) }));
}

function median(values: Float32Array, count: number) {
  const sorted = values.subarray(0, count).sort();
  return sorted[count >> 1];
}

/**
 * Worst-tile contrast of one line of text against `pixels`, a render of the
 * slide with that text hidden. `scale` converts the line's slide pixels to
 * pixel-buffer pixels. Null when the line lies off the buffer.
 */
export function worstTileContrast(pixels: Pixels, line: Rect, scale: number, color: [number, number, number]): number | null {
  const x0 = Math.max(0, Math.floor(line.left * scale));
  const y0 = Math.max(0, Math.floor(line.top * scale));
  const x1 = Math.min(pixels.width, Math.ceil((line.left + line.width) * scale));
  const y1 = Math.min(pixels.height, Math.ceil((line.top + line.height) * scale));
  if (x1 <= x0 || y1 <= y0) return null;

  const textLuminance = luminanceOfRgb(color[0], color[1], color[2]);
  const tileWidth = Math.max(1, Math.round(line.height * scale * TILE_OF_LINE_HEIGHT));
  const scratch = new Float32Array(Math.ceil(tileWidth / STRIDE + 1) * Math.ceil((y1 - y0) / STRIDE + 1));
  let worst = Infinity;
  for (let tx = x0; tx < x1; tx += tileWidth) {
    let count = 0;
    for (let y = y0; y < y1; y += STRIDE) {
      for (let x = tx; x < Math.min(tx + tileWidth, x1); x += STRIDE) {
        const i = (y * pixels.width + x) * 4;
        scratch[count++] = luminanceOfRgb(pixels.data[i], pixels.data[i + 1], pixels.data[i + 2]);
      }
    }
    if (count === 0) continue;
    worst = Math.min(worst, contrastOfLuminance(textLuminance, median(scratch, count)));
  }
  return Number.isFinite(worst) ? worst : null;
}

/** Texts whose worst tile falls below the contrast their kind needs. */
export function lowContrastText(probes: TextProbe[], pixels: Pixels, scale: number): ReadabilityFinding[] {
  const findings: ReadabilityFinding[] = [];
  for (const probe of probes) {
    let worst = Infinity;
    for (const { visible } of probe.lines) {
      if (!visible) continue;
      const ratio = worstTileContrast(pixels, visible, scale, probe.color);
      if (ratio !== null) worst = Math.min(worst, ratio);
    }
    if (worst < MIN_CONTRAST[probe.kind]) {
      findings.push({ kind: "contrast", text: probe.kind, excerpt: excerpt(probe.text), ratio: Math.round(worst * 10) / 10 });
    }
  }
  return findings;
}

/**
 * Render the slide with its text hidden and judge each text against it.
 * `render` draws the slide and hands back the pixels; the caller owns what
 * rendering means, this owns only hiding and restoring the text.
 */
export async function measureContrast(
  root: HTMLElement,
  render: () => Promise<{ pixels: Pixels; scale: number }>,
): Promise<ReadabilityFinding[]> {
  const probes = probeText(root);
  if (probes.length === 0) return [];
  const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-text-kind]"));
  const previous = targets.map((el) => el.style.visibility);
  targets.forEach((el) => (el.style.visibility = "hidden"));
  try {
    const { pixels, scale } = await render();
    return lowContrastText(probes, pixels, scale);
  } finally {
    targets.forEach((el, i) => (el.style.visibility = previous[i]));
  }
}

/** One toast line per kind of finding, naming the screens it touches. */
export function describeReadability(
  findings: { screen: string; finding: ReadabilityFinding }[],
): string[] {
  const cut = findings.filter(({ finding }) => finding.kind === "cut");
  const contrast = findings.filter(({ finding }) => finding.kind === "contrast");
  const name = ({ screen, finding }: (typeof findings)[number]) => `${screen} "${finding.excerpt}"`;
  const lines: string[] = [];
  if (cut.length) lines.push(`Text cut off at an edge: ${cut.slice(0, 3).map(name).join(", ")}${cut.length > 3 ? "…" : ""}.`);
  if (contrast.length) {
    lines.push(
      `Low contrast against the backdrop: ${contrast
        .slice(0, 3)
        .map((f) => `${name(f)} (${f.finding.ratio}:1)`)
        .join(", ")}${contrast.length > 3 ? "…" : ""}.`,
    );
  }
  return lines;
}

/**
 * Whether the pixels behind a slide's text are worth measuring. The plain
 * gradient and solid backdrops are the themes' own colours, which the theme
 * and `slideColors` already keep readable; anything painted over them (image
 * overlays, aurora blooms, spotlights, grids) can put any colour under a line.
 * Skipping the rest keeps the default export exactly as fast as before.
 */
export function needsContrastCheck(slide: Pick<Slide, "imageElements">, backdrop: SceneBackdrop): boolean {
  return (slide.imageElements?.length ?? 0) > 0 || (backdrop !== "gradient" && backdrop !== "solid");
}
