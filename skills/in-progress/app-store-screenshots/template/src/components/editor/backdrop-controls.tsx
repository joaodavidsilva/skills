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
  backdropPrompt,
  backdropStatus,
  findBackdrop,
  generateBackdrop,
  nearestAspectRatio,
  withBackdrop,
  withoutBackdrop,
  type BackdropStatus,
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
import type { Device, Orientation, Slide, Theme } from "@/lib/types";
import { getCanvas } from "./slide-canvas";

const CONFIRMED_KEY = "backdrop-spend-confirmed";
const IDEA_KEY = "backdrop-idea";

const readSession = (key: string) => {
  try { return sessionStorage.getItem(key); } catch { return null; }
};
const writeSession = (key: string, value: string) => {
  try { sessionStorage.setItem(key, value); } catch { /* private mode: ask again next time */ }
};

type Props = {
  slide: Slide;
  device: Device;
  orientation: Orientation;
  theme: Theme;
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
export function BackdropControls({ slide, device, orientation, theme, onUpdate, onUpdateAll }: Props) {
  const [status, setStatus] = React.useState<BackdropStatus | null>(null);
  const [idea, setIdea] = React.useState(() => readSession(IDEA_KEY) ?? "");
  const [model, setModel] = React.useState<BackdropModelId>(DEFAULT_BACKDROP_MODEL);
  const [size, setSize] = React.useState<BackdropSize>(DEFAULT_BACKDROP_SIZE);
  const [confirming, setConfirming] = React.useState(false);
  const [dontAsk, setDontAsk] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const mounted = React.useRef(true);
  React.useEffect(() => {
    mounted.current = true;
    void backdropStatus().then((value) => mounted.current && setStatus(value));
    return () => { mounted.current = false; };
  }, []);

  const backdrop = findBackdrop(slide);
  const { cW, cH } = getCanvas(device, orientation);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const result = await generateBackdrop({
        prompt: backdropPrompt({ idea, theme, slide }),
        aspectRatio: nearestAspectRatio(cW, cH),
        size,
        model,
      });
      await preloadImages([result.path], { retryFailed: true });
      // The slide's own update, not a captured snapshot: edits made while the
      // image was being painted are kept, and so is the result if the user
      // moved to another screen meanwhile.
      onUpdate((latest) => ({ imageElements: withBackdrop(latest, result.path, cW, cH) }));
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : "Backdrop request failed");
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  function requestGenerate() {
    writeSession(IDEA_KEY, idea);
    if (readSession(CONFIRMED_KEY) === "1") void generate();
    else setConfirming(true);
  }

  return (
    <details className="group rounded-md border" open={!!backdrop || undefined}>
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
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => onUpdateAll((latest) => ({ imageElements: withBackdrop(latest, backdrop.src, cW, cH) }))}>
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
              <Label className="text-xs">Describe the look</Label>
              <Textarea
                aria-label="Backdrop description"
                value={idea}
                onChange={(event) => setIdea(event.target.value.slice(0, BACKDROP_PROMPT_MAX - 800))}
                rows={3}
                placeholder="Warm amber light on dark charcoal, soft paper grain"
                disabled={busy}
              />
            </div>

            <div className="grid grid-cols-2 gap-1.5">
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
              disabled={busy || status === null}
              onClick={requestGenerate}
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <ImagePlus className="h-3.5 w-3.5" aria-hidden />}
              {busy ? "Painting…" : backdrop ? "Generate another" : "Generate backdrop"}
            </Button>

            {error && (
              <p role="alert" className="text-[11px] leading-relaxed text-destructive">
                {error}
              </p>
            )}
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Paid by your own key. Only the text above and the theme colours are sent, never a screenshot. The
              image is stored in the project like any upload. Text readability is checked when you export.
            </p>
          </>
        )}
      </div>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate a backdrop?</DialogTitle>
            <DialogDescription>
              This sends your description and the theme colours to Google&apos;s image API with your
              <code> GEMINI_API_KEY</code> and is billed by Google. No screenshot or project file is sent.
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
