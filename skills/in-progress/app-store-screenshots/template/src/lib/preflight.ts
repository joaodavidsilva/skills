import { detectPlatform } from "./defaults";
import { DEFAULT_LOCALE } from "./locale";
import type { Device, LocalizedText, ProjectState, Slide } from "./types";

// Store-readiness findings for the deck about to be exported, read from the
// project alone (no DOM, no pixels). They are advice: the export always runs.
//
// The rules are the ones both stores reject on sight in screenshot copy, plus
// the two ways a localized deck quietly ships the wrong words: a locale with
// no copy falls back to English at render time, and a locale whose copy was
// pasted from English never got translated. The patterns are English, which is
// what these stores' reviewers read first; copy in another language that
// breaks the same rules is the user's to spot.

export type PreflightCode =
  | "locale-fallback"
  | "locale-untranslated"
  | "deck-too-long"
  | "content-rule"
  | "call-to-action"
  | "paywall-capture";

export type PreflightFinding = {
  code: PreflightCode;
  /** One sentence, ready to show. */
  message: string;
  /** 1-based screen numbers the finding is about. */
  screens: number[];
};

/** Most screenshots a store accepts per device size and localization. */
const APPLE_MAX = 10;
const PLAY_MAX = 8;

type Rule = { label: string; pattern: RegExp };

// First match wins per text, so each text reports one category. "Free" is not a
// price: "ad-free" and "hands-free" are ordinary copy.
const CONTENT_RULES: readonly Rule[] = [
  {
    label: "an unverifiable superlative",
    pattern: /\b(best|greatest|finest|ultimate|unbeatable|unrivall?ed)\b|\bworld['’]s\s+\w+/i,
  },
  {
    label: "a ranking",
    pattern: /\b(top[\s-]?rated|top[\s-]?ranked|top\s?\d+|highest[\s-]rated|most[\s-]popular|best[\s-]selling|number\s?one|no\.?\s?1)\b|#\s?1\b/i,
  },
  {
    label: "an award or recognition",
    pattern: /\b(award[\s-]winning|award[\s-]winner|editor['’]s\s+choice|app\s+of\s+the\s+(year|day)|game\s+of\s+the\s+year)\b/i,
  },
  {
    label: "a price or discount",
    pattern: /[$€£¥]\s?\d|\d\s?(usd|eur|gbp|dollars?|euros?)\b|\d+%\s?(off|discount)/i,
  },
  {
    label: "a URL",
    pattern: /https?:\/\/\S+|www\.\S+|\b[a-z0-9-]+\.(com|io|net|org|app|co|dev)\b/i,
  },
];

const CALL_TO_ACTION =
  /\b(download|install|get|try|play|start)\s+(it\s+|this\s+app\s+)?(now|today|for\s+free)\b|\bsign\s+up\s+(now|today)\b/i;

// Each store's screenshots stay on that store: naming the other one is refused.
const OTHER_PLATFORM: Record<"apple" | "android", Rule> = {
  apple: {
    label: "another platform's store",
    pattern: /\b(google\s?play|play\s?store|android|amazon\s?appstore)\b/i,
  },
  android: {
    label: "another platform's store",
    pattern: /\b(app\s?store|apple|iphone|ipad|ios)\b/i,
  },
};

// A screen whose own file name says it sells the purchase. Only a declared name
// can say so: pixels cannot tell a paywall from any other screen with a button.
const PAYWALL_NAME =
  /paywall|subscri|premium|\bupgrade\b|purchase|checkout|billing|\bpric(e|ing)\b|\btrial\b|\bunlock/i;

const NO_COUNT_LIMIT = (device: Device) => device === "feature-graphic" || device.startsWith("creative-");

function texts(slide: Slide): { field: LocalizedText; kind: "label" | "headline" | "text" }[] {
  return [
    { field: slide.label, kind: "label" },
    { field: slide.headline, kind: "headline" },
    ...(slide.textElements ?? []).map((el) => ({ field: el.text, kind: "text" as const })),
  ];
}

const clean = (value: string | undefined) => (value ?? "").trim();

function fileName(path: string) {
  const name = path.split("/").pop() ?? "";
  return name.replace(/\.[a-z0-9]+$/i, "");
}

function screens(indexes: Iterable<number>) {
  return [...new Set(indexes)].sort((a, b) => a - b).map((i) => i + 1);
}

function list(numbers: number[]) {
  return numbers.length === 1 ? `screen ${numbers[0]}` : `screens ${numbers.join(", ")}`;
}

/** Findings for the deck the editor is about to export. Empty when nothing needs a second look. */
export function preflightFindings(state: ProjectState): PreflightFinding[] {
  const slides = state.slidesByDevice[state.device] ?? [];
  const findings: PreflightFinding[] = [];
  const platform = detectPlatform(state.device);

  if (!NO_COUNT_LIMIT(state.device)) {
    const max = platform === "android" ? PLAY_MAX : APPLE_MAX;
    if (slides.length > max) {
      findings.push({
        code: "deck-too-long",
        message: `${slides.length} screens: ${platform === "android" ? "Google Play" : "the App Store"} accepts at most ${max} per device and locale, so ${list(screens(slides.map((_, i) => i).slice(max)))} would be refused.`,
        screens: screens(slides.map((_, i) => i).slice(max)),
      });
    }
  }

  for (const locale of state.locales) {
    if (locale === DEFAULT_LOCALE) continue;
    const missing: number[] = [];
    const copied: number[] = [];
    slides.forEach((slide, index) => {
      for (const { field, kind } of texts(slide)) {
        const english = clean(field[DEFAULT_LOCALE]);
        if (!english) continue;
        const own = clean(field[locale]);
        if (!own) missing.push(index);
        else if (kind === "headline" && own.toLowerCase() === english.toLowerCase() && english.length >= 6) copied.push(index);
      }
    });
    if (missing.length) {
      const where = screens(missing);
      findings.push({
        code: "locale-fallback",
        message: `${locale}: ${list(where)} would export English copy, because that text has no ${locale} version.`,
        screens: where,
      });
    }
    if (copied.length) {
      const where = screens(copied);
      findings.push({
        code: "locale-untranslated",
        message: `${locale}: the headline on ${list(where)} is identical to English. Translate it, or ignore this for a brand name.`,
        screens: where,
      });
    }
  }

  const otherPlatform = platform === "android" ? OTHER_PLATFORM.android : platform === "ios" || platform === "macos" ? OTHER_PLATFORM.apple : null;
  const ruleHits = new Map<string, Set<number>>();
  const ctaHits = new Set<number>();
  const paywallHits = new Map<number, string>();
  slides.forEach((slide, index) => {
    for (const { field } of texts(slide)) {
      for (const value of Object.values(field)) {
        const text = clean(value);
        if (!text) continue;
        const rule = [...CONTENT_RULES, ...(otherPlatform ? [otherPlatform] : [])].find((r) => r.pattern.test(text));
        if (rule) ruleHits.set(rule.label, (ruleHits.get(rule.label) ?? new Set()).add(index));
        if (CALL_TO_ACTION.test(text)) ctaHits.add(index);
      }
    }
    for (const path of [slide.screenshot, slide.screenshotSecondary]) {
      const name = path ? fileName(path) : "";
      if (name && PAYWALL_NAME.test(name)) paywallHits.set(index, name);
    }
  });

  for (const [label, hits] of ruleHits) {
    const where = screens(hits);
    findings.push({
      code: "content-rule",
      message: `${list(where)} may read as ${label}. Both stores reject that in screenshots: reword it as a claim the app can show.`,
      screens: where,
    });
  }
  if (ctaHits.size) {
    const where = screens(ctaHits);
    findings.push({
      code: "call-to-action",
      message: `${list(where)} carries a call to action. The store page already has the button.`,
      screens: where,
    });
  }
  if (paywallHits.size) {
    const where = screens(paywallHits.keys());
    findings.push({
      code: "paywall-capture",
      message: `${list(where)} uses a capture named like a purchase screen (${[...new Set(paywallHits.values())].join(", ")}). Screenshots should sell the app, not the subscription.`,
      screens: where,
    });
  }

  return findings;
}
