import type { MirrorAddon } from "./mirror";

export type CatalogSourceTotals = {
  bethesda: number;
  esoui: number;
};

type CatalogQuery = {
  text: string;
  category: string;
  page: number;
  size: number;
};

export function queryCatalog(addons: MirrorAddon[], query: CatalogQuery) {
  const text = query.text.trim().toLocaleLowerCase();
  const category = query.category.toLocaleLowerCase();
  const filtered = addons
    .filter((addon) => !addon.deleted)
    .filter((addon) => {
      if (!text) return true;
      return [
        addon.title,
        addon.overview,
        addon.author_displayname,
        addon.content_id,
        addon.canonical_id,
      ].some((value) => value?.toLocaleLowerCase().includes(text));
    })
    .filter(
      (addon) =>
        category === "all" ||
        addon.categories?.some(
          (entry) => entry.toLocaleLowerCase() === category,
        ),
    )
    .sort((left, right) => left.title.localeCompare(right.title));

  const sourceTotals = filtered.reduce<CatalogSourceTotals>(
    (totals, addon) => {
      totals[addon.source] += 1;
      return totals;
    },
    { bethesda: 0, esoui: 0 },
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / query.size));
  const page = Math.min(query.page, pageCount);
  const offset = (page - 1) * query.size;

  return {
    data: filtered.slice(offset, offset + query.size),
    total: filtered.length,
    sourceTotals,
    page,
    pageCount,
    size: query.size,
  };
}
