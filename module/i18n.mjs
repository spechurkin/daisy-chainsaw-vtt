import { SYSTEM_ID, SYSTEM_PATH } from "./constants.mjs";

const SUPPORTED_LANGUAGES = new Set(["ru", "en"]);
const REQUIRED_KEYS = Object.freeze([
  "DAISY.Name",
  "DAISY.Sheets.Team",
  "DAISY.Combat.Attack",
  "DAISY.Team.Mascot.Appearance",
  "DAISY.RuleBrowser.Title"
]);

async function fetchDictionary(language) {
  const version = encodeURIComponent(globalThis.game?.system?.version ?? "dev");
  const path = `${SYSTEM_PATH}/lang/${language}.json?v=${version}&_=${Date.now()}`;
  const url = foundry.utils.getRoute?.(path) ?? path;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function mergeDictionary(target, dictionary) {
  const expanded = foundry.utils.expandObject(dictionary);
  Object.assign(target, dictionary);
  foundry.utils.mergeObject(target, expanded, {
    inplace: true,
    insertKeys: true,
    insertValues: true,
    overwrite: true,
    recursive: true
  });
}

/**
 * Load the system dictionaries directly if Foundry was started before the
 * manifest gained its languages block. This also makes source hot-reloads
 * deterministic while developing a world on the system.
 */
export async function ensureSystemTranslations() {
  if (REQUIRED_KEYS.every((key) => game.i18n.localize(key) !== key)) return true;
  const requested = String(game.i18n.lang ?? "en").toLowerCase();
  const language = SUPPORTED_LANGUAGES.has(requested) ? requested : "en";
  try {
    const dictionary = await fetchDictionary(language);
    mergeDictionary(game.i18n.translations, dictionary);
    if (language !== "en") {
      const fallback = await fetchDictionary("en");
      mergeDictionary(game.i18n._fallback, fallback);
    }
    const missing = REQUIRED_KEYS.filter((key) => game.i18n.localize(key) === key);
    if (missing.length) throw new Error(`Translations remained unavailable: ${missing.join(", ")}`);
    console.info(`${SYSTEM_ID} | Loaded ${language} translations directly.`);
    return true;
  } catch (error) {
    console.error(`${SYSTEM_ID} | Could not load system translations.`, error);
    return false;
  }
}

export function registerTranslationFallback() {
  Hooks.once("i18nInit", ensureSystemTranslations);
}
