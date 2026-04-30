export function InputPanel(): string {
  return `
    <div class="input-panel">
      <div class="form-group">
        <label for="page-url">Page URL (optional)</label>
        <input
          type="url"
          id="page-url"
          class="text-input"
          placeholder="https://example.com/my-page"
          autocomplete="url"
        />
        <p class="help-text" id="page-url-help">The page you're writing meta tags for. We'll scan it for action words and purpose signals.</p>
      </div>

      <div class="form-group">
        <label for="raw-input">Describe your page</label>
        <textarea
          id="raw-input"
          class="smart-textarea"
          placeholder="Example: This is a whitepaper about AI lead scoring for B2B SaaS marketing directors. It explains how predictive models work and the goal is to get readers to download the full report."
          rows="4"
          aria-describedby="raw-input-help"
        ></textarea>
        <p class="help-text" id="raw-input-help">Include: who it's for, what it's about, the page purpose, and the desired action</p>
      </div>

      <div class="form-group">
        <label for="keywords-input">Target keywords (optional)</label>
        <input
          type="text"
          id="keywords-input"
          class="text-input"
          placeholder="AI lead scoring, B2B SaaS, predictive scoring"
          autocomplete="off"
        />
        <p class="help-text">Separate with commas. The AI will use these in natural variation.</p>
      </div>

      <div class="form-group toggle-group">
        <label class="toggle-label">
          <input type="checkbox" id="serp-toggle" class="toggle-input" />
          <span class="toggle-switch"></span>
          <span class="toggle-text">Research SERP first (searches top-ranking pages for patterns)</span>
        </label>
      </div>

      <button id="generate-btn" class="generate-btn">Generate meta tags</button>
    </div>
  `;
}
