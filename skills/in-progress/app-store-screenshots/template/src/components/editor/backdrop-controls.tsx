import * as React from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  BACKDROP_STYLES,
  DEFAULT_BACKDROP_STYLE,
  backdropPalette,
  backdropPrompt,
  backdropStatus,
  findBackdrop,
  generateBackdrop,
  keepBackdrop,
  nearestAspectRatio,
  withBackdrop,
  withoutBackdrop,
  type BackdropOption,
  type BackdropStatus,
  type BackdropStyleId,
} from "@/lib/backdrop";
import {
  BACKDROP_MODELS,
  BACKDROP_PROMPT_MAX,
  BACKDROP_SIZES,
  DEFAULT_BACKDROP_MODEL,
  DEFAULT_BACKDROP_SIZE,
  type BackdropModelId,
  type BackdropSize,
} from "@/lib/backdrop-options";
import { img, preloadImages } from "@/lib/image-cache";
import { resolveScreenshot } from "@/lib/locale";
import { paletteOfImage, type ImagePalette } from "@/lib/palette";
import type { Device, Orientation, Slide, Theme } from "@/lib/types";
import { getCanvas } from "./slide-canvas";

const CONFIRMED_KEY = "backdrop-spend-confirmed";
const IDEA_KEY = "backdrop-idea";
const STYLE_KEY = "backdrop-style";

const readSession = (key: string) => {
  try { return sessionStorage.getItem(key); } catch { return null; }
};
const writeSession = (key: string, value: string) => {
  try { sessionStorage.setItem(key, value); } catch { /* private mode: ask again next time */ }
};

type Colours = "screenshot" | "theme";

type Props = {
  slide: Slide;
  device: Device;
  orientation: Orientation;
  theme: Theme;
  locale: string;
  /** Patch computed from this slide's latest state (safe after the request finishes). */
  onUpdate: (update: (slide: Slide) => Partial<Slide>) => void;
  /** Same patch for every screen of the deck. */
  onUpdateAll: (update: (slide: Slide) => Partial<Slide>) => void;
};

/**
 * Inspector section: an optional AI backdrop behind the slide. It sits beside
 * the built-in scenes and never replaces them; the result is a stored image
 * element like any other, so exports stay reproducible.
 */
export function BackdropControls({ slide, device, orientation, theme, locale, onUpdate, onUpdateAll }: Props) {
  const [status, setStatus] = React.useState<BackdropStatus | null>(null);
  const [style, setStyle] = React.useState<BackdropStyleId>(() => {
    const saved = readSession(STYLE_KEY);
    return BACKDROP_STYLES.some((option) => option.id === saved) ? (saved as BackdropStyleId) : DEFAULT_BACKDROP_STYLE;
  });
  const [idea, setIdea] = React.useState(() => readSession(IDEA_KEY) ?? "");
  const [colours, setColours] = React.useState<Colours>("screenshot");
  const [count, setCount] = React.useState<1 | 3>(1);
  const [model, setModel] = React.useState<BackdropModelId>(DEFAULT_BACKDROP_MODEL);
  const [size, setSize] = React.useState<BackdropSize>(DEFAULT_BACKDROP_SIZE);
  const [confirming, setConfirming] = React.useState(false);
  const [dontAsk, setDontAsk] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [options, setOptions] = React.useState<BackdropOption[]>([]);
  const [shot, setShot] = React.useState<ImagePalette | null>(null);
  const mounted = React.useRef(true);
  React.useEffect(() => {
    mounted.current = true;
    void backdropStatus().then((value) => mounted.current && setStatus(value));
    return () => { mounted.current = false; };
  }, []);

  // The screen's own colours, so the art matches the app it sits behind.
  const screenshotSrc = slide.screenshot ? resolveScreenshot(slide.screenshot, locale) : "";
  React.useEffect(() => {
    let current = true;
    setShot(null);
    if (screenshotSrc) void paletteOfImage(img(screenshotSrc)).then((value) => current && setShot(value));
    return () => { current = false; };
  }, [screenshotSrc]);

  const backdrop = findBackdrop(slide);
  const { cW, cH } = getCanvas(device, orientation);
  const palette = backdropPalette(theme, slide, colours === "screenshot" ? shot : null);
  const needsIdea = style === "custom" && idea.trim() === "";

  const place = (path: string) => (latest: Slide) => ({ imageElements: withBackdrop(latest, path, cW, cH) });

  async function keep(option: BackdropOption) {
    setBusy(true);
    setError(null);
    try {
      const path = await keepBackdrop(option);
      await preloadImages([path], { retryFailed: true });
      // The slide's own update, not a captured snapshot: edits made meanwhile are kept.
      onUpdate(place(path));
      if (mounted.current) setOptions([]);
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : "Couldn't keep the backdrop");
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  async function generate() {
    setBusy(true);
    setError(null);
    setOptions([]);
    try {
      const prompt = backdropPrompt({ style, idea, palette, slide });
      const results = await Promise.allSettled(
        Array.from({ length: count }, () => generateBackdrop({ prompt, aspectRatio: nearestAspectRatio(cW, cH), size, model })),
      );
      const painted = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
      const failed = results.length - painted.length;
      if (painted.length === 0) {
        const first = results.find((result) => result.status === "rejected");
        throw first?.status === "rejected" ? first.reason : new Error("Backdrop request failed");
      }
      if (failed > 0 && mounted.current) setError(`${failed} of ${results.length} options failed. Pick from the ones that were painted, or generate again.`);
      if (painted.length === 1 && count === 1) {
        await keep(painted[0]);
      } else if (mounted.current) {
        setOptions(painted);
      }
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : "Backdrop request failed");
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  function requestGenerate() {
    writeSession(IDEA_KEY, idea);
    writeSession(STYLE_KEY, style);
    if (readSession(CONFIRMED_KEY) === "1") void generate();
    else setConfirming(true);
  }

  return (
    <details className="group rounded-md border" open={!!backdrop || options.length > 0 || undefined}>
      <summary className="flex cursor-pointer select-none items-center gap-2 p-2 text-xs font-medium">
        <ImagePlus className="h-3.5 w-3.5" aria-hidden />
        AI backdrop
        <span className="font-normal text-muted-foreground">(optional)</span>
      </summary>
      <div className="space-y-2 border-t p-2">
        {backdrop && (
          <div className="flex items-center gap-2">
            <img
              src={img(backdrop.src)}
              alt="Current AI backdrop"
              className="h-16 w-9 rounded border object-cover"
              draggable={false}
            />
            <div className="flex flex-1 flex-wrap gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                title="Skips inverted screens, which expect a light backdrop"
                onClick={() => onUpdateAll((latest) => (latest.inverted ? {} : place(backdrop.src)(latest)))}
              >
                Use on all screens
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => onUpdate((latest) => ({ imageElements: withoutBackdrop(latest) }))}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove
              </Button>
            </div>
          </div>
        )}
        {status && !status.available ? (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Paints an image behind this screen with Google&apos;s image models. Export <code>GEMINI_API_KEY</code> in
            the shell that runs the editor, then restart it. The built-in backdrops in Scene need nothing.
          </p>
        ) : (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Style</Label>
              <Select value={style} onValueChange={(value) => setStyle(value as BackdropStyleId)} disabled={busy}>
                <SelectTrigger aria-label="Backdrop style" className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BACKDROP_STYLES.map((option) => (
                    <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{style === "custom" ? "Describe the look" : "Anything to add? (optional)"}</Label>
              <Textarea
                aria-label="Backdrop description"
                value={idea}
                onChange={(event) => setIdea(event.target.value.slice(0, BACKDROP_PROMPT_MAX - 1200))}
                rows={2}
                placeholder={style === "custom" ? "Warm studio light on a charcoal wall, soft film grain" : "More spheres, fewer lines, a touch of cream"}
                disabled={busy}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Colours</Label>
              <div className="grid grid-cols-[1fr_auto] items-center gap-1.5">
                <Select value={colours} onValueChange={(value) => setColours(value as Colours)} disabled={busy}>
                  <SelectTrigger aria-label="Backdrop colours" className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="screenshot">From this screenshot</SelectItem>
                    <SelectItem value="theme">From the theme</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1" aria-label={`Colours: ${palette.base} and ${palette.accent}`}>
                  <span className="h-6 w-6 rounded border" style={{ background: palette.base }} title={`Base ${palette.base}`} />
                  <span className="h-6 w-6 rounded border" style={{ background: palette.accent }} title={`Accent ${palette.accent}`} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <Select value={String(count)} onValueChange={(value) => setCount(value === "3" ? 3 : 1)} disabled={busy}>
                <SelectTrigger aria-label="Options to paint" className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 option</SelectItem>
                  <SelectItem value="3">3 options</SelectItem>
                </SelectContent>
              </Select>
              <Select value={model} onValueChange={(value) => setModel(value as BackdropModelId)} disabled={busy}>
                <SelectTrigger aria-label="Image model" className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BACKDROP_MODELS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={size} onValueChange={(value) => setSize(value as BackdropSize)} disabled={busy}>
                <SelectTrigger aria-label="Image size" className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BACKDROP_SIZES.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              size="sm"
              className="h-8 w-full gap-1.5 text-xs"
              disabled={busy || status === null || needsIdea}
              onClick={requestGenerate}
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <ImagePlus className="h-3.5 w-3.5" aria-hidden />}
              {busy ? "Painting…" : backdrop || options.length > 0 ? "Generate again" : count === 3 ? "Generate 3 options" : "Generate backdrop"}
            </Button>

            {options.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Pick one</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {options.map((option, index) => (
                    <button
                      key={index}
                      type="button"
                      disabled={busy}
                      aria-label={`Use option ${index + 1}`}
                      onClick={() => void keep(option)}
                      className="overflow-hidden rounded border outline-none transition hover:ring-2 hover:ring-ring focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                    >
                      <img src={option.dataUrl} alt={`Backdrop option ${index + 1}`} className="aspect-[9/16] w-full object-cover" draggable={false} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <p role="alert" className="text-[11px] leading-relaxed text-destructive">
                {error}
              </p>
            )}
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Paid by your own key. Only the text prompt is sent, never a screenshot. The picked image is stored in
              the project like any upload. Text readability is checked when you export.
            </p>
          </>
        )}
      </div>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{count === 1 ? "Generate a backdrop?" : `Generate ${count} backdrops?`}</DialogTitle>
            <DialogDescription>
              This sends a text prompt to Google&apos;s image API with your
              <code> GEMINI_API_KEY</code> and is billed by Google: {count === 1 ? "one image" : `${count} images, one request each`}.
              No screenshot or project file is sent.
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={dontAsk} onChange={(event) => setDontAsk(event.target.checked)} />
            Don&apos;t ask again until I close this tab
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setConfirming(false)}>Cancel</Button>
            <Button
              type="button"
              onClick={() => {
                if (dontAsk) writeSession(CONFIRMED_KEY, "1");
                setConfirming(false);
                void generate();
              }}
            >
              Generate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </details>
  );
}
