import type { UserInput, SerpResult, GenerateResult } from "@seotools/meta-tag-engine";
import { generate, SERP_CACHE_TTL_DAYS, CTA_PATTERNS } from "@seotools/meta-tag-engine";
import { simulateSerpFallback } from "./serp-simulator";

export async function onRequestPost(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const body = await context.request.json();
    const input = validateInput(body);

    const serpData = input.serpResearch
      ? await getSerpData(input, context.env)
      : null;

    if (input.pageUrl) {
      input.pageContent = await fetchPageContent(input.pageUrl);
    }

    const callAI = async (prompt: string): Promise<string> => {
      const result = await context.env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", {
        messages: [{ role: "user", content: prompt }],
      });

      if (typeof result === "string") return result;
      if (typeof (result as Record<string, unknown>).response === "string") {
        return (result as Record<string, string>).response;
      }
      if ((result as Record<string, unknown>).choices) {
        const choices = (result as Record<string, Array<{ message: { content: string } }>>).choices;
        if (choices && choices[0]?.message?.content) {
          return choices[0].message.content;
        }
      }
      return JSON.stringify(result);
    };

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result: GenerateResult = await generate(input, callAI, serpData);

        context.env.DB.prepare(
          `INSERT INTO generations (raw_input, keywords, title_position, title_label, serp_research, page_url)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
          .bind(
            input.rawInput,
            input.keywords.join(","),
            input.titleFormat.position,
            input.titleFormat.label,
            input.serpResearch ? 1 : 0,
            input.pageUrl || ""
          )
          .run()
          .catch(() => {});

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        lastError = err as Error;
      }
    }

    const message = lastError?.message || "Unknown error";
    const status = message.includes("parse") || message.includes("extract") ? 422 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function validateInput(body: unknown): UserInput {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body");
  }
  const b = body as Record<string, unknown>;
  const rawInput = String(b.rawInput || "");
  if (!rawInput.trim()) {
    throw new Error("Please provide a description of your page");
  }
  const keywords = Array.isArray(b.keywords) ? b.keywords.map(String) : [];
  const serpResearch = Boolean(b.serpResearch);
  const pageUrl = typeof b.pageUrl === "string" ? b.pageUrl.trim() : undefined;
  const titleFormat = {
    position: String(
      (b.titleFormat as Record<string, unknown>)?.position || "none"
    ) as "prefix" | "suffix" | "none",
    label: String(
      (b.titleFormat as Record<string, unknown>)?.label || ""
    ),
  };
  return { rawInput, keywords, titleFormat, serpResearch, pageUrl };
}

async function getSerpData(
  input: UserInput,
  env: Env
): Promise<SerpResult[] | null> {
  const cacheKey = `serp:${slugifyTopic(input.rawInput)}`;

  try {
    const cached = await env.SEO_TOOLS_KV.get(cacheKey, "json");
    if (cached) return cached as SerpResult[];
  } catch {
  }

  try {
    const data = await scrapeSerp(input.rawInput, env);
    try {
      await env.SEO_TOOLS_KV.put(cacheKey, JSON.stringify(data), {
        expirationTtl: SERP_CACHE_TTL_DAYS * 86400,
      });
    } catch {
    }
    return data;
  } catch {
  }

  try {
    const data = await scrapeSerp(input.rawInput, env);
    if (data.length > 0) return data;
  } catch {
  }

  try {
    return await simulateSerpFallback(input.rawInput, env);
  } catch {
    return null;
  }
}

async function scrapeSerp(
  topic: string,
  env: Env
): Promise<SerpResult[]> {
  const browser = env.BROWSER;

  const page = await browser.newPage();
  const url = `https://www.google.com/search?q=${encodeURIComponent(topic)}`;

  await page.goto(url, { waitUntil: "networkidle2" });

  const results = await page.evaluate(() => {
    const items: { title: string; description: string; url: string }[] = [];
    const organicResults = document.querySelectorAll(".g");

    for (const el of organicResults) {
      if (items.length >= 10) break;
      const titleEl = el.querySelector("h3");
      const descEl = el.querySelector(".VwiC3b, [data-sncf]");
      const linkEl = el.querySelector("a[href^='http']");

      if (titleEl) {
        items.push({
          title: titleEl.textContent?.trim() || "",
          description: descEl?.textContent?.trim() || "",
          url: linkEl?.getAttribute("href") || "",
        });
      }
    }
    return items;
  });

  await page.close();
  return results.filter((r) => r.title);
}

function slugifyTopic(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 64);
}

async function fetchPageContent(pageUrl: string): Promise<string | undefined> {
  try {
    const res = await fetch(pageUrl, {
      headers: { "User-Agent": "seo-tools-platform/1.0" },
    });
    if (!res.ok) return undefined;
    const html = await res.text();
    const visibleText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
       .replace(/<[^>]*>/g, " ")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 2000);

    if (!visibleText) return undefined;

    const foundActions: string[] = [];
    for (const pattern of CTA_PATTERNS) {
      if (pattern.test(visibleText)) {
         foundActions.push(pattern.source);
      }
    }

    const actionLine = foundActions.length > 0
      ? `Action words found: ${foundActions.join(", ")}`
      : "No specific action words detected.";

    return `Text excerpt: "${visibleText.substring(0, 1000)}"\n${actionLine}`;
  } catch {
    return undefined;
  }
}
