export function LoadingState(): string {
  return `
    <div class="loading-state" aria-busy="true" aria-live="polite" role="status">
      <div class="spinner" aria-hidden="true"></div>
      <p>Generating meta tags&hellip;</p>
    </div>
  `;
}
