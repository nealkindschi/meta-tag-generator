---
name: meta-tag-generator
description: Generate optimized page title and meta description pairs for SEO. Ask the user conversational questions about their page, research SERP patterns, and produce 3-4 scored versions with strict validation.
---

# Meta Tag Generator

## When to Use

Use when the user needs:
- Page title and meta description tags for a web page
- Multiple optimized versions to compare
- SEO-validated output with character limits enforced

## Workflow

### 1. Gather information conversationally

Ask the user for:

- **Page URL** (optional, first field) — the URL they are writing meta tags for. If provided, fetch it to extract page purpose and action words from the live page content.
- **Page description** — freeform text describing their page. Include: who the content is for, what it's about, the page's purpose, and the desired visitor action.
- Target keywords (optional, comma-separated)
- Title format preference: prefix (brand first) or suffix (brand at end) with the brand/label text
- Whether to research current SERP patterns first

### 1a. Fetch page URL (if provided)

If the user provides a page URL:
1. Use your built-in web fetch tool to retrieve the page content
2. Extract visible text (strip HTML tags)
3. Scan for action words matching the CTA patterns: download, sign up, buy, schedule, subscribe, get started, learn more, discover, explore, try, start, join, register, book, contact, request, shop, read, watch, find out, see how, begin, access, claim, apply
4. Note the page's apparent purpose from its content
5. Construct a `pageContent` string with: extracted action words + key text excerpt (first ~1000 chars of visible text)
6. Pass `pageUrl` and `pageContent` to the `run()` function in `scripts/generate.ts`
7. If the URL is unreachable, skip gracefully — proceed with user description only

### 2. Research SERP patterns (optional, if user wants)

Use your built-in search tool to search for the topic. Review the top 5-8 results and note patterns in titles and descriptions. Share notable findings with the user before generation.

### 3. Generate meta tags

Call `scripts/generate.ts` with the collected inputs. The script imports `@seotools/meta-tag-engine` and handles:
- Parsing the freeform text into structured fields
- Building the prompt with validation rules
- Generating 3 versions using Workers AI
- Validating each version against strict character limits and SEO rules
- Retrying failed versions
- Returning scored results

Wait for the generation to complete. If Workers AI is unavailable, inform the user.

### 4. Present results

Display each version in a table with:
- Version number
- Page title and character count
- Meta description and character count
- Pass/fail status
- CTA status, keyword variation indicators
- Any warnings

Show the `serpContext` badge indicating data quality (researched/simulated/none).

Let the user copy individual fields or full versions. They can generate again with different inputs if needed.

## Rules

The engine enforces these limits. Do not override them:
- Page title: 50-65 characters (absolute minimum 50, maximum 65)
- Meta description: 140-155 characters (absolute minimum 140, maximum 155)
- Meta description must contain a call to action
- Keywords must vary across versions — no duplicate exact phrases
- Primary keywords should appear early in the page title
- Maximum 2 retries per failed version

## Integration

This skill is part of the `seo-tools-platform` monorepo. The same engine code powers both this skill and the web app at `apps/web/`. When invoking the script from within the project:

```bash
npx tsx skills/meta-tag-generator/scripts/generate.ts
```

Changes to `packages/meta-tag-engine/` affect both interfaces. Keep the engine as the single source of truth.

Deployed web app: https://seo-tools-platform.pages.dev
