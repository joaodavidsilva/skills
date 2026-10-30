# Design Principles

Layout rhythm, cross-screen composition and the visual rules every deck follows, whatever style preset the user picks. Apply them while composing slides, before final export.

## Layout Variation

Vary the `layout` field across slides. The editor exposes:
- `hero`: centered headline + bottom-anchored device
- `device-bottom`: same composition, smaller headline
- `device-top`: flipped, device above caption (good contrast slide)
- `two-devices`: back + front phones layered
- `no-device`: big standalone headline (use sparingly)
- `split-landscape`: caption left + device right (tablet landscape and Mac)
- `feature-graphic`: Play Store banner (1024×500)

Never repeat the same layout twice in a row. Use 1-2 `inverted` (dark) slides for visual rhythm.

On iPhone Duo decks, `two-devices` is **Folded + open**: the second device is the same phone in its other state, drawn in that display's frame. Its second capture comes from the other display.

## Cross-Screen / Cross-Canvas Composition

Use the connected canvas as a design tool after the narrative arc and layout rhythm are chosen and before final export. For most decks with **5+ slides**, plan **one** tasteful cross-screen moment by default. For 8-10 slide decks, use at most **two**. For short, formal, or compliance-heavy decks, zero is fine. The goal is "these screenshots belong together," not "one giant poster chopped into pieces."

Good cross-screen patterns:
- An oversized phone, tablet, or screenshot mosaic bridges two adjacent screens by 10-30% of its width, while each exported crop still reads as a complete ad.
- A background horizon, photo, gradient, doodle path, waveform, starfield, sticker trail, or map route continues across the seam.
- A mascot, 3D object, floating chip, or notification peeks from one screen into the next as a secondary visual, not the whole message.
- Related ideas form a pair: problem → solution, before → after, overview → detail, plan → result.
- The seam passes through negative space, a soft shadow, a simple object body, or a non-critical decorative area.

Bad cross-screen patterns:
- Splitting headlines, app names, prices, legal text, ratings, CTAs, or critical UI across a seam.
- Centering one giant phone on the seam so each crop shows only a half-device and no clear benefit.
- Using cross-screen movement on every slide; it becomes a gimmick and makes the deck harder to scan.
- Cutting through faces, mascot eyes, key chart numbers, product claims, or app-store-required information.
- Requiring the viewer to understand the carousel as one uninterrupted poster. Every exported PNG must still pass the one-second standalone test.
- Letting shadows, stickers, or partial objects look accidentally clipped. If it crosses a boundary, make the bleed deliberate with scale, shadow, rotation, or continuation.

Placement rules:
- Use adjacent screens only unless a deliberate 3-screen panorama is the entire concept.
- Keep all text fully inside a single exported screen with safe margins.
- Let 10-30% of a non-critical visual cross the seam; go beyond 40% only for backgrounds, paths, or abstract decoration.
- If adjacent screens have different background colors, bridge them with a shared object, matching shadow direction, or a designed transition band.
- Review both views: the zoomed-out connected canvas must look cohesive, and each individual export must still sell one idea.

## Visual Design Principles

These rules are derived from studying the best app store screenshots in the wild (Superlist, Headspace, CRED, (Not Boring) Camera, Arc Search, Linktree, Gentler Streak, etc.). They apply regardless of which style preset the user picks. Style-specific tokens (fonts, palette, accents) live in [`STYLES.md`](./STYLES.md); point the user there.

### 1. The background is a designed surface, never white

Plain white is the amateur tell. Every great deck uses a deliberate surface: a saturated color block, a warm cream/off-white (`#F4F1EC`-ish), a dark navy/near-black, or a gradient. The background can shift per slide (Headspace, Linktree do this), but it must read as intentional, not default.

### 2. Headlines dominate

The headline occupies roughly the **top 30-40%** of the canvas, much bigger than a typical web hero. If a person can't read it at thumbnail size with no zoom, redesign.

### 3. Mixed emphasis inside the headline

Almost every great headline has one word styled differently from the rest: a contrast color, an italic script, a heavier weight, or a hand-drawn underline. Examples:
- Superlist: "The one app that fits **your whole day**" (script + coral)
- Headspace: "Stress **less**" (`less` orange against black)
- Arc Search: "**Fastest** way to search. **Cleanest** way to browse." (purple / navy)

Flat single-color headlines look weaker. Pick one emphasis word per slide.

### 4. Decorative accents are the rule, not the exception

Top decks layer at least one of these on most slides:
- Hand-drawn squiggles, arrows, scribbles (Superlist)
- Sparkles / glow (Gentler Streak, Arc)
- Label badges on the visual ("SUPER RAW", "Cinematic", "LUT")
- Floating widget chips with real stats ("$3,630 earned", "11,175 steps"); these tell the story without copy
- Award lockups on the hero only (Apple Design Award, Webby, star count)

A bare phone on a bare bg with a bare headline is the default-skill output. Add one accent.

### 5. Phone framing is a deliberate choice: vary it across the deck

Three common framings, each carries a different feeling:
- **Bezelless / minimal frame**: maximizes UI legibility, modern (Arc, Linktree, Gentler)
- **Tilted floating phone with soft shadow**: product / advertorial feel (Superlist, CRED hero)
- **Full device with visible bezel, dead-center**: editorial, premium (CRED, NB Camera)

Mix at least two framings across the deck.

### 6. Proof anchors the hero, nothing else

Award badges, press quotes, star counts, install counts: concentrate them on **slide 1 only**. Spreading them dilutes both the proof and the rest of the slides. NB Camera does this perfectly: Verge quote + Apple Design Award + 15,000+ stars all on the cover, none after.

### 7. Density inside the phone, sparsity outside

The screenshot inside the phone can (and should) be a real, dense product capture: actual lists, dashboards, charts, conversations. The space *outside* the phone is the opposite: one headline, one visual, one optional sub-line, one optional badge. Don't add bullet lists, multi-line paragraphs, or competing logos around the device.

### 8. Break the phone parade

Every 2-3 slides, drop the phone and use a different hero element to keep visual rhythm:
- 3D rendered product object (NB Camera's stylized camera)
- Photographic still (NB Camera slide 2)
- Real human / lifestyle photo (Linktree)
- Mascot illustration (Headspace's mascot, Gentler Streak's character)
- Typographic feature wall (Superlist's last slide)
- Phone grid mosaic (Linktree's "Trusted by 70M+" final slide)

### 9. Last slide pattern

The closer is almost always one of two things:
- **Feature wall**: a vertical list of one-word features styled as big type ("Real-time collaboration / Offline support / Widgets / Integrations...")
- **Phone mosaic**: multiple bezelless mini-screenshots arranged in a grid to convey "look at all the things this does"

Pick one. Don't make the last slide another single-feature hero; it wastes the spot.

### 10. Thumbnail test (mandatory before export)

Shrink the slide to ~160px wide (App Store search-result size). Squint. Can you read the headline? Can you tell what the app does in under a second? If not, the headline is too long, the type is too thin, or there's no contrast between text and background. Fix before exporting.
