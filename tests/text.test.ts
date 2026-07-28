import assert from "node:assert/strict";
import test from "node:test";
import { decodeHtmlEntities } from "../lib/text.ts";

test("decodes named, decimal, and hexadecimal HTML entities", () => {
  assert.equal(
    decodeHtmlEntities("Fish &amp; Chips &#39;ready&#39; &#x1F41F;"),
    "Fish & Chips 'ready' 🐟",
  );
});

test("leaves unknown entities unchanged", () => {
  assert.equal(decodeHtmlEntities("value &custom;"), "value &custom;");
});
