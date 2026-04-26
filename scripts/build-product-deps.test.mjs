import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSections, buildIndex, renderJson } from "./build-product-deps.mjs";

const SAMPLE = `# Title

prelude

---

## Auth — \`auth\`

**Status:** active
**Owner of:** /login
**Depends on:** —

### Rules and invariants
- foo

---

## Class Booking — \`class-booking\`

**Status:** active
**Owner of:** /classes
**Depends on:** \`auth\`, \`membership-plans\`

### Rules and invariants
- bar
`;

test("parseSections extracts slug, 1-indexed line range, dependsOn", () => {
  const sections = parseSections(SAMPLE);
  assert.equal(sections.length, 2);
  assert.deepEqual(sections[0], {
    slug: "auth",
    title: "Auth",
    startLine: 7,
    endLine: 17,
    dependsOn: [],
  });
  assert.equal(sections[1].slug, "class-booking");
  assert.equal(sections[1].startLine, 18);
  assert.deepEqual(sections[1].dependsOn, ["auth", "membership-plans"]);
});

test("buildIndex computes reverse-deps and section ranges", () => {
  const sections = [
    { slug: "auth", startLine: 1, endLine: 10, dependsOn: [] },
    { slug: "class-booking", startLine: 11, endLine: 20, dependsOn: ["auth", "membership-plans"] },
    { slug: "membership-plans", startLine: 21, endLine: 30, dependsOn: ["auth"] },
  ];
  const index = buildIndex(sections);
  assert.deepEqual(index["auth"].dependedOnBy, ["class-booking", "membership-plans"]);
  assert.deepEqual(index["class-booking"].dependsOn, ["auth", "membership-plans"]);
  assert.equal(index["class-booking"].lines, "11-20");
  assert.deepEqual(index["membership-plans"].dependedOnBy, ["class-booking"]);
});

test("buildIndex throws on unknown slug in dependsOn", () => {
  const sections = [
    { slug: "auth", startLine: 1, endLine: 10, dependsOn: ["nonexistent"] },
  ];
  assert.throws(() => buildIndex(sections), /unknown dep `nonexistent` in `auth`/);
});

test("renderJson sorts top-level keys and ends with newline", () => {
  const index = {
    "z-feature": { lines: "10-20", dependsOn: [], dependedOnBy: [] },
    "a-feature": { lines: "1-9", dependsOn: ["z-feature"], dependedOnBy: [] },
  };
  const out = renderJson(index);
  const parsed = JSON.parse(out);
  assert.deepEqual(Object.keys(parsed), ["a-feature", "z-feature"]);
  assert.match(out, /\n$/);
});
