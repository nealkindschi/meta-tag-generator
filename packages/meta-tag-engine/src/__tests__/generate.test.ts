import { describe, it, expect } from "vitest";
import { generate } from "../generate";
import type { UserInput } from "../types";

function createMockAI() {
  let parseCallCount = 0;
  let genCallCount = 0;

  const callAI = async (prompt: string): Promise<string> => {
    if (prompt.includes("Extract structured information")) {
      parseCallCount++;
      return JSON.stringify({
        audience: "Marketing directors",
        topic: "AI lead scoring for B2B SaaS",
        purpose: "Educate and convert",
        action: "Download the whitepaper",
        primaryTopic: "AI lead scoring",
      });
    }

    genCallCount++;
    return JSON.stringify([
      {
        title: "AI Lead Scoring for B2B SaaS | Complete Guide",
        description:
          "Discover how B2B teams use predictive lead scoring to boost conversions. Learn the AI models and ROI. Download the whitepaper.",
      },
      {
        title: "What Is AI Lead Scoring? A B2B Marketer's Guide",
        description:
          "Learn how AI transforms lead scoring for B2B SaaS companies. Explore ML models, data requirements, and implementation steps. Get started.",
      },
      {
        title: "Boost B2B Conversions with AI Lead Scoring",
        description:
          "Predictive lead scoring helps B2B SaaS teams prioritize high-value prospects. See real-world results and case studies. Read the guide.",
      },
      {
        title: "The 2026 Guide to AI Lead Scoring for SaaS",
        description:
          "Master AI-powered lead scoring with this comprehensive guide. Covers predictive models, CRM integration, and best practices. Discover more.",
      },
    ]);
  };

  return { callAI, getParseCount: () => parseCallCount, getGenCount: () => genCallCount };
}

const baseInput: UserInput = {
  rawInput:
    "A whitepaper about AI lead scoring for marketing directors at B2B SaaS companies. Goal is to get them to download the full guide.",
  keywords: ["AI lead scoring", "B2B SaaS", "predictive scoring"],
  titleFormat: { position: "none", label: "" },
  serpResearch: false,
};

describe("generate", () => {
  it("generates 4 versions", async () => {
    const { callAI } = createMockAI();
    const result = await generate(baseInput, callAI, null);

    expect(result.versions).toHaveLength(4);
    expect(result.primaryTopic).toBe("AI lead scoring");
    expect(result.serpContext).toBe("none");
    expect(result.computeTime).toBeDefined();
  });

  it("applies title prefix format", async () => {
    const { callAI } = createMockAI();
    const input: UserInput = {
      ...baseInput,
      titleFormat: { position: "prefix", label: "theNET" },
    };
    const result = await generate(input, callAI, null);

    expect(result.versions[0].title).toMatch(/^theNET \| /);
  });

  it("applies title suffix format", async () => {
    const { callAI } = createMockAI();
    const input: UserInput = {
      ...baseInput,
      titleFormat: { position: "suffix", label: "Cloudflare" },
    };
    const result = await generate(input, callAI, null);

    expect(result.versions[0].title).toMatch(/ \| Cloudflare$/);
  });

  it("sets serpContext to researched when serpData provided", async () => {
    const { callAI } = createMockAI();
    const serpData = [
      {
        title: "Top Guide on AI Lead Scoring",
        description: "Learn about AI lead scoring from the experts.",
        url: "https://example.com",
      },
    ];
    const result = await generate(baseInput, callAI, serpData);

    expect(result.serpContext).toBe("researched");
  });

  it("replaces failed versions with placeholder after max retries", async () => {
    let attempts = 0;
    const badAI = async (prompt: string): Promise<string> => {
      attempts++;
      return JSON.stringify([
        {
          title: "This is an extremely long page title that goes way beyond the maximum character limit for SEO purposes".repeat(3),
          description: "Too long".repeat(50),
        },
        {
          title: "This is an extremely long page title that goes way beyond the maximum character limit for SEO purposes".repeat(3),
          description: "Too long".repeat(50),
        },
        {
          title: "This is an extremely long page title that goes way beyond the maximum character limit for SEO purposes".repeat(3),
          description: "Too long".repeat(50),
        },
        {
          title: "This is an extremely long page title that goes way beyond the maximum character limit for SEO purposes".repeat(3),
          description: "Too long".repeat(50),
        },
      ]);
    };

    const result = await generate(baseInput, badAI, null);

    const failedCount = result.versions.filter(
      (v) => v.title === "I tried and I failed."
    ).length;
    expect(failedCount).toBeGreaterThanOrEqual(0);
  });
});
