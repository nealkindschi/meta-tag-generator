import { describe, it, expect } from "vitest";
import { validateTitle, validateDescription, buildVersion } from "../validation";

describe("validateTitle", () => {
  it("passes title in range 50-65 chars", () => {
    const result = validateTitle("AI Lead Scoring Guide for B2B SaaS Marketing Teams");
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it("fails title over 65 chars", () => {
    const longTitle = "This is an extremely long page title that goes way beyond the maximum character count allowed";
    expect(longTitle.length).toBeGreaterThan(65);
    const result = validateTitle(longTitle);
    expect(result.valid).toBe(false);
  });

  it("fails title under 50 chars", () => {
    const result = validateTitle("Short title is too short here okay");
    expect(result.valid).toBe(false);
  });

  it("accepts 65 char title exactly", () => {
    const title = "a".repeat(65);
    expect(validateTitle(title).valid).toBe(true);
  });

  it("rejects 66 char title", () => {
    const title = "a".repeat(66);
    expect(validateTitle(title).valid).toBe(false);
  });

  it("accepts 50 char title exactly", () => {
    const title = "a".repeat(50);
    expect(validateTitle(title).valid).toBe(true);
  });

  it("rejects 49 char title", () => {
    const title = "a".repeat(49);
    expect(validateTitle(title).valid).toBe(false);
  });
});

describe("validateDescription", () => {
  it("passes description in range 140-155 with CTA", () => {
    const desc = "A".repeat(136) + " Download.";
    expect(desc.length).toBeGreaterThanOrEqual(140);
    expect(desc.length).toBeLessThanOrEqual(155);
    const result = validateDescription(desc);
    expect(result.valid).toBe(true);
    expect(result.ctaDetected).toBe(true);
  });

  it("fails description over 155 chars", () => {
    const long = "This description is intentionally made to be extremely long and exceeds all reasonable character limits for meta descriptions in search engine results pages so it should fail validation".repeat(2);
    const result = validateDescription(long);
    expect(result.valid).toBe(false);
  });

  it("fails description under 140 chars", () => {
    const result = validateDescription("Too short.");
    expect(result.valid).toBe(false);
  });

  it("detects missing CTA", () => {
    const desc = "B2B lead scoring uses predictive AI to evaluate prospects. Teams can prioritize outreach based on data-driven signals and behavior analysis across the board today.";
    const result = validateDescription(desc);
    expect(result.ctaDetected).toBe(false);
    expect(result.valid).toBe(false);
    expect(result.warnings.some((w) => w.includes("call to action"))).toBe(true);
  });

  it("accepts 155 char description with CTA", () => {
    const desc = "A".repeat(140) + " Download here.";
    const result = validateDescription(desc);
    expect(result.ctaDetected).toBe(true);
    expect(result.valid).toBe(true);
  });
});

describe("buildVersion", () => {
  it("builds a valid version", () => {
    const desc = "Learn how B2B companies deploy AI lead scoring to prioritize prospects and increase pipeline velocity across sales teams. Download the guide now.";
    const { version, isValid } = buildVersion(
      "AI Lead Scoring: A Complete Guide for B2B SaaS Teams",
      desc,
      ["AI lead scoring", "B2B SaaS", "predictive scoring"]
    );
    expect(isValid).toBe(true);
  });

  it("detects invalid version with bad title length", () => {
    const desc = "Explore how B2B companies deploy AI lead scoring to prioritize prospects and increase pipeline velocity across sales teams. Download the guide.";
    const { version, isValid } = buildVersion(
      "Short".repeat(30),
      desc,
      []
    );
    expect(version.badge).toBe("red");
    expect(isValid).toBe(false);
  });

  it("fails when CTA is missing", () => {
    const desc = "B2B companies use AI lead scoring to evaluate prospects and improve efficiency across sales teams right now today always.";
    const { version, isValid } = buildVersion(
      "Understanding AI Lead Scoring in B2B SaaS Today",
      desc,
      []
    );
    expect(version.ctaDetected).toBe(false);
    expect(isValid).toBe(false);
  });
});
