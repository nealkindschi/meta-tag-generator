import type { MetaTagVersion } from "./types";
import {
  TITLE_MAX,
  TITLE_MIN,
  TITLE_RECOMMENDED_MIN,
  TITLE_RECOMMENDED_MAX,
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  DESCRIPTION_RECOMMENDED_MIN,
  DESCRIPTION_RECOMMENDED_MAX,
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
  description: string,
  keywords?: string[]
): boolean {
  if (!keywords || keywords.length === 0) return true;
  const lowerTitle = title.toLowerCase();
  const titleWords = lowerTitle.split(/\s+/);
  const first5Title = titleWords.slice(0, 5).join(" ");
  return keywords.some((kw) => first5Title.includes(kw.toLowerCase()));
}

function formatKeyword(keyword: string): string {
  return keyword.replace(/\s+/g, " ").trim().toLowerCase();
}

export function validateTitle(title: string, keywords?: string[]): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  const len = title.length;

  if (len > TITLE_MAX) {
    warnings.push(`Title too long (${len}/${TITLE_MAX} chars)`);
  }
  if (len < TITLE_MIN && warnings.length === 0) {
    warnings.push(`Title may be too short (${len} chars)`);
  }
  if (len < TITLE_RECOMMENDED_MIN && len >= TITLE_MIN) {
    warnings.push(`Title below recommended range (${len}/${TITLE_RECOMMENDED_MIN}-${TITLE_RECOMMENDED_MAX} chars)`);
  }

  return {
    valid: len <= TITLE_MAX,
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
    warnings.push(`Description too long (${len}/${DESCRIPTION_MAX} chars)`);
  }
  if (len < DESCRIPTION_MIN && warnings.length === 0) {
    warnings.push(`Description may be too short (${len} chars)`);
  }
  if (len < DESCRIPTION_RECOMMENDED_MIN && len >= DESCRIPTION_MIN) {
    warnings.push(`Description below recommended range (${len}/${DESCRIPTION_RECOMMENDED_MIN}-${DESCRIPTION_RECOMMENDED_MAX} chars)`);
  }

  const ctaDetected = detectCTA(description);
  if (!ctaDetected) {
    warnings.push("No call to action detected in description");
  }

  const keywordVariation = checkKeywordVariation(
    "",
    description,
    keywords
  );
  if (!keywordVariation) {
    warnings.push("Duplicate keyword phrases detected");
  }

  return {
    valid: len <= DESCRIPTION_MAX,
    warnings,
    ctaDetected,
    keywordVariation,
  };
}

export function scoreVersion(
  title: string,
  description: string,
  keywords?: string[]
): { badge: "green" | "yellow" | "red"; allValid: boolean } {
  const titleResult = validateTitle(title, keywords);
  const descResult = validateDescription(description, keywords);

  if (title.length > TITLE_MAX || description.length > DESCRIPTION_MAX) {
    return { badge: "red", allValid: false };
  }

  const hasWarnings =
    titleResult.warnings.length > 0 || descResult.warnings.length > 0;
  return {
    badge: hasWarnings ? "yellow" : "green",
    allValid: !hasWarnings,
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
  const titleResult = validateTitle(title, keywords);
  const descResult = validateDescription(description, keywords);
  const frontloaded = checkKeywordsFrontloaded(title, description, keywords);
  const { badge } = scoreVersion(title, description, keywords);
  const allValid = titleResult.valid && descResult.valid && descResult.ctaDetected && descResult.keywordVariation;

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
