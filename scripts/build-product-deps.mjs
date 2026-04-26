import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const HEADER_RE = /^## (.+) — `([a-z][a-z0-9-]*)`$/;
const DEPS_RE = /^\*\*Depends on:\*\* (.+)$/;
const SLUG_TOKEN_RE = /`([a-z][a-z0-9-]*)`/g;

export function parseSections(source) {
  const lines = source.split("\n");
  const sections = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = line.match(HEADER_RE);
    if (headerMatch) {
      if (current) {
        current.endLine = i; // 1-indexed line right before next header
        sections.push(current);
      }
      current = {
        slug: headerMatch[2],
        title: headerMatch[1],
        startLine: i + 1, // 1-indexed line of this header
        endLine: -1,
        dependsOn: [],
      };
      continue;
    }
    if (!current) continue;

    const depsMatch = line.match(DEPS_RE);
    if (depsMatch) {
      const rhs = depsMatch[1].trim();
      if (rhs === "—") {
        current.dependsOn = [];
      } else {
        const found = [...rhs.matchAll(SLUG_TOKEN_RE)].map((m) => m[1]);
        current.dependsOn = [...new Set(found)];
      }
    }
  }

  if (current) {
    current.endLine = lines.length;
    sections.push(current);
  }
  return sections;
}

export function buildIndex(sections) {
  const knownSlugs = new Set(sections.map((s) => s.slug));
  const index = {};

  for (const s of sections) {
    for (const dep of s.dependsOn) {
      if (!knownSlugs.has(dep)) {
        throw new Error(`unknown dep \`${dep}\` in \`${s.slug}\``);
      }
    }
    index[s.slug] = {
      lines: `${s.startLine}-${s.endLine}`,
      dependsOn: [...s.dependsOn],
      dependedOnBy: [],
    };
  }

  for (const s of sections) {
    for (const dep of s.dependsOn) {
      index[dep].dependedOnBy.push(s.slug);
    }
  }

  for (const slug of Object.keys(index)) {
    index[slug].dependedOnBy.sort();
  }

  return index;
}

export function renderJson(index) {
  const sortedKeys = Object.keys(index).sort();
  const sorted = {};
  for (const k of sortedKeys) sorted[k] = index[k];
  return JSON.stringify(sorted, null, 2) + "\n";
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const checkMode = process.argv.includes("--check");
  const productPath = "docs/product.md";
  const outPath = "docs/product-deps.json";

  const source = readFileSync(productPath, "utf8");
  const sections = parseSections(source);
  const index = buildIndex(sections);
  const next = renderJson(index);

  if (checkMode) {
    let current = "";
    try { current = readFileSync(outPath, "utf8"); } catch {}
    if (current !== next) {
      console.error(
        `${outPath} is out of sync with ${productPath}.\n` +
        `Run: node scripts/build-product-deps.mjs`
      );
      process.exit(1);
    }
    console.log(`${outPath} is in sync (${Object.keys(index).length} slugs).`);
  } else {
    writeFileSync(outPath, next);
    console.log(`Wrote ${outPath} (${Object.keys(index).length} slugs).`);
  }
}
