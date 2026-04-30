import type { UserInput, GenerateResult } from "@seotools/meta-tag-engine";
import { generateMetaTags } from "./api/client";
import { InputPanel } from "./components/InputPanel";
import { ResultsPanel } from "./components/ResultsPanel";
import { LoadingState } from "./components/LoadingState";
import { ErrorState } from "./components/ErrorState";

type Phase = "input" | "loading" | "results" | "error";

interface AppState {
  phase: Phase;
  lastInput?: UserInput;
  result?: GenerateResult;
  error?: string;
}

let state: AppState = { phase: "input" };

export function App(): string {
  return `
    <div class="app-container">
      <header class="app-header">
        <h1>Meta tag generator</h1>
        <p class="subtitle">Enhance your SEO with free optimized meta tags for your website</p>
      </header>
      <main id="main-content" aria-live="polite" aria-atomic="true">
        ${renderMain()}
      </main>
    </div>
  `;
}

function renderMain(): string {
  switch (state.phase) {
    case "loading":
      return LoadingState();
    case "results":
      return ResultsPanel(state.result!, state.lastInput);
    case "error":
      return ErrorState(state.error!, state.lastInput);
    default:
      return InputPanel();
  }
}

export function initApp(): void {
  const main = document.getElementById("main-content");
  if (!main) return;

  main.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target.closest("#generate-btn")) {
      handleGenerate();
    }
    if (target.closest("#retry-btn") || target.closest("#back-btn")) {
      state = { phase: "input" };
      render();
    }
    if (target.closest(".copy-btn")) {
      const text = target.closest(".copy-btn")?.getAttribute("data-copy") || "";
      navigator.clipboard.writeText(text).then(() => {
        const btn = target.closest(".copy-btn") as HTMLElement;
        btn.textContent = "Copied!";
        setTimeout(() => { btn.textContent = "Copy"; }, 2000);
      });
    }
    if (target.closest(".copy-all-btn")) {
      const card = target.closest(".version-card");
      const title = card?.querySelector(".version-title")?.textContent?.trim() || "";
      const desc = card?.querySelector(".version-description")?.textContent?.trim() || "";
      navigator.clipboard.writeText(`${title}\n${desc}`).then(() => {
        const btn = target.closest(".copy-all-btn") as HTMLElement;
        btn.textContent = "Copied!";
        setTimeout(() => { btn.textContent = "Copy all"; }, 2000);
      });
    }
  });
}

async function handleGenerate(): Promise<void> {
  const pageUrl = (document.getElementById("page-url") as HTMLInputElement)?.value || "";
  const rawInput = (document.getElementById("raw-input") as HTMLTextAreaElement)?.value || "";
  const keywordsStr = (document.getElementById("keywords-input") as HTMLInputElement)?.value || "";
  const serpResearch = (document.getElementById("serp-toggle") as HTMLInputElement)?.checked || false;

  if (!rawInput.trim()) return;

  const input: UserInput = {
    rawInput: rawInput.trim(),
    keywords: keywordsStr.split(",").map((k) => k.trim()).filter(Boolean),
    serpResearch,
    pageUrl: pageUrl.trim() || undefined,
  };

  state = { phase: "loading", lastInput: input };
  render();

  try {
    const result = await generateMetaTags(input);
    state = { phase: "results", result, lastInput: input };
  } catch (err) {
    state = { phase: "error", error: err instanceof Error ? err.message : "Something went wrong", lastInput: input };
  }
  render();
}

export function render(): void {
  const main = document.getElementById("main-content");
  if (main) {
    main.innerHTML = renderMain();
  }
}

setTimeout(initApp, 0);
