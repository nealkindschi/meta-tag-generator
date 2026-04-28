import type { GenerateResult, MetaTagVersion } from "@seotools/meta-tag-engine";

export function ResultsPanel(result: GenerateResult, serpChecked?: boolean): string {
  const contextBadge = serpChecked
    ? `<span class="context-badge context-${result.serpContext}">SERP: ${result.serpContext}</span>`
    : "";

  return `
    <div class="results-panel" aria-live="polite">
      <div class="results-header">
        <h2>${result.versions.length} Versions Generated</h2>
        ${contextBadge}
      </div>
      <div class="versions-grid" role="list">
        ${result.versions.map((v, i) => VersionCard(v, i)).join("")}
      </div>
      <button id="back-btn" class="secondary-btn">Generate Again</button>
    </div>
  `;
}

function VersionCard(version: MetaTagVersion, index: number): string {
  const badgeColors: Record<string, string> = {
    green: "#16a34a",
    yellow: "#ca8a04",
    red: "#dc2626",
  };

  return `
    <div class="version-card badge-${version.badge}" role="listitem">
      <div class="version-header">
        <span class="version-number">Version ${index + 1}</span>
        <span class="badge" style="background: ${badgeColors[version.badge]}; color: white;" aria-label="${version.badge === "green" ? "All checks passed" : version.badge === "yellow" ? "Minor warnings" : "Issues found"}">
          ${version.badge === "green" ? "&#x2713; Pass" : version.badge === "yellow" ? "&#x26A0; Warnings" : "&#x2717; Issues"}
        </span>
      </div>

      <div class="meta-field">
        <div class="field-header">
          <strong>Title</strong>
          <span class="char-count ${version.titleValid ? "valid" : "invalid"}">${version.titleLength}/65</span>
        </div>
        <p class="version-title">${escapeHtml(version.title)}</p>
        <button class="copy-btn" data-copy="${escapeAttr(version.title)}">Copy</button>
      </div>

      <div class="meta-field">
        <div class="field-header">
          <strong>Description</strong>
          <span class="char-count ${version.descriptionValid ? "valid" : "invalid"}">${version.descriptionLength}/155</span>
        </div>
        <p class="version-description">${escapeHtml(version.description)}</p>
        <div class="field-tags">
          ${version.ctaDetected ? '<span class="tag tag-good">CTA</span>' : '<span class="tag tag-bad">No CTA</span>'}
          ${version.keywordVariation ? '<span class="tag tag-good">Variation</span>' : '<span class="tag tag-bad">Duplicate Keywords</span>'}
          ${version.keywordsFrontloaded ? '<span class="tag tag-good">Frontloaded</span>' : ''}
        </div>
        <button class="copy-btn" data-copy="${escapeAttr(version.description)}">Copy</button>
      </div>

      ${version.titleWarnings.length > 0 || version.descriptionWarnings.length > 0 ? `
        <div class="warnings">
          ${[...version.titleWarnings, ...version.descriptionWarnings]
            .map((w) => `<p class="warning">${escapeHtml(w)}</p>`)
            .join("")}
        </div>
      ` : ""}

      <button class="copy-all-btn">Copy All</button>
    </div>
  `;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(str: string): string {
  return str.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
