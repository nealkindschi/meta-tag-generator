import type { UserInput, ParsedInput, MetaTagVersion, GenerateResult, SerpResult } from "./types";
import { buildParsePrompt, buildGeneratePrompt, buildRetryPrompt } from "./prompts";
import { buildVersion } from "./validation";
import { MAX_RETRIES, VERSION_COUNT, TITLE_MAX, TITLE_MIN, DESCRIPTION_MAX, DESCRIPTION_MIN } from "./rules";

type CallAI = (prompt: string, options?: { response_format?: { type: string } }) => Promise<string>;

function stripResponse(response: string): string {
  let text = response
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/```\s*$/, "")
    .trim();

  const bracketMatch = (open: string, close: string): string | null => {
    let depth = 0;
    let start = -1;
    let inString = false;
    let escape = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"' && !escape) {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === open) {
        if (start === -1) start = i;
        depth++;
      } else if (ch === close) {
        depth--;
        if (depth === 0 && start !== -1) return text.substring(start, i + 1);
      }
    }
    return null;
  };

  if (text.startsWith("[")) {
    const match = bracketMatch("[", "]");
    return match || text;
  }
  if (text.startsWith("{")) {
    const match = bracketMatch("{", "}");
    return match || text;
  }

  const arrayResult = bracketMatch("[", "]");
  if (arrayResult) return arrayResult;

  const objResult = bracketMatch("{", "}");
  if (objResult) return objResult;

  return text;
}

function safeParseJson<T>(raw: string): T {
  let text = stripResponse(raw);

  try {
    return JSON.parse(text) as T;
  } catch {
    text = text
      .replace(/,(\s*[}\]])/g, "$1")
      .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')
      .replace(/[\r\n]+\s*$/g, "");
    try {
      return JSON.parse(text) as T;
    } catch {
      text = text.replace(/[\x00-\x1f\x7f-\x9f]/g, "");
      return JSON.parse(text) as T;
    }
  }
}

function humanReadableTitle(
  title: string,
  format: { position: string; label: string }
): string {
  const trimmed = format.label
    ? title
        .replace(new RegExp(`^${format.label}\\s*\\|\\s*`, "i"), "")
        .replace(new RegExp(`\\s*\\|\\s*${format.label}$`, "i"), "")
        .trim()
    : title;
  const formatPrefix = format.position === "prefix" && format.label ? `${format.label} | ` : "";
  const formatSuffix = format.position === "suffix" && format.label ? ` | ${format.label}` : "";
  return `${formatPrefix}${trimmed}${formatSuffix}`;
}

function trimToMax(text: string, max: number, isTitle = false): string {
  if (text.length <= max) return text;

  if (isTitle) {
    const atBoundary = text.lastIndexOf(" ", max);
    return atBoundary > 0 ? text.substring(0, atBoundary) : text.substring(0, max);
  }

  const sentenceBoundaries = [". ", "! ", "? ", ".\" ", "!\" ", "?\""];
  for (const boundary of sentenceBoundaries) {
    const idx = text.lastIndexOf(boundary, max);
    if (idx > max * 0.5) {
      return text.substring(0, idx + boundary.length - 1).trimEnd();
    }
  }

  const atComma = text.lastIndexOf(", ", max);
  if (atComma > max * 0.6) {
    return text.substring(0, atComma).trimEnd();
  }

  const atWord = text.lastIndexOf(" ", max);
  return atWord > 0 ? text.substring(0, atWord).trimEnd() : text.substring(0, max);
}

function padTitle(title: string): string {
  if (title.length >= TITLE_MIN) return title;
  const fillers = [
    " - A Complete Guide",
    " | Comprehensive Overview",
    " for Business Leaders",
    " in 2026",
    ": Key Strategies",
    " and Best Practices",
  ];
  for (const filler of fillers) {
    const candidate = title + filler;
    if (candidate.length >= TITLE_MIN && candidate.length <= TITLE_MAX) return candidate;
  }
  return title;
}

function padDescription(desc: string): string {
  if (desc.length >= DESCRIPTION_MIN) return desc;
  const fillers = [
    " Learn more and get started today.",
    " Download our comprehensive guide to discover actionable insights.",
    " Read the full report to explore best practices and real-world results.",
    " Get expert strategies and start optimizing your approach now.",
  ];
  for (const filler of fillers) {
    const candidate = desc + filler;
    if (candidate.length >= DESCRIPTION_MIN && candidate.length <= DESCRIPTION_MAX) return candidate;
  }
  return desc + " Learn more today.";
}

export async function generate(
  input: UserInput,
  callAI: CallAI,
  serpData: SerpResult[] | null
): Promise<GenerateResult> {
  const startTime = Date.now();

  const parsePrompt = buildParsePrompt(input.rawInput);
  const parseResponse = await callAI(parsePrompt);
  const parsed: ParsedInput = safeParseJson<ParsedInput>(parseResponse);

  const generatePrompt = buildGeneratePrompt(
    parsed,
    serpData,
    input.keywords,
    input.titleFormat,
    VERSION_COUNT
  );

  const genResponse = await callAI(generatePrompt);
  const rawVersions = safeParseJson<{ title: string; description: string }[]>(genResponse);

  const versions: MetaTagVersion[] = [];
  const failedIndices: number[] = [];

  for (let i = 0; i < rawVersions.length; i++) {
    const raw = rawVersions[i];
    const formattedTitle = padTitle(trimToMax(humanReadableTitle(raw.title, input.titleFormat), TITLE_MAX, true));
    const trimmedDesc = padDescription(trimToMax(raw.description, DESCRIPTION_MAX));
    const { version, isValid } = buildVersion(formattedTitle, trimmedDesc, input.keywords);
    versions.push(version);
    if (!isValid) {
      failedIndices.push(i);
    }
  }

  for (let retry = 0; retry < MAX_RETRIES && failedIndices.length > 0; retry++) {
    const failedVersions = failedIndices.map((i) => ({
      title: versions[i].title,
      description: versions[i].description,
      failures: [
        ...versions[i].titleWarnings,
        ...versions[i].descriptionWarnings,
      ],
    }));

    const retryPrompt = buildRetryPrompt(failedVersions, parsed, input.keywords);
    const retryResponse = await callAI(retryPrompt);
    const retryVersions = safeParseJson<{ title: string; description: string }[]>(retryResponse);

    const newFailedIndices: number[] = [];

    for (let j = 0; j < failedIndices.length; j++) {
      const originalIdx = failedIndices[j];
      const retryRaw = retryVersions[j];

      if (!retryRaw) continue;

      const formattedTitle = padTitle(trimToMax(humanReadableTitle(retryRaw.title, input.titleFormat), TITLE_MAX, true));
      const { version, isValid } = buildVersion(
        formattedTitle,
        padDescription(trimToMax(retryRaw.description, DESCRIPTION_MAX)),
        input.keywords
      );
      versions[originalIdx] = version;
      if (!isValid) {
        newFailedIndices.push(originalIdx);
      }
    }

    failedIndices.length = 0;
    failedIndices.push(...newFailedIndices);
  }

  for (const idx of failedIndices) {
    versions[idx] = {
      title: "I tried and I failed.",
      titleLength: 22,
      titleValid: false,
      titleWarnings: ["Could not generate a valid title"],
      description: "I tried and I failed.",
      descriptionLength: 22,
      descriptionValid: false,
      descriptionWarnings: ["Could not generate a valid description"],
      ctaDetected: false,
      keywordVariation: false,
      keywordsFrontloaded: false,
      badge: "red",
    };
  }

  return {
    versions,
    serpContext: serpData ? "researched" : "none",
    primaryTopic: parsed.primaryTopic || parsed.topic,
    computeTime: Date.now() - startTime,
  };
}

export function parseRawInput(
  rawInput: string,
  callAI: CallAI
): Promise<ParsedInput> {
  const parsePrompt = buildParsePrompt(rawInput);
  return callAI(parsePrompt).then((res) =>
    safeParseJson<ParsedInput>(res)
  );
}
