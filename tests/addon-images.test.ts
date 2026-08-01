import assert from "node:assert/strict";
import test from "node:test";
import { addonImageUrl } from "../lib/addon-images.ts";

test("uses the compact mirror image URL", () => {
  assert.equal(
    addonImageUrl({ image_url: "https://cdn.example.com/listing.png" }),
    "https://cdn.example.com/listing.png",
  );
});

test("uses Bethesda preview media", () => {
  const result = addonImageUrl({
    preview_image: {
      s3bucket: "ugcmods.bethesda.net",
      s3key: "public/content/ESO/1/bethesda.png",
    },
  });
  assert.ok(result);
  assert.ok(result.startsWith("https://ugcmods.bethesda.net/image/"));
  const payload = JSON.parse(atob(result.split("/").at(-1)!));
  assert.equal(payload.key, "public/content/ESO/1/bethesda.png");
  assert.equal(payload.edits.resize.width, 228);
});

test("uses the first ESOUI gallery image", () => {
  assert.equal(
    addonImageUrl({
      images: ["https://cdn.example.com/esoui.png"],
    }),
    "https://cdn.example.com/esoui.png",
  );
});

test("rejects non-HTTPS image sources", () => {
  assert.equal(addonImageUrl({ image_url: "javascript:alert(1)" }), undefined);
});
