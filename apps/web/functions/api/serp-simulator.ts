import type { SerpResult } from "@seotools/meta-tag-engine";
import { buildSimulatedSerpPrompt } from "@seotools/meta-tag-engine";

export async function simulateSerpFallback(
  topic: string,
  env: Env
): Promise<SerpResult[]> {
  const prompt = buildSimulatedSerpPrompt(topic);

  const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", {
    messages: [{ role: "user", content: prompt }],
  });

  const text = typeof result === "string" ? result : JSON.stringify(result);

  const pattern = /(?:Title|Pattern)\s*\d+[.:]\s*"([^"]+)"/g;
  const results: SerpResult[] = [];
  let match;

  while ((match = pattern.exec(text)) !== null) {
    results.push({
      title: match[1],
      description: "",
      url: "",
    });
  }

  if (results.length > 0) return results;

  return [
    {
      title: `Best practices for ${topic}`,
      description: `Learn about ${topic} with our comprehensive guide.`,
      url: "",
    },
  ];
}
