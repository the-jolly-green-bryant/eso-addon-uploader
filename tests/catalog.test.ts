import assert from "node:assert/strict";
import test from "node:test";
import { queryCatalog } from "../lib/catalog.ts";
import type { MirrorAddon } from "../lib/mirror.ts";

const addon = (
  source: "bethesda" | "esoui",
  id: string,
  title: string,
  author: string,
): MirrorAddon => ({
  canonical_id: `${source}:${id}`,
  content_id: id,
  title,
  author_displayname: author,
  categories: [source === "esoui" ? "PC Addon" : "Console Addon"],
  source,
});

const addons = [
  addon("esoui", "100", "Alpha Tools", "PC Author"),
  addon("bethesda", "200", "Beta Tools", "Console Author"),
  addon("esoui", "300", "Gamma Tools", "Shared Author"),
  addon("bethesda", "400", "Omega Tools", "Shared Author"),
];

test("paginates one alphabetized catalog across Bethesda and ESOUI", () => {
  const first = queryCatalog(addons, {
    text: "",
    category: "all",
    page: 1,
    size: 2,
  });
  const second = queryCatalog(addons, {
    text: "",
    category: "all",
    page: 2,
    size: 2,
  });

  assert.deepEqual(
    [...first.data, ...second.data].map((entry) => entry.source),
    ["esoui", "bethesda", "esoui", "bethesda"],
  );
  assert.deepEqual(first.sourceTotals, { bethesda: 2, esoui: 2 });
  assert.equal(first.pageCount, 2);
  assert.equal(first.total, 4);
});

test("searches both sources before slicing the requested page", () => {
  const results = queryCatalog(addons, {
    text: "Shared Author",
    category: "all",
    page: 1,
    size: 30,
  });

  assert.deepEqual(
    results.data.map((entry) => entry.source),
    ["esoui", "bethesda"],
  );
  assert.deepEqual(results.sourceTotals, { bethesda: 1, esoui: 1 });
});

test("identifies PC addons through the ESOUI category", () => {
  const results = queryCatalog(addons, {
    text: "",
    category: "PC Addon",
    page: 1,
    size: 30,
  });

  assert.equal(results.total, 2);
  assert.ok(results.data.every((entry) => entry.source === "esoui"));
  assert.deepEqual(results.sourceTotals, { bethesda: 0, esoui: 2 });
});
