/**
 * Terminal script for the meta-tag-generator skill.
 * Run from the project root: npx tsx skills/meta-tag-generator/scripts/generate.ts
 *
 * This script is invoked by the AI agent when the skill is activated.
 * The agent provides inputs and the callAI function.
 */
import type {
  UserInput,
  GenerateResult,
  MetaTagVersion,
} from "../../../packages/meta-tag-engine/src/index";
import { generate } from "../../../packages/meta-tag-engine/src/index";

interface GenerateInput {
  rawInput: string;
  keywords?: string[];
  titleFormat?: { position: "prefix" | "suffix" | "none"; label: string };
  serpResearch?: boolean;
  pageUrl?: string;
  pageContent?: string;
}

export async function run(
  input: GenerateInput,
  callAI: (
    prompt: string,
    opts?: { response_format?: { type: string } }
  ) => Promise<string>,
  serpData?: { title: string; description: string; url: string }[] | null
): Promise<string> {
  const userInput: UserInput = {
    rawInput: input.rawInput,
    keywords: input.keywords || [],
    titleFormat: input.titleFormat || { position: "none", label: "" },
    serpResearch: input.serpResearch || false,
    pageUrl: input.pageUrl,
    pageContent: input.pageContent,
  };

  const result = await generate(userInput, callAI, serpData || null);
  return formatResult(result, userInput.serpResearch);
}

function formatResult(
  result: GenerateResult,
  serpChecked: boolean
): string {
  const serpLine = serpChecked
    ? `- SERP context: ${result.serpContext}`
    : "";

  const lines = [
    `**${result.versions.length} versions generated** (${result.primaryTopic})`,
    serpLine,
    `Time: ${result.computeTime}ms`,
    "",
  ];

  for (let i = 0; i < result.versions.length; i++) {
    const v = result.versions[i];
    const badge =
      v.badge === "green" ? "✓" : "✗";
    lines.push(`### Version ${i + 1} ${badge}`);
    lines.push(`**Title** (${v.titleLength}/65): ${v.title}`);
    lines.push(
      `**Description** (${v.descriptionLength}/155): ${v.description}`
    );

    const tags: string[] = [];
    if (v.ctaDetected) tags.push("CTA");
    if (v.keywordVariation) tags.push("Variation");
    if (v.keywordsFrontloaded) tags.push("Frontloaded");
    lines.push(`Tags: ${tags.join(", ")}`);

    const allWarnings = [...v.titleWarnings, ...v.descriptionWarnings];
    if (allWarnings.length > 0) {
      lines.push("Warnings:");
      for (const w of allWarnings) {
        lines.push(`  - ${w}`);
      }
    }
    lines.push("");
  }

  return lines.filter(Boolean).join("\n");
}
