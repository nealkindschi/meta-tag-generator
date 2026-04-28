import type { UserInput } from "@seotools/meta-tag-engine";

export function ErrorState(message: string, lastInput?: UserInput): string {
  return `
    <div class="error-state">
      <div class="error-icon">!</div>
      <h3>Generation Failed</h3>
      <p>${escapeHtml(message)}</p>
      <div class="error-actions">
        <button id="retry-btn" class="generate-btn">Try Again</button>
        <button id="back-btn" class="secondary-btn">Start Over</button>
      </div>
    </div>
  `;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
