import type { ParsedInput, SerpResult } from "./types";
import {
  TITLE_MAX,
  TITLE_MIN,
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
} from "./rules";

export function buildParsePrompt(rawInput: string): string {
  return `Extract structured information from this page description. Output ONLY a JSON object with NO additional text or explanation. Use this exact format:

{"audience":"...","topic":"...","purpose":"...","action":"...","primaryTopic":"..."}

Fields:
- audience: Who the content is written for
- topic: What the content covers (3-5 words)
- purpose: Why this page exists (educate, convert, inform)
- action: What the user wants visitors to do
- primaryTopic: Core topic for caching (2-4 words, lowercase)

Page description: "${rawInput}"

JSON response:`;
}

export function buildGeneratePrompt(
  parsed: ParsedInput,
  serpData: SerpResult[] | null,
  keywords: string[],
  titleFormat: { position: string; label: string },
  versionCount: number = 4
): string {
  const serpContext = serpData
    ? buildSerpContext(serpData)
    : "";
  const keywordText =
    keywords.length > 0
      ? `Required keywords to incorporate: ${keywords.join(", ")}
Use these in natural variation across titles and descriptions. Never repeat the same keyword phrase verbatim across versions.`
      : "";

  const titleFormatRule = buildTitleFormatRule(titleFormat);

  const system = `You are an expert SEO meta tag writer for enterprise content. Generate ${versionCount} distinct versions of page titles and meta descriptions.

CRITICAL RULES - These are hard requirements, not suggestions:
1. Page title: ${TITLE_MIN}-${TITLE_MAX} characters (at least ${TITLE_MIN}, no more than ${TITLE_MAX}, no exceptions)
2. Meta description: ${DESCRIPTION_MIN}-${DESCRIPTION_MAX} characters (at least ${DESCRIPTION_MIN}, no more than ${DESCRIPTION_MAX}, no exceptions)
3. Description MUST contain a clear call to action (e.g., download, learn, discover, get started, sign up, read)
4. Front-load primary keywords and their natural variations in titles and descriptions
5. Use keyword variations across versions - never repeat identical keyword phrases
6. Each version should take a distinct approach (benefit-driven, question-based, action-oriented, authority)
7. ${titleFormatRule}
8. Write for humans first, search engines second — conversational tone, no keyword stuffing

${keywordText}

PAGE CONTEXT:
- Audience: ${parsed.audience}
- Topic: ${parsed.topic}
- Purpose: ${parsed.purpose}
- Desired Action: ${parsed.action}

${serpContext}

Return ONLY a JSON array. No markdown, no explanation, just the array:
[{"title": "...", "description": "..."}, {"title": "...", "description": "..."}]

Count characters carefully. Any title over ${TITLE_MAX} chars or description over ${DESCRIPTION_MAX} chars = rejection. Output:`;

  return system;
}

function buildTitleFormatRule(format: {
  position: string;
  label: string;
}): string {
  if (format.position === "none" || !format.label) {
    return "No brand prefix or suffix on titles.";
  }
  if (format.position === "prefix") {
    return `Prefix all titles with "${format.label} | " (include the pipe and space).`;
  }
  return `Suffix all titles with " | ${format.label}" (include the pipe and space).`;
}

function buildSerpContext(results: SerpResult[]): string {
  const topResults = results.slice(0, 8);
  const patterns = topResults
    .map(
      (r, i) =>
        `${i + 1}. Title: "${r.title}"\n   Description: "${r.description}"`
    )
    .join("\n");

  return `SERP RESEARCH (patterns from top-ranking pages for this topic):
${patterns}

Use these patterns to inform structure and tone, but create original content. Note which title and description styles appear to rank well.`;
}

export function buildSimulatedSerpPrompt(topic: string): string {
  return `Based on your knowledge of search results for "${topic}", describe what patterns the top 8 ranking pages likely use for their page titles and meta descriptions. Consider: common title structures, typical description formats, calls to action commonly used, keyword placement patterns, and description length tendencies. Be specific and data-like, as if you scraped real results.`;
}

export function buildRetryPrompt(
  failedVersions: { title: string; description: string; failures: string[] }[],
  parsed: ParsedInput,
  keywords: string[]
): string {
  const failureItems = failedVersions
    .map(
      (v, i) =>
        `Version ${i + 1}: "${v.title}" / "${v.description}" — Issues: ${v.failures.join(", ")}`
    )
    .join("\n");

  return `The following meta tag versions failed validation:

${failureItems}

Please regenerate these versions fixing ONLY the issues listed above. Keep the same distinct approaches but ensure:
- Page title: ${TITLE_MIN}-${TITLE_MAX} characters
- Meta description: ${DESCRIPTION_MIN}-${DESCRIPTION_MAX} characters
- Meta description MUST contain a call to action
- Keywords varied across versions: ${keywords.join(", ")}

Context: ${parsed.audience} | ${parsed.topic} | ${parsed.purpose} | ${parsed.action}

Return ONLY valid JSON array with the corrected versions.`;
}
