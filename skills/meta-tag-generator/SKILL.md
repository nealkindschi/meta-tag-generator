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

Ask the user to describe their page in natural language. They should include: who the content is for, what it's about, the page's purpose, and the desired visitor action. Accept freeform text.

Also ask for:
- Target keywords (optional, comma-separated)
- Title format preference: prefix (brand first) or suffix (brand at end) with the brand/label text
- Whether to research current SERP patterns first

### 2. Research SERP patterns (optional, if user wants)

Use your built-in search tool to search for the topic. Review the top 5-8 results and note patterns in titles and descriptions. Share notable findings with the user before generation.

### 3. Generate meta tags

Call `scripts/generate.ts` with the collected inputs. The script imports `@seotools/meta-tag-engine` and handles:
- Parsing the freeform text into structured fields
- Building the prompt with validation rules
- Generating 3-4 versions using Workers AI
- Validating each version against strict character limits and SEO rules
- Retrying failed versions
- Returning scored results

Wait for the generation to complete. If Workers AI is unavailable, inform the user.

### 4. Present results

Display each version with:
- Title and character count
- Description and character count
- Validation badge (green/yellow/red)
- CTA status, keyword variation, front-loading indicators
- Any warnings

Show the `serpContext` badge indicating data quality (researched/simulated/none).

Let the user copy individual fields or full versions. They can generate again with different inputs if needed.

## Rules

The engine enforces these limits. Do not override them:
- Title: maximum 65 characters
- Description: maximum 155 characters
- Description must contain a call to action
- Keywords must vary across versions — no duplicate exact phrases
- Primary keywords should appear early in the title
- Maximum 2 retries per failed version

## Integration

The same engine code powers both this skill and the web app at `/apps/web/`. Changes to `packages/meta-tag-engine/` affect both interfaces. Keep the engine as the single source of truth.
