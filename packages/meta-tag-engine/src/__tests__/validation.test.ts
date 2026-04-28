import { describe, it, expect } from "vitest";
import { validateTitle, validateDescription, buildVersion, scoreVersion } from "../validation";

describe("validateTitle", () => {
  it("passes titles within limit", () => {
    const result = validateTitle("AI Lead Scoring Guide for B2B SaaS Marketing Teams");
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it("fails title over 65 chars", () => {
    const longTitle = "This is an extremely long page title that goes way beyond the maximum character count allowed for SEO best practices and will definitely cause issues";
    const result = validateTitle(longTitle);
    expect(result.valid).toBe(false);
    expect(result.warnings.some((w) => w.includes("too long"))).toBe(true);
  });

  it("warns on title under 30 chars", () => {
    const result = validateTitle("Short title");
    expect(result.warnings.some((w) => w.includes("too short"))).toBe(true);
  });

  it("warns on title below recommended range", () => {
    const result = validateTitle("AI Lead Scoring for B2B SaaS Guide");
    expect(result.warnings.some((w) => w.includes("below recommended"))).toBe(true);
  });

  it("accepts 65 char title exactly", () => {
    const title = "a".repeat(65);
    expect(validateTitle(title).valid).toBe(true);
  });

  it("rejects 66 char title", () => {
    const title = "a".repeat(66);
    expect(validateTitle(title).valid).toBe(false);
  });
});

describe("validateDescription", () => {
  it("passes valid descriptions with CTA", () => {
    const result = validateDescription(
      "Discover how B2B teams use predictive lead scoring to boost conversions. Learn the AI models and ROI. Download the guide."
    );
    expect(result.valid).toBe(true);
    expect(result.ctaDetected).toBe(true);
  });

  it("fails description over 155 chars", () => {
    const long = "This description is intentionally made to be extremely long and exceeds all reasonable character limits for meta descriptions in search engine results pages so it should definitely fail validation".repeat(2);
    const result = validateDescription(long);
    expect(result.valid).toBe(false);
  });

  it("detects missing CTA", () => {
    const result = validateDescription(
      "B2B lead scoring uses predictive AI to evaluate prospects. Teams can prioritize outreach based on data-driven signals and behavior analysis."
    );
    expect(result.ctaDetected).toBe(false);
    expect(result.warnings.some((w) => w.includes("call to action"))).toBe(true);
  });

  it("accepts 155 char description exactly", () => {
    const desc = "a".repeat(155);
    expect(validateDescription(desc).valid).toBe(true);
  });

  it("rejects 156 char description", () => {
    const desc = "a".repeat(156);
    expect(validateDescription(desc).valid).toBe(false);
  });
});

describe("scoreVersion", () => {
  it("scores green for perfect version", () => {
    const result = scoreVersion(
      "AI Lead Scoring for B2B SaaS Teams | Complete Guide",
      "Explore how AI-powered lead scoring transforms B2B sales pipelines with predictive analytics and machine learning. Start optimizing your team today."
    );
    expect(result.badge).toBe("green");
  });

  it("scores yellow for warnings", () => {
    const result = scoreVersion(
      "Short",
      "B2B teams use AI lead scoring. It helps with prioritization and improves outcomes significantly across the board. Learn more about it here."
    );
    expect(result.badge).toBe("yellow");
  });

  it("scores red for hard failures", () => {
    const result = scoreVersion(
      "This is an extremely long page title that goes way beyond the maximum limit",
      "Way too long description that should trigger a red badge because it exceeds all limits".repeat(5)
    );
    expect(result.badge).toBe("red");
  });
});

describe("buildVersion", () => {
  it("builds a complete version with all fields", () => {
    const { version, isValid } = buildVersion(
      "AI Lead Scoring: A Complete Guide for B2B SaaS Teams",
      "Learn how B2B companies deploy AI lead scoring to prioritize prospects and increase pipeline velocity across sales teams. Download the free guide.",
      ["AI lead scoring", "B2B SaaS", "predictive scoring"]
    );
    expect(version.titleLength).toBe(52);
    expect(version.descriptionLength).toBeGreaterThanOrEqual(145);
    expect(version.badge).toBe("green");
    expect(isValid).toBe(true);
    expect(version.keywordsFrontloaded).toBe(true);
  });

  it("detects invalid version", () => {
    const { version, isValid } = buildVersion(
      "AI Lead Scoring: A Complete Guide for B2B SaaS That Exceeds All Limits".repeat(3),
      "d".repeat(200),
      []
    );
    expect(version.badge).toBe("red");
    expect(isValid).toBe(false);
  });

  it("detects missing CTA", () => {
    const { version, isValid } = buildVersion(
      "Understanding AI Lead Scoring in B2B",
      "B2B companies use AI lead scoring to evaluate prospects and improve efficiency across sales teams.",
      []
    );
    expect(version.ctaDetected).toBe(false);
    expect(isValid).toBe(false);
  });
});
