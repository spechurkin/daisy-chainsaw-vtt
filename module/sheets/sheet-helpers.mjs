const EMPTY_CATALOG = Object.freeze({
  rules: Object.freeze([]),
  weapons: Object.freeze([]),
  gimmicks: Object.freeze([]),
  abilities: Object.freeze([]),
  spells: Object.freeze([]),
  enemyTraits: Object.freeze([]),
  statuses: Object.freeze([]),
  maneuvers: Object.freeze([]),
  tables: Object.freeze([])
});

const CATALOG_GROUPS = Object.freeze(Object.keys(EMPTY_CATALOG));

let catalogApiPromise;
let warnedAboutCatalog = false;

function entriesOf(collection) {
  if (Array.isArray(collection)) return collection;
  if (collection && typeof collection === "object") return Object.values(collection);
  return [];
}

function fallbackGetCatalogEntry(catalog, slug) {
  if (!slug) return null;
  for (const group of Object.values(catalog ?? EMPTY_CATALOG)) {
    const match = entriesOf(group).find((entry) => entry?.slug === slug);
    if (match) return match;
  }
  return null;
}

function normaliseCatalog(catalog) {
  return Object.fromEntries(CATALOG_GROUPS.map((group) => [group, entriesOf(catalog?.[group])]));
}

function fallbackCatalogApi() {
  return {
    available: false,
    CATALOG: EMPTY_CATALOG,
    getCatalogEntry: (slug) => fallbackGetCatalogEntry(EMPTY_CATALOG, slug),
    catalogForActor: () => EMPTY_CATALOG
  };
}

/**
 * Load the rules catalog lazily. Keeping this import dynamic lets sheet development
 * continue before generated catalog data exists, and also tolerates partial exports.
 */
export async function loadCatalogApi() {
  if (!catalogApiPromise) {
    catalogApiPromise = import("../data/catalog.mjs")
      .then((module) => {
        const catalog = module.CATALOG && typeof module.CATALOG === "object"
          ? module.CATALOG
          : EMPTY_CATALOG;
        const getCatalogEntry = typeof module.getCatalogEntry === "function"
          ? module.getCatalogEntry
          : (slug) => fallbackGetCatalogEntry(catalog, slug);
        const catalogForActor = typeof module.catalogForActor === "function"
          ? module.catalogForActor
          : () => catalog;
        return { available: catalog !== EMPTY_CATALOG, CATALOG: catalog, getCatalogEntry, catalogForActor };
      })
      .catch((error) => {
        if (!warnedAboutCatalog) {
          warnedAboutCatalog = true;
          console.warn("Daisy Chainsaw | Rules catalog is unavailable; sheets will use empty lists.", error);
        }
        return fallbackCatalogApi();
      });
  }
  return catalogApiPromise;
}

export async function catalogForActorSafe(actor) {
  const api = await loadCatalogApi();
  try {
    return normaliseCatalog(await api.catalogForActor(actor));
  } catch (error) {
    console.warn("Daisy Chainsaw | Could not filter the catalog for this Actor.", error);
    return normaliseCatalog(api.CATALOG);
  }
}

export async function getCatalogEntrySafe(slug) {
  const api = await loadCatalogApi();
  try {
    return await api.getCatalogEntry(slug) ?? fallbackGetCatalogEntry(api.CATALOG, slug);
  } catch (_error) {
    return fallbackGetCatalogEntry(api.CATALOG, slug);
  }
}

export function collectionForEntry(entry) {
  const kind = String(entry?.kind ?? "").toLowerCase();
  if (kind === "ability" || kind === "abilities") return "abilities";
  if (kind === "spell" || kind === "spells") return "spells";
  if (["enemytrait", "enemy-trait", "trait", "feature"].includes(kind)) return "traits";
  return null;
}

export function catalogGroupLabel(group) {
  const suffix = {
    rules: "Rules",
    weapons: "Weapons",
    gimmicks: "Gimmicks",
    abilities: "Abilities",
    spells: "Spells",
    enemyTraits: "EnemyTraits",
    statuses: "Statuses",
    maneuvers: "Maneuvers",
    tables: "Tables"
  }[group] ?? group;
  const key = `DAISY.RuleBrowser.Group.${suffix}`;
  const translated = game.i18n?.localize?.(key);
  return translated && translated !== key ? translated : group;
}

export function normaliseEntry(entry, fallback = {}) {
  const source = entry && typeof entry === "object" ? entry : {};
  return {
    ...source,
    slug: String(source.slug ?? fallback.slug ?? ""),
    kind: String(source.kind ?? fallback.kind ?? "feature"),
    name: String(source.name ?? fallback.name ?? source.slug ?? fallback.slug ?? "—"),
    description: String(source.description ?? fallback.description ?? ""),
    level: Number(source.level ?? fallback.level ?? 0),
    sourcePage: Number(source.sourcePage ?? fallback.sourcePage ?? 0)
  };
}

export async function selectionSlots(slugs, minimum, kind) {
  const values = Array.isArray(slugs) ? slugs : [];
  const size = Math.max(minimum, values.length);
  const slots = [];
  for (let index = 0; index < size; index += 1) {
    const slug = values[index] ?? "";
    const resolved = slug ? await getCatalogEntrySafe(slug) : null;
    const entry = slug
      ? normaliseEntry(resolved, { slug, name: slug, kind })
      : null;
    slots.push({
      index,
      number: index === 9 ? 0 : index + 1,
      empty: !entry,
      entry,
      slug: entry?.slug ?? "",
      name: entry?.name ?? "",
      description: entry?.description ?? "",
      collection: kind === "spell" ? "spells" : kind === "trait" ? "traits" : "abilities"
    });
  }
  return slots;
}

export function traitRows(traits, minimum = 4) {
  const values = Array.isArray(traits) ? traits : [];
  const size = Math.max(minimum, values.length);
  return Array.from({ length: size }, (_unused, index) => {
    const trait = values[index];
    if (typeof trait === "string") {
      return { index, name: trait, note: "", slug: trait };
    }
    return {
      index,
      name: String(trait?.name ?? ""),
      note: String(trait?.note ?? ""),
      slug: String(trait?.slug ?? "")
    };
  });
}

export function parameterOptions(selected, allowed = ["charm", "focus", "heart", "strength"]) {
  const labels = {
    charm: game.i18n.localize("DAISY.Attributes.Charm"),
    focus: game.i18n.localize("DAISY.Attributes.Focus"),
    heart: game.i18n.localize("DAISY.Attributes.Heart"),
    strength: game.i18n.localize("DAISY.Attributes.Power")
  };
  return [
    { value: "", label: "—", selected: !selected },
    ...allowed.filter((key) => key in labels).map((value) => ({
      value,
      label: labels[value],
      selected: selected === value
    }))
  ];
}

export function weaponOptions(catalog, selected, slot = "main") {
  return [
    { value: "", label: "—", selected: !selected },
    ...entriesOf(catalog?.weapons).map((entry) => ({
      value: entry.slug,
      label: entry.name,
      parameter: slot === "main" ? entry.primary : entry.alternate,
      selected: selected === entry.slug
    }))
  ];
}

export function gimmickOptions(catalog, weaponSlug, selected) {
  const entries = entriesOf(catalog?.gimmicks)
    .filter((entry) => !weaponSlug || entry.weapon === weaponSlug)
    .filter((entry) => entry.subtype === "gimmick" || entry.kind === "gimmick");
  return [
    { value: "", label: "—", selected: !selected },
    ...entries.map((entry) => ({
      value: entry.slug,
      label: entry.name,
      description: entry.description,
      selected: selected === entry.slug
    }))
  ];
}

export function actorStatusRows(actor, catalog) {
  const definitions = [...entriesOf(catalog?.statuses), ...entriesOf(catalog?.maneuvers)];
  return (actor?.system?.statuses ?? []).map((status, index) => {
    const catalogStatus = definitions.find((entry) => entry?.slug === status.id);
    return {
      ...status,
      index,
      beneficial: ["help", "empowered", "invocation", "improvised", "cover"].includes(status.id),
      name: catalogStatus?.name ?? status.id,
      description: catalogStatus?.description ?? status.detail ?? ""
    };
  });
}

export function toDragData(entry) {
  return {
    type: "DaisyCatalogEntry",
    slug: entry.slug,
    kind: entry.kind,
    name: entry.name
  };
}
