import type { ParsedInput, SerpResult } from "./types";
import {
  TITLE_MAX,
  TITLE_MIN,
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
} from "./rules";

export function buildParsePrompt(rawInput: string, pageContent?: string): string {
  const pageSection = pageContent
    ? `
ACTUAL PAGE CONTENT (fetched from the live page — use this alongside the user description):
${pageContent}`
    : "";

  return `Extract structured information from this page description.${pageContent ? " Blend the user's stated description with what appears on the actual page. Prefer action words and purpose signals found in the page content." : ""} Output ONLY a JSON object with NO additional text or explanation. Use this exact format:

{"audience":"...","topic":"...","purpose":"...","action":"...","primaryTopic":"..."}

Fields:
- audience: Who the content is written for
- topic: What the content covers (3-5 words)
- purpose: Why this page exists (educate, convert, inform)
- action: What the user wants visitors to do${pageContent ? " (prefer CTAs found on the actual page)" : ""}
- primaryTopic: Core topic for caching (2-4 words, lowercase)
${pageSection}
Page description: "${rawInput}"

JSON response:`;
}

export function buildGeneratePrompt(
  parsed: ParsedInput,
  serpData: SerpResult[] | null,
  keywords: string[],
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

  const system = `You are an expert SEO meta tag writer. Generate ${versionCount} distinct page title and meta description pairs.
 
CHARACTER REQUIREMENTS:
- Page title: ${TITLE_MIN}-${TITLE_MAX} characters. Write complete, meaningful titles that end with a noun. Aim for 55-62 characters.
- Meta description: ${DESCRIPTION_MIN}-${DESCRIPTION_MAX} characters. Write exactly 2 complete sentences. The second sentence must be the call to action. Aim for 140-150 characters.
 
TITLE RULES:
- Use title case: capitalize every word except articles (a, an, the), short conjunctions (and, but, or), and short prepositions (in, on, for, to, of, by, with, at, from). Always capitalize the first and last word.
- Every title must end with a noun — never end with an adjective, preposition, or conjunction.
- Front-load primary keywords and their variations in the page title.
- Natural conversational tone. No keyword stuffing.
 
DESCRIPTION RULES:
- Write exactly 2 complete sentences that end with a period.
- The second sentence is the call to action (download, discover, learn, get started, sign up, etc.).
- Never end mid-sentence or with a trailing fragment.
 
OTHER RULES:
- Use different keyword variations across versions — never repeat the exact same keyword phrase
- ${versionCount} distinct approaches: benefit-driven, how-to, authority, question-based
- Conversational tone, no keyword stuffing
 
${keywordText}
 
PAGE CONTEXT:
- Audience: ${parsed.audience}
- Topic: ${parsed.topic}
- Purpose: ${parsed.purpose}
- Desired Action: ${parsed.action}
 
${serpContext}
Output ONLY a JSON array with no other text:
[{"title":"...","description":"..."}]`;

  return system;
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
        `Version ${i + 1}: "${v.title}" (${v.title.length} chars) / "${v.description}" (${v.description.length} chars) — Issues: ${v.failures.join(", ")}`
    )
    .join("\n");

  return `These versions failed validation. Regenerate them, fixing ONLY the listed issues. Keep the same distinct approaches.

${failureItems}

Requirements:
- Page title: ${TITLE_MIN}-${TITLE_MAX} chars. Use title case. End with a noun — never end with an adjective or preposition.
- Meta description: ${DESCRIPTION_MIN}-${DESCRIPTION_MAX} chars. Write exactly 2 sentences. Second sentence must be the call to action. Both sentences must end with a period.
- Keywords: ${keywords.join(", ")}

Page: ${parsed.audience} | ${parsed.topic} | ${parsed.purpose} | ${parsed.action}

Output only a JSON array: [{"title":"...","description":"..."}]`;
}
