import { describe, it, expect } from "vitest";
import {
  buildParsePrompt,
  buildGeneratePrompt,
  buildRetryPrompt,
  buildSimulatedSerpPrompt,
} from "../prompts";

describe("buildParsePrompt", () => {
  it("includes the raw input in the prompt", () => {
    const prompt = buildParsePrompt("A guide about AI lead scoring for marketing directors who want to download a whitepaper");
    expect(prompt).toContain("marketing directors");
    expect(prompt).toContain("whitepaper");
    expect(prompt).toContain("audience");
    expect(prompt).toContain("topic");
    expect(prompt).toContain("purpose");
    expect(prompt).toContain("action");
  });
});

describe("buildGeneratePrompt", () => {
  const parsed = {
    audience: "Marketing directors",
    topic: "AI lead scoring for B2B SaaS",
    purpose: "Educate and convert",
    action: "Download the whitepaper",
    primaryTopic: "AI lead scoring",
  };

  it("includes hard character limits", () => {
    const prompt = buildGeneratePrompt(parsed, null, [], { position: "none", label: "" });
    expect(prompt).toContain("50-65");
    expect(prompt).toContain("140-155");
    expect(prompt).toContain("no exceptions");
  });

  it("includes keywords when provided", () => {
    const prompt = buildGeneratePrompt(
      parsed,
      null,
      ["AI lead scoring", "predictive scoring"],
      { position: "none", label: "" }
    );
    expect(prompt).toContain("AI lead scoring");
    expect(prompt).toContain("predictive scoring");
  });

  it("includes SERP context when provided", () => {
    const prompt = buildGeneratePrompt(
      parsed,
      [{ title: "Example Title", description: "Example desc", url: "https://example.com" }],
      [],
      { position: "none", label: "" }
    );
    expect(prompt).toContain("SERP RESEARCH");
    expect(prompt).toContain("Example Title");
  });

  it("handles prefix title format", () => {
    const prompt = buildGeneratePrompt(
      parsed,
      null,
      [],
      { position: "prefix", label: "theNET" }
    );
    expect(prompt).toContain('"theNET | "');
  });

  it("handles suffix title format", () => {
    const prompt = buildGeneratePrompt(
      parsed,
      null,
      [],
      { position: "suffix", label: "Cloudflare" }
    );
    expect(prompt).toContain('" | Cloudflare"');
  });

  it("handles no title format", () => {
    const prompt = buildGeneratePrompt(
      parsed,
      null,
      [],
      { position: "none", label: "" }
    );
    expect(prompt).toContain("No brand prefix or suffix");
  });
});

describe("buildSimulatedSerpPrompt", () => {
  it("includes the topic", () => {
    const prompt = buildSimulatedSerpPrompt("AI lead scoring");
    expect(prompt).toContain("AI lead scoring");
    expect(prompt).toContain("top 8 ranking pages");
  });
});

describe("buildRetryPrompt", () => {
  it("includes the failed versions and their issues", () => {
    const prompt = buildRetryPrompt(
      [
        {
          title: "Bad Title That Is Way Too Long And Goes On Forever",
          description: "Short",
          failures: ["Title too long (101/65 chars)", "No call to action detected"],
        },
      ],
      {
        audience: "Marketers",
        topic: "AI lead scoring",
        purpose: "Educate",
        action: "Download",
        primaryTopic: "AI lead scoring",
      },
      ["AI lead scoring"]
    );
    expect(prompt).toContain("Title too long");
    expect(prompt).toContain("No call to action");
    expect(prompt).toContain("AI lead scoring");
  });
});
