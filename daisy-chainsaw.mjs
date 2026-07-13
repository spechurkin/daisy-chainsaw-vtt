import { CATALOG, getCatalogEntry, localizeCatalog } from "./module/data/catalog.mjs";
import { DaisyRuleBrowser } from "./module/applications/rule-browser.mjs";
import { registerChatCards } from "./module/chat/actions.mjs";
import {
  AbilityItemData,
  FeatureItemData,
  GimmickItemData,
  SpellItemData,
  WeaponItemData
} from "./module/data-models/item-data.mjs";
import { EnemyData, HeroineData, TeamData } from "./module/data-models/actor-data.mjs";
import { registerDocumentSheet } from "./module/compat/foundry.mjs";
import { STATUS_DEFINITIONS, SYSTEM_ID, SYSTEM_PATH } from "./module/constants.mjs";
import { DaisyActor } from "./module/documents/actor.mjs";
import { DaisyCombat } from "./module/documents/combat.mjs";
import { DaisyItem } from "./module/documents/item.mjs";
import { migrateWorld } from "./module/migrations/index.mjs";
import {
  DaisyJournal98Sheet,
  DaisyJournalClassicSheet,
  registerJournalStyling
} from "./module/journal.mjs";
import { ensureSystemTranslations, registerTranslationFallback } from "./module/i18n.mjs";
import * as Rules from "./module/rules/core.mjs";
import { processCombatUpdate } from "./module/rules/statuses.mjs";
import { rollCatalogTable } from "./module/rules/tables.mjs";
import { registerSettings } from "./module/settings.mjs";
import {
  DaisyEnemySheet,
  DaisyHeroine98Sheet,
  DaisyHeroineSheet,
  DaisyTeamSheet
} from "./module/sheets/actor-sheets.mjs";
import { DaisyItemSheet } from "./module/sheets/item-sheet.mjs";

registerTranslationFallback();

function registerFonts() {
  CONFIG.fontDefinitions ??= {};
  CONFIG.fontDefinitions.Daydream = {
    editor: false,
    fonts: [
      { urls: [`${SYSTEM_PATH}/assets/fonts/Daydream.ttf`], weight: 400, style: "normal" }
    ]
  };
  CONFIG.fontDefinitions.Iosevka = {
    editor: true,
    fonts: [
      { urls: [`${SYSTEM_PATH}/assets/fonts/Iosevka-Regular.ttc`], weight: 400, style: "normal" },
      { urls: [`${SYSTEM_PATH}/assets/fonts/Iosevka-Regular.ttc`], weight: 400, style: "italic" },
      { urls: [`${SYSTEM_PATH}/assets/fonts/Iosevka-Bold.ttc`], weight: 700, style: "normal" },
      { urls: [`${SYSTEM_PATH}/assets/fonts/Iosevka-Bold.ttc`], weight: 700, style: "italic" },
      { urls: [`${SYSTEM_PATH}/assets/fonts/Iosevka-ExtraBold.ttc`], weight: 800, style: "normal" },
      { urls: [`${SYSTEM_PATH}/assets/fonts/Iosevka-ExtraBold.ttc`], weight: 800, style: "italic" }
    ]
  };
}

function registerHandlebarsHelpers() {
  Handlebars.registerHelper("dcTimes", (count) => Array.from({ length: Number(count) }, (_, index) => index));
  Handlebars.registerHelper("dcEq", (left, right) => left === right);
  Handlebars.registerHelper("dcLookup", (slug) => getCatalogEntry(slug));
  Handlebars.registerHelper("dcAdd", (left, right) => Number(left) + Number(right));
  Handlebars.registerHelper("dcIncludes", (collection, value) => Array.isArray(collection) && collection.includes(value));
  Handlebars.registerHelper("dcLocalize", (key) => game.i18n.localize(key));
  Handlebars.registerHelper("dcFormat", (key, values) => game.i18n.format(key, values?.hash ?? {}));
}

function registerStatusEffects() {
  const coreStatusEffects = [...(CONFIG.statusEffects ?? [])];
  const icons = {
    help: "icons/svg/wing.svg",
    empowered: "icons/svg/shield.svg",
    invocation: "icons/svg/lightning.svg",
    improvised: "icons/svg/upgrade.svg",
    cover: "icons/svg/shield.svg",
    marked: "icons/svg/target.svg",
    burning: "icons/svg/fire.svg",
    charmed: "icons/svg/aura.svg",
    bleeding: "icons/svg/blood.svg",
    broken: "icons/svg/bones.svg",
    entangled: "icons/svg/net.svg",
    poisoned: "icons/svg/poison.svg",
    stunned: "icons/svg/daze.svg",
    taunted: "icons/svg/screaming.svg",
    beyond: "icons/svg/explosion.svg",
    unconscious: "icons/svg/unconscious.svg"
  };
  const systemStatusEffects = Object.entries(STATUS_DEFINITIONS).map(([id, definition]) => ({
    id,
    name: `DAISY.Status.${id}.Name`,
    img: icons[id] ?? "icons/svg/aura.svg",
    flags: {
      [SYSTEM_ID]: {
        managed: true,
        fallbackName: game.i18n.localize(`DAISY.Status.${id}.Name`) || definition.name
      }
    }
  }));
  const defeatedId = CONFIG.specialStatusEffects?.DEFEATED;
  const defeated = defeatedId
    ? coreStatusEffects.find((status) => status.id === defeatedId) ?? {
        id: defeatedId,
        name: "EFFECT.StatusDead",
        img: "icons/svg/skull.svg"
      }
    : null;
  CONFIG.statusEffects = defeated ? [...systemStatusEffects, defeated] : systemStatusEffects;
}

function registerSheets() {
  const ActorDocument = foundry.documents.Actor;
  const ItemDocument = foundry.documents.Item;
  const JournalEntryDocument = foundry.documents.JournalEntry;

  registerDocumentSheet(ActorDocument, SYSTEM_ID, DaisyHeroineSheet, {
    types: ["heroine"],
    makeDefault: true,
    label: "DAISY.Sheets.HeroineClassic"
  });
  registerDocumentSheet(ActorDocument, SYSTEM_ID, DaisyHeroine98Sheet, {
    types: ["heroine"],
    makeDefault: false,
    label: "DAISY.Sheets.Heroine98"
  });
  registerDocumentSheet(ActorDocument, SYSTEM_ID, DaisyEnemySheet, {
    types: ["enemy"],
    makeDefault: true,
    label: "DAISY.Sheets.Enemy"
  });
  registerDocumentSheet(ActorDocument, SYSTEM_ID, DaisyTeamSheet, {
    types: ["team"],
    makeDefault: true,
    label: "DAISY.Sheets.Team"
  });
  registerDocumentSheet(ItemDocument, SYSTEM_ID, DaisyItemSheet, {
    types: ["weapon", "gimmick", "ability", "spell", "condition", "enemyTrait"],
    makeDefault: true,
    label: "DAISY.Sheets.Item"
  });
  registerDocumentSheet(JournalEntryDocument, SYSTEM_ID, DaisyJournalClassicSheet, {
    types: ["base"],
    makeDefault: true,
    label: "DAISY.Sheets.JournalClassic"
  });
  registerDocumentSheet(JournalEntryDocument, SYSTEM_ID, DaisyJournal98Sheet, {
    types: ["base"],
    makeDefault: false,
    label: "DAISY.Sheets.Journal98"
  });
}

Hooks.once("init", () => {
  console.info(`${SYSTEM_ID} | Initializing Daisy Chainsaw`);
  registerSettings();
  registerFonts();
  registerHandlebarsHelpers();
  registerStatusEffects();
  registerChatCards();
  registerJournalStyling();

  CONFIG.Actor.documentClass = DaisyActor;
  CONFIG.Item.documentClass = DaisyItem;
  CONFIG.Combat.documentClass = DaisyCombat;

  CONFIG.Actor.dataModels.heroine = HeroineData;
  CONFIG.Actor.dataModels.enemy = EnemyData;
  CONFIG.Actor.dataModels.team = TeamData;
  CONFIG.Item.dataModels.weapon = WeaponItemData;
  CONFIG.Item.dataModels.gimmick = GimmickItemData;
  CONFIG.Item.dataModels.ability = AbilityItemData;
  CONFIG.Item.dataModels.spell = SpellItemData;
  CONFIG.Item.dataModels.condition = FeatureItemData;
  CONFIG.Item.dataModels.enemyTrait = FeatureItemData;

  CONFIG.Actor.trackableAttributes = {
    heroine: {
      bar: ["resources.damage", "resources.burnout"],
      value: [
        "attributes.charm.value",
        "attributes.focus.value",
        "attributes.heart.value",
        "attributes.strength.value"
      ]
    },
    enemy: { bar: ["resources.damage"], value: ["primary", "secondary", "initiative", "speed"] },
    team: { bar: ["resources.burnout"], value: ["level"] }
  };
  CONFIG.Combat.initiative = { formula: "0", decimals: 2 };

  registerSheets();

  game.daisyChainsaw = {
    catalog: localizeCatalog(CATALOG),
    getCatalogEntry,
    openRuleBrowser: (options = {}) => new DaisyRuleBrowser(options).render({ force: true }),
    rollCatalogTable,
    rules: Rules,
    documents: { DaisyActor, DaisyItem, DaisyCombat },
    sheets: {
      DaisyHeroineSheet,
      DaisyHeroine98Sheet,
      DaisyEnemySheet,
      DaisyTeamSheet,
      DaisyItemSheet,
      DaisyJournalClassicSheet,
      DaisyJournal98Sheet
    }
  };
});

Hooks.once("ready", async () => {
  await ensureSystemTranslations();
  document.body?.classList.add("system-daisy-chainsaw");
  document.documentElement.classList.toggle(
    "daisy-reduce-motion",
    game.settings.get(SYSTEM_ID, "reduceMotion")
  );
  await migrateWorld();
  if (game.user?.isActiveGM) {
    for (const actor of game.actors ?? []) await actor.syncStatusEffects?.();
  }
});

Hooks.on("updateCombat", async (combat, changes) => {
  if (Object.hasOwn(changes, "turn") || Object.hasOwn(changes, "round")) {
    await combat.resetActionsForCurrent?.();
  }
  await processCombatUpdate(combat, changes);
});

Hooks.on("deleteCombat", async (combat) => {
  if (!game.user?.isActiveGM) return;
  for (const combatant of combat.combatants) {
    const actor = combatant.actor;
    if (!actor?.getFlag(SYSTEM_ID, "recoverAfterCombat")) continue;
    await actor.update({ "system.resources.damage.value": 1 });
    await actor.unsetFlag(SYSTEM_ID, "recoverAfterCombat");
  }
});
