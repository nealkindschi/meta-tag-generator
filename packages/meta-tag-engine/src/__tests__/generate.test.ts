import { describe, it, expect } from "vitest";
import { generate } from "../generate";
import type { UserInput } from "../types";

function createMockAI() {
  const desc = "B".repeat(140) + " Download.";
  const callAI = async (prompt: string): Promise<string> => {
    if (prompt.includes("Extract structured information")) {
      return JSON.stringify({
        audience: "Marketing directors",
        topic: "AI lead scoring for B2B SaaS",
        purpose: "Educate and convert",
        action: "Download the whitepaper",
        primaryTopic: "AI lead scoring",
      });
    }

    return JSON.stringify([
      {
        title: "AI Lead Scoring for B2B SaaS: A Complete Guide",
        description: desc,
      },
      {
        title: "What Is AI Lead Scoring? B2B Marketer's Guide",
        description: desc,
      },
      {
        title: "Boost B2B Sales Conversions with Predictive Scoring",
        description: desc,
      },
    ]);
  };

  return { callAI };
}

const baseInput: UserInput = {
  rawInput:
    "A whitepaper about AI lead scoring for marketing directors at B2B SaaS companies. Goal is to get them to download the full guide.",
  keywords: ["AI lead scoring", "B2B SaaS", "predictive scoring"],
  serpResearch: false,
};

describe("generate", () => {
  it("generates 3 versions", async () => {
    const { callAI } = createMockAI();
    const result = await generate(baseInput, callAI, null);

    expect(result.versions).toHaveLength(3);
    expect(result.primaryTopic).toBe("AI lead scoring");
    expect(result.serpContext).toBe("none");
    expect(result.computeTime).toBeDefined();
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
    const badAI = async (_prompt: string): Promise<string> => {
      return JSON.stringify([
        { title: "x".repeat(66), description: "y".repeat(200) },
        { title: "x".repeat(66), description: "y".repeat(200) },
        { title: "x".repeat(66), description: "y".repeat(200) },
      ]);
    };

    const result = await generate(baseInput, badAI, null);

    const failedCount = result.versions.filter(
      (v) => v.title === "I tried and I failed."
    ).length;
    expect(failedCount).toBe(3);
  });

  it("applies title case to titles and preserves acronyms", async () => {
    const callAI = async (prompt: string): Promise<string> => {
      if (prompt.includes("Extract structured information")) {
        return JSON.stringify({
          audience: "Marketing directors",
          topic: "AI lead scoring for B2B SaaS",
          purpose: "Educate and convert",
          action: "Download the whitepaper",
          primaryTopic: "AI lead scoring",
        });
      }
      return JSON.stringify([
        { title: "AI Lead Scoring for B2B SaaS: A Complete Guide", description: "B".repeat(140) + " Download." },
      ]);
    };

    const result = await generate(baseInput, callAI, null);
    const title = result.versions[0].title;

    expect(title).toMatch(/^AI/);
    expect(title).toMatch(/B2B/);
    expect(title).toMatch(/Lead/);
    expect(title).toMatch(/Scoring/);
    expect(title).toMatch(/\bfor\b/);
  });

  it("truncates description at last complete sentence before limit", async () => {
    const callAI = async (prompt: string): Promise<string> => {
      if (prompt.includes("Extract structured information")) {
        return JSON.stringify({
          audience: "Marketing directors",
          topic: "AI lead scoring",
          purpose: "Educate",
          action: "Download the whitepaper",
          primaryTopic: "AI lead scoring",
        });
      }
      const longDesc = "A".repeat(70) + ". Discover " + "B".repeat(65) + ". " + "C".repeat(70) + ".";
      return JSON.stringify([
        { title: "A Comprehensive Guide to AI Lead Scoring Solutions", description: longDesc },
      ]);
    };

    const result = await generate(baseInput, callAI, null);
    const desc = result.versions[0].description;
    const title = result.versions[0].title;

    expect(title).not.toBe("I tried and I failed.");
    expect(desc).not.toBe("I tried and I failed.");
    expect(desc.length).toBeLessThanOrEqual(155);
    expect(desc).toMatch(/\.$/);
    expect(desc).toMatch(/Discover/);
    expect(desc).not.toMatch(/C/);
  });
});
