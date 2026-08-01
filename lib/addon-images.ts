type UnknownRecord = Record<string, unknown>;

const record = (value: unknown): UnknownRecord | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : undefined;

const httpsUrl = (value: unknown): string | undefined =>
  typeof value === "string" && value.startsWith("https://")
    ? value
    : undefined;

const imageSource = (value: unknown): string | undefined => {
  const direct = httpsUrl(value);
  if (direct) return direct;
  const image = record(value);
  return image ? httpsUrl(image.src) || httpsUrl(image.url) : undefined;
};

const bethesdaImageUrl = (bucket: string, objectKey: string) => {
  const payload = JSON.stringify({
    bucket,
    key: objectKey,
    edits: { resize: { width: 228, fit: "cover" } },
    outputFormat: "webp",
  });
  const bytes = new TextEncoder().encode(payload);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `https://${bucket}/image/${btoa(binary)}`;
};

/** Select the image supplied by Bethesda or ESOUI for an add-on listing. */
export function addonImageUrl(addon: unknown): string | undefined {
  const value = record(addon);
  if (!value) return undefined;
  for (const key of ["image_url", "preview_image_url", "thumbnail_url"]) {
    const direct = httpsUrl(value[key]);
    if (direct) return direct;
  }

  for (const key of ["preview_image", "cover_image"]) {
    const image = record(value[key]);
    const bucket = typeof image?.s3bucket === "string" ? image.s3bucket : "";
    const objectKey = typeof image?.s3key === "string" ? image.s3key : "";
    if (bucket.endsWith(".bethesda.net") && objectKey.startsWith("public/")) {
      return bethesdaImageUrl(bucket, objectKey);
    }
  }

  const media = record(value.media);
  if (media) {
    for (const [containerKey, imageKey] of [
      ["previewImage", "previewImage"],
      ["preview_image", "preview_image"],
      ["coverImage", "mediaImage"],
      ["cover_image", "media_image"],
    ]) {
      const container = record(media[containerKey]);
      const image = record(container?.[imageKey]);
      const resolutions = record(
        image?.additionalResolutions || image?.additional_resolutions,
      );
      const candidate =
        httpsUrl(resolutions?.xsmall) ||
        imageSource(image) ||
        imageSource(container);
      if (candidate) return candidate;
    }
  }

  if (Array.isArray(value.images)) {
    for (const image of value.images) {
      const candidate = imageSource(image);
      if (candidate) return candidate;
    }
  }
  return undefined;
}
