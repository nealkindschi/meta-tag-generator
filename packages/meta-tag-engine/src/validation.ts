import type { MetaTagVersion } from "./types";
import {
  TITLE_MAX,
  TITLE_MIN,
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  CTA_PATTERNS,
} from "./rules";

function detectCTA(description: string): boolean {
  return CTA_PATTERNS.some((pattern) => pattern.test(description));
}

function checkKeywordVariation(
  title: string,
  description: string,
  keywords: string[]
): boolean {
  if (!keywords || keywords.length < 2) return true;
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description.toLowerCase();
  const used: string[] = [];
  for (const keyword of keywords) {
    const lowerKw = keyword.toLowerCase();
    if (lowerTitle.includes(lowerKw) || lowerDesc.includes(lowerKw)) {
      if (used.some((u) => u === lowerKw)) return false;
      used.push(lowerKw);
    }
  }
  return true;
}

function checkKeywordsFrontloaded(
  title: string,
  keywords?: string[]
): boolean {
  if (!keywords || keywords.length === 0) return true;
  const lowerTitle = title.toLowerCase();
  const titleWords = lowerTitle.split(/\s+/);
  const first5Title = titleWords.slice(0, 5).join(" ");
  return keywords.some((kw) => first5Title.includes(kw.toLowerCase()));
}

function humanizeList(items: string[]): string {
  if (items.length === 0) return "valid";
  if (items.length === 1) return items[0];
  return items.slice(0, -1).join(", ") + ", and " + items[items.length - 1];
}

export function validateTitle(title: string): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  const len = title.length;

  if (len > TITLE_MAX) {
    warnings.push(`title is ${len} characters, must be ≤${TITLE_MAX}`);
  }
  if (len < TITLE_MIN) {
    warnings.push(`title is ${len} characters, must be ≥${TITLE_MIN}`);
  }

  return {
    valid: len >= TITLE_MIN && len <= TITLE_MAX,
    warnings,
  };
}

export function validateDescription(
  description: string,
  keywords?: string[]
): {
  valid: boolean;
  warnings: string[];
  ctaDetected: boolean;
  keywordVariation: boolean;
} {
  const warnings: string[] = [];
  const len = description.length;

  if (len > DESCRIPTION_MAX) {
    warnings.push(`description is ${len} characters, must be ≤${DESCRIPTION_MAX}`);
  }
  if (len < DESCRIPTION_MIN) {
    warnings.push(`description is ${len} characters, must be ≥${DESCRIPTION_MIN}`);
  }

  const ctaDetected = detectCTA(description);
  if (!ctaDetected) {
    warnings.push("no call to action detected");
  }

  const variation = checkKeywordVariation("", description, keywords || []);
  if (!variation) {
    warnings.push("duplicate keyword phrases");
  }

  const valid =
    len >= DESCRIPTION_MIN &&
    len <= DESCRIPTION_MAX &&
    ctaDetected &&
    variation;

  return {
    valid,
    warnings,
    ctaDetected,
    keywordVariation: variation,
  };
}

export interface BuildVersionResult {
  version: MetaTagVersion;
  isValid: boolean;
}

export function buildVersion(
  title: string,
  description: string,
  keywords?: string[]
): BuildVersionResult {
  const titleResult = validateTitle(title);
  const descResult = validateDescription(description, keywords);
  const frontloaded = checkKeywordsFrontloaded(title, keywords);

  const allValid = titleResult.valid && descResult.valid;
  const badge: "green" | "red" = allValid ? "green" : "red";

  return {
    version: {
      title,
      titleLength: title.length,
      titleValid: titleResult.valid,
      titleWarnings: titleResult.warnings,
      description,
      descriptionLength: description.length,
      descriptionValid: descResult.valid,
      descriptionWarnings: descResult.warnings,
      ctaDetected: descResult.ctaDetected,
      keywordVariation: descResult.keywordVariation,
      keywordsFrontloaded: frontloaded,
      badge,
    },
    isValid: allValid,
  };
}
