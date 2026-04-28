export function InputPanel(): string {
  return `
    <div class="input-panel">
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
        <label for="keywords-input">Target Keywords (optional)</label>
        <input
          type="text"
          id="keywords-input"
          class="text-input"
          placeholder="AI lead scoring, B2B SaaS, predictive scoring"
        />
        <p class="help-text">Separate with commas. The AI will use these in natural variation.</p>
      </div>

      <div class="form-row">
        <div class="form-group form-row-item">
          <label for="format-position">Title Format</label>
          <select id="format-position" class="select-input">
            <option value="none">No label</option>
            <option value="prefix">Prefix</option>
            <option value="suffix">Suffix</option>
          </select>
        </div>
        <div class="form-group form-row-item">
          <label for="format-label">Brand / Label</label>
          <input
            type="text"
            id="format-label"
            class="text-input"
            placeholder="Cloudflare"
          />
        </div>
      </div>

      <div class="form-group toggle-group">
        <label class="toggle-label">
          <input type="checkbox" id="serp-toggle" class="toggle-input" />
          <span class="toggle-switch"></span>
          Research SERP first (searches top-ranking pages for patterns)
        </label>
      </div>

      <button id="generate-btn" class="generate-btn">Generate Meta Tags</button>
    </div>
  `;
}
