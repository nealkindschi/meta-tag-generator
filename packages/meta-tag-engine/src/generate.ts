import type { UserInput, ParsedInput, MetaTagVersion, GenerateResult, SerpResult } from "./types";
import { buildParsePrompt, buildGeneratePrompt, buildRetryPrompt } from "./prompts";
import { buildVersion, scoreVersion } from "./validation";
import { MAX_RETRIES } from "./rules";

type CallAI = (prompt: string, options?: { response_format?: { type: string } }) => Promise<string>;

function stripResponse(response: string): string {
  return response.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
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

export async function generate(
  input: UserInput,
  callAI: CallAI,
  serpData: SerpResult[] | null
): Promise<GenerateResult> {
  const startTime = Date.now();

  const parsePrompt = buildParsePrompt(input.rawInput);
  const parseResponse = await callAI(parsePrompt, { response_format: { type: "json_object" } });
  const parsed: ParsedInput = JSON.parse(stripResponse(parseResponse));

  const generatePrompt = buildGeneratePrompt(
    parsed,
    serpData,
    input.keywords,
    input.titleFormat,
    4
  );

  const genResponse = await callAI(generatePrompt, { response_format: { type: "json_object" } });
  const rawVersions: { title: string; description: string }[] = JSON.parse(stripResponse(genResponse));

  const versions: MetaTagVersion[] = [];
  const failedIndices: number[] = [];

  for (let i = 0; i < rawVersions.length; i++) {
    const raw = rawVersions[i];
    const formattedTitle = humanReadableTitle(raw.title, input.titleFormat);
    const { version, isValid } = buildVersion(formattedTitle, raw.description, input.keywords);
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
        ...versions[i].titleWarnings.filter((w) => w.includes("too long")),
        ...versions[i].descriptionWarnings.filter(
          (w) => w.includes("too long") || w.includes("call to action") || w.includes("Duplicate")
        ),
      ],
    }));

    const retryPrompt = buildRetryPrompt(failedVersions, parsed, input.keywords);
    const retryResponse = await callAI(retryPrompt, { response_format: { type: "json_object" } });
    const retryVersions: { title: string; description: string }[] = JSON.parse(
      stripResponse(retryResponse)
    );

    const newFailedIndices: number[] = [];

    for (let j = 0; j < failedIndices.length; j++) {
      const originalIdx = failedIndices[j];
      const retryRaw = retryVersions[j];

      if (!retryRaw) continue;

      const formattedTitle = humanReadableTitle(retryRaw.title, input.titleFormat);
      const { version, isValid } = buildVersion(
        formattedTitle,
        retryRaw.description,
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
  return callAI(parsePrompt, { response_format: { type: "json_object" } }).then((res) =>
    JSON.parse(stripResponse(res))
  );
}
