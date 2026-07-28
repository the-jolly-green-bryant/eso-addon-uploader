import assert from "node:assert/strict";
import test from "node:test";
import {
  isUuid,
  platformResponse,
  safeExternalHttpsUrl,
  upstreamMessage,
} from "../lib/protocol.ts";

test("validates UUID content identifiers", () => {
  assert.equal(isUuid("2a88cc14-8e8c-4b73-9605-2e1d7c764e23"), true);
  assert.equal(isUuid("../content"), false);
});

test("unwraps Bethesda platform responses", () => {
  assert.deepEqual(platformResponse({ platform: { response: { data: [1] } } }), { data: [1] });
  assert.deepEqual(platformResponse({ data: [1] }), { data: [1] });
});

test("extracts upstream errors without assuming a response shape", () => {
  assert.equal(upstreamMessage({ platform: { message: "Denied" } }), "Denied");
  assert.equal(upstreamMessage(null, "Fallback"), "Fallback");
});

test("accepts public HTTPS URLs and rejects local or credentialed URLs", () => {
  assert.equal(safeExternalHttpsUrl("https://cdn.example.com/file.zip")?.hostname, "cdn.example.com");
  assert.equal(safeExternalHttpsUrl("http://cdn.example.com/file.zip"), null);
  assert.equal(safeExternalHttpsUrl("https://localhost/file.zip"), null);
  assert.equal(safeExternalHttpsUrl("https://user:pass@cdn.example.com/file.zip"), null);
});
