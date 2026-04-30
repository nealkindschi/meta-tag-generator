import type { GenerateResult, MetaTagVersion, UserInput } from "@seotools/meta-tag-engine";

export function ResultsPanel(result: GenerateResult, lastInput?: UserInput): string {
  const serpResearched = result.serpContext !== "none";

  const inputSummary = lastInput
    ? `<div class="input-readback">
        <div class="readback-label">Input summary</div>
        <div class="readback-grid">
          ${lastInput.pageUrl ? `<div class="readback-row"><span class="readback-key">Page URL</span><span class="readback-value">${escapeHtml(lastInput.pageUrl)}</span></div>` : ""}
          <div class="readback-row"><span class="readback-key">Description</span><span class="readback-value">${escapeHtml(lastInput.rawInput)}</span></div>
          ${lastInput.keywords.length ? `<div class="readback-row"><span class="readback-key">Keywords</span><span class="readback-value">${escapeHtml(lastInput.keywords.join(", "))}</span></div>` : ""}
          <div class="readback-row"><span class="readback-key">Researched SERP</span><span class="readback-value">${serpResearched ? "Yes" : "No"}</span></div>
        </div>
      </div>`
    : "";

  return `
    <div class="results-panel" aria-live="polite">
      <div class="results-topbar">
        <button id="back-btn" class="back-btn" aria-label="Back to input">&larr; Back</button>
      </div>

      ${inputSummary}

      <div class="table-container">
        <table class="results-table" role="table">
          <thead>
            <tr>
              <th></th>
              <th>Page title</th>
              <th>Meta description</th>
              <th>Passed</th>
            </tr>
          </thead>
          <tbody>
            ${result.versions.map((v, i) => tableRow(v, i)).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function tableRow(version: MetaTagVersion, index: number): string {
  const statusIcon = version.badge === "green" ? "&#x2713;" : "&#x2717;";
  const statusColor = version.badge === "green" ? "var(--color-success)" : "var(--color-error)";

  const titleIssues = version.titleWarnings.filter(w => w).length;
  const descIssues = version.descriptionWarnings.filter(w => w).length;

  return `
    <tr class="version-row ${version.badge === "green" ? "row-pass" : "row-fail"}">
      <td class="col-index">${index + 1}</td>
      <td class="col-title">
        <div class="cell-value">${escapeHtml(version.title)}</div>
        <div class="cell-meta">
          <span class="char-count ${version.titleValid ? "valid" : "invalid"}">${version.titleValid ? "&#x2713;" : "&#x2717;"} ${version.titleLength}/65</span>
          ${titleIssues > 0 ? `<span class="cell-warnings">${escapeHtml(version.titleWarnings.join("; "))}</span>` : ""}
        </div>
        <button class="copy-small" data-copy="${escapeAttr(version.title)}" aria-label="Copy page title">Copy</button>
      </td>
      <td class="col-desc">
        <div class="cell-value">${escapeHtml(version.description)}</div>
        <div class="cell-meta">
          <span class="char-count ${version.descriptionValid ? "valid" : "invalid"}">${version.descriptionValid ? "&#x2713;" : "&#x2717;"} ${version.descriptionLength}/155</span>
          ${descIssues > 0 ? `<span class="cell-warnings">${escapeHtml(version.descriptionWarnings.join("; "))}</span>` : ""}
        </div>
        <button class="copy-small" data-copy="${escapeAttr(version.description)}" aria-label="Copy meta description">Copy</button>
      </td>
      <td class="col-status">
        <span class="status-icon" style="color:${statusColor}" aria-label="${version.badge === "green" ? "All checks passed" : "Issues found"}">${statusIcon}</span>
      </td>
    </tr>
  `;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(str: string): string {
  return str.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
