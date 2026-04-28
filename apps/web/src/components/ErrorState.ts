import type { UserInput } from "@seotools/meta-tag-engine";

export function ErrorState(message: string, lastInput?: UserInput): string {
  return `
    <div class="error-state" role="alert">
      <div class="error-icon" aria-hidden="true">!</div>
      <h3>Generation failed</h3>
      <p>${escapeHtml(message)}</p>
      <div class="error-actions">
        <button id="retry-btn" class="error-action-btn error-action-primary">Try again</button>
        <button id="back-btn" class="error-action-btn error-action-secondary">Start over</button>
      </div>
    </div>
  `;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
