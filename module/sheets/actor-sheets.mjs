import { DaisyRuleBrowser } from "../applications/rule-browser.mjs";
import { validateHeroineBuild } from "../rules/character-creation.mjs";
import { postDaisyNotice } from "../dice/daisy-roll.mjs";
import { rollCatalogTable } from "../rules/tables.mjs";
import {
  actorStatusRows,
  catalogForActorSafe,
  collectionForEntry,
  getCatalogEntrySafe,
  gimmickOptions,
  normaliseEntry,
  parameterOptions,
  selectionSlots,
  traitRows,
  weaponOptions
} from "./sheet-helpers.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

const ATTRIBUTE_KEYS = Object.freeze({
  charm: "DAISY.Attributes.Charm",
  focus: "DAISY.Attributes.Focus",
  heart: "DAISY.Attributes.Heart",
  strength: "DAISY.Attributes.Power"
});

function attributeLabels() {
  return Object.fromEntries(Object.entries(ATTRIBUTE_KEYS).map(([key, label]) => [key, game.i18n.localize(label)]));
}

function actorFromSheet(sheet) {
  return sheet.actor ?? sheet.document;
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function notifyError(error) {
  console.error("Daisy Chainsaw | Sheet action failed.", error);
  ui.notifications?.error(
    error?.message ?? game.i18n.localize("DAISY.Notifications.SheetActionFailed")
  );
}

function activeCombatants() {
  return (canvas?.tokens?.placeables ?? [])
    .filter((token) => token.actor && !token.document?.hidden)
    .filter((token) => !token.combatant?.defeated)
    .map((token) => token.actor);
}

async function buildHeroineContext(actor, slotCount) {
  const system = actor.system;
  const catalog = await catalogForActorSafe(actor);
  const statistics = actor.statistics ?? {};
  const labels = attributeLabels();
  const attributes = Object.entries(labels).map(([key, label]) => ({
    key,
    label,
    value: number(system.attributes?.[key]?.value, 1)
  }));
  const mainWeapon = system.weapons?.main ?? {};
  const reserveWeapon = system.weapons?.reserve ?? {};
  const mainEntry = await getCatalogEntrySafe(mainWeapon.slug);
  const reserveEntry = await getCatalogEntrySafe(reserveWeapon.slug);
  const originalWeaponStats = game.settings.get("daisy-chainsaw", "weaponStatRule") === "original";
  const abilityEntries = (await Promise.all((system.abilities ?? []).map((slug) => getCatalogEntrySafe(slug)))).filter(Boolean);
  const levelTwoUnlock = Number(game.settings.get("daisy-chainsaw", "levelTwoUnlock") ?? 4);
  const build = validateHeroineBuild({
    attributes: system.attributes,
    weapons: system.weapons,
    abilities: abilityEntries,
    spells: system.spells ?? [],
    teamLevel: actor.effectiveLevel ?? system.level,
    levelTwoUnlock,
    weaponStatRule: originalWeaponStats ? "original" : "russian"
  });
  const teams = (game.actors?.contents ?? []).filter((candidate) => candidate.type === "team");

  return {
    catalogAvailable: Object.values(catalog).some((entries) => entries.length),
    attributes,
    mainWeapon,
    reserveWeapon,
    mainWeaponOptions: weaponOptions(catalog, mainWeapon.slug, "main"),
    reserveWeaponOptions: weaponOptions(catalog, reserveWeapon.slug, "reserve"),
    mainGimmickOptions: gimmickOptions(catalog, mainWeapon.slug, mainWeapon.gimmick),
    reserveGimmickOptions: gimmickOptions(catalog, reserveWeapon.slug, reserveWeapon.gimmick),
    mainParameterOptions: parameterOptions(
      mainWeapon.parameter,
      originalWeaponStats ? [mainEntry?.primary].filter(Boolean) : (mainEntry?.parameters ?? Object.keys(labels))
    ),
    reserveParameterOptions: parameterOptions(
      reserveWeapon.parameter,
      originalWeaponStats ? [reserveEntry?.alternate].filter(Boolean) : (reserveEntry?.parameters ?? Object.keys(labels))
    ),
    originalWeaponStats,
    teams: [
      { value: "", label: game.i18n.localize("DAISY.Team.Unlinked"), selected: !system.teamUuid },
      ...teams.map((team) => ({ value: team.uuid, label: team.name, selected: team.uuid === system.teamUuid }))
    ],
    build,
    buildSummary: [...build.errors, ...build.warnings].join("\n"),
    hasBeyond: actor.hasStatus?.("beyond") ?? false,
    traits: traitRows(system.traits, 4),
    abilities: await selectionSlots(system.abilities, slotCount, "ability"),
    spells: await selectionSlots(system.spells, slotCount, "spell"),
    maneuvers: catalog.maneuvers,
    statusOptions: catalog.statuses,
    statuses: actorStatusRows(actor, catalog),
    level: number(actor.effectiveLevel ?? system.level, 1),
    damage: number(system.resources?.damage?.value),
    damageMaximum: number(statistics.damageMaximum, 1),
    burnout: number(actor.burnoutValue ?? system.resources?.burnout?.value),
    burnoutMaximum: number(statistics.burnoutMaximum, 10),
    speed: number(statistics.speed),
    primary: number(statistics.primary),
    secondary: number(statistics.secondary, 1)
  };
}

export class DaisyBaseActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["daisy-chainsaw", "daisy-actor-sheet"],
    position: { width: 1196, height: 875 },
    window: {
      icon: "fa-solid fa-star",
      resizable: true,
      minimizable: true,
      contentClasses: ["daisy-sheet-window-content"]
    },
    form: {
      closeOnSubmit: false,
      submitOnChange: true
    },
    actions: {
      "roll-attack": this._onRollAttack,
      "roll-save": this._onRollSave,
      "roll-initiative": this._onRollInitiative,
      "roll-check": this._onRollCheck,
      "adjust-damage": this._onAdjustDamage,
      "adjust-burnout": this._onAdjustBurnout,
      "go-beyond": this._onGoBeyond,
      "use-rule-entry": this._onUseRuleEntry,
      "remove-selection": this._onRemoveSelection,
      "open-rule-browser": this._onOpenRuleBrowser,
      "choose-portrait": this._onChoosePortrait,
      "remove-status": this._onRemoveStatus,
      "window-minimize": this._onWindowMinimize,
      "window-maximize": this._onWindowMaximize,
      "window-close": this._onWindowClose,
      "use-maneuver": this._onUseManeuver,
      "extend-beyond": this._onExtendBeyond,
      "roll-move": this._onRollMove,
      "new-episode": this._onNewEpisode,
      "roll-table": this._onRollTable,
      "add-status": this._onAddStatus,
      "open-member": this._onOpenMember
    }
  };

  get title() {
    const actor = actorFromSheet(this);
    const key = this.constructor.TITLE_KEY ?? "DAISY.Sheets.HeroineClassic";
    return `${game.i18n.localize(key)}: ${actor?.name ?? ""}`;
  }

  _processFormData(event, form, formData) {
    const data = super._processFormData(event, form, formData);
    const actor = actorFromSheet(this);
    if (actor.type !== "heroine") return data;

    const originalWeaponStats = game.settings.get("daisy-chainsaw", "weaponStatRule") === "original";
    if (originalWeaponStats && data.system?.weapons) {
      for (const slot of ["main", "reserve"]) {
        const weapon = data.system.weapons[slot];
        if (!weapon?.slug) continue;
        const entry = game.daisyChainsaw?.getCatalogEntry?.(weapon.slug);
        const parameter = slot === "main" ? entry?.primary : entry?.alternate;
        if (parameter) weapon.parameter = parameter;
      }
    }
    const teamUuid = data.system?.teamUuid;
    if (teamUuid !== undefined) {
      const team = (game.actors?.contents ?? []).find((candidate) => candidate.uuid === teamUuid);
      data.system.teamName = team?.name ?? "";
    }
    return data;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = actorFromSheet(this);
    const catalog = await catalogForActorSafe(actor);
    const actionsRemaining = game.combat?.actionsRemaining?.(actor) ?? null;
    return {
      ...context,
      actor,
      document: actor,
      system: actor.system,
      statistics: actor.statistics ?? {},
      statuses: actorStatusRows(actor, catalog),
      actionsRemaining,
      actionsTracked: actionsRemaining !== null,
      editable: this.isEditable,
      isOwner: actor.isOwner
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const dropZone = this.element.querySelector(".daisy-sheet-canvas, .daisy-panel-sheet");
    if (!dropZone || !this.isEditable) return;
    dropZone.addEventListener("dragover", (event) => {
      if (event.dataTransfer?.types?.includes("application/x-foundry-data")) event.preventDefault();
    });
    dropZone.addEventListener("drop", (event) => this._onCatalogDrop(event));
  }

  async _onCatalogDrop(event) {
    let data;
    try {
      data = TextEditor.getDragEventData(event);
    } catch (_error) {
      try {
        data = JSON.parse(event.dataTransfer?.getData("application/x-foundry-data") ?? "{}");
      } catch (_ignored) {
        return;
      }
    }

    let entry = null;
    if (data?.type === "DaisyCatalogEntry") {
      entry = await getCatalogEntrySafe(data.slug) ?? normaliseEntry(data);
    } else if (data?.type === "Item") {
      try {
        const item = await Item.implementation.fromDropData(data);
        entry = item
          ? normaliseEntry({ ...item.system, slug: item.system.slug || item.id, name: item.name, kind: item.type })
          : null;
      } catch (_error) {
        entry = null;
      }
    }
    if (!entry) return;

    const actor = actorFromSheet(this);
    const collection = collectionForEntry(entry);
    const validTraitDrop = collection === "traits" && actor.type === "enemy";
    if (!collection || (collection === "traits" && !validTraitDrop)) return;

    event.preventDefault();
    event.stopPropagation();
    await actor.addSelection(collection, entry.slug);
  }

  static async _onRollAttack(_event, target) {
    try {
      await actorFromSheet(this).rollAttack({
        label: target.dataset.label || game.i18n.localize("DAISY.Combat.BasicAttack")
      });
    } catch (error) {
      notifyError(error);
    }
  }

  static async _onRollSave(_event, target) {
    try {
      await actorFromSheet(this).rollSave({
        sourceSuccesses: number(target.dataset.sourceSuccesses),
        sourceLevel: number(target.dataset.sourceLevel, 1),
        label: target.dataset.label || game.i18n.localize("DAISY.Combat.Save")
      });
    } catch (error) {
      notifyError(error);
    }
  }

  static async _onRollInitiative() {
    try {
      await actorFromSheet(this).rollInitiativeCheck();
    } catch (error) {
      notifyError(error);
    }
  }

  static async _onRollCheck(_event, target) {
    try {
      const actor = actorFromSheet(this);
      const attribute = target.dataset.attribute;
      const threshold = attribute
        ? number(actor.system.attributes?.[attribute]?.value, 1)
        : number(target.dataset.threshold, actor.statistics?.secondary ?? 1);
      const pool = number(
        target.dataset.pool,
        actor.statistics?.primary ?? actor.system.attributes?.strength?.value ?? 1
      );
      await actor.rollCustomCheck({
        pool,
        threshold,
        label: target.dataset.label || attributeLabels()[attribute] || game.i18n.localize("DAISY.Actions.RollCheck")
      });
    } catch (error) {
      notifyError(error);
    }
  }

  static async _onAdjustDamage(_event, target) {
    try {
      await actorFromSheet(this).adjustDamage(number(target.dataset.delta));
    } catch (error) {
      notifyError(error);
    }
  }

  static async _onAdjustBurnout(_event, target) {
    try {
      await actorFromSheet(this).adjustBurnout(number(target.dataset.delta));
      await this.render({ force: true });
    } catch (error) {
      notifyError(error);
    }
  }

  static async _onGoBeyond() {
    try {
      const actors = activeCombatants();
      const heroines = actors.filter((actor) => actor.type === "heroine" && !actor.hasStatus?.("unconscious")
        && Number(actor.system.resources?.damage?.value ?? 0) > 0);
      const enemies = actors.filter((actor) => actor.type === "enemy");
      await actorFromSheet(this).goBeyond({
        enemyCount: enemies.length,
        consciousHeroineCount: heroines.length,
        bossPresent: enemies.some((actor) => actor.system?.boss)
      });
    } catch (error) {
      notifyError(error);
    }
  }

  static async _onUseRuleEntry(_event, target) {
    try {
      const entry = await getCatalogEntrySafe(target.dataset.slug)
        ?? normaliseEntry({
          slug: target.dataset.slug,
          name: target.dataset.name,
          kind: target.dataset.kind,
          description: target.dataset.description
        });
      await actorFromSheet(this).useRuleEntry(entry);
    } catch (error) {
      notifyError(error);
    }
  }

  static async _onRemoveSelection(event, target) {
    event.stopPropagation();
    try {
      await actorFromSheet(this).removeSelection(target.dataset.collection, target.dataset.slug);
    } catch (error) {
      notifyError(error);
    }
  }

  static _onOpenRuleBrowser(_event, target) {
    const browser = new DaisyRuleBrowser({
      actor: actorFromSheet(this),
      activeGroup: target.dataset.collection
    });
    return browser.render({ force: true });
  }

  static async _onChoosePortrait() {
    const actor = actorFromSheet(this);
    const FilePickerClass = foundry.applications?.apps?.FilePicker?.implementation
      ?? globalThis.FilePicker;
    if (!FilePickerClass) return;
    const picker = new FilePickerClass({
      type: "image",
      current: actor.img,
      callback: (path) => actor.update({ img: path })
    });
    await picker.render({ force: true });
  }

  static async _onRemoveStatus(_event, target) {
    try {
      await actorFromSheet(this).removeStatus(target.dataset.statusId);
    } catch (error) {
      notifyError(error);
    }
  }

  static async _onUseManeuver(_event, target) {
    try {
      const actor = actorFromSheet(this);
      const maneuver = await getCatalogEntrySafe(target.dataset.slug);
      if (!maneuver) throw new Error(game.i18n.localize("DAISY.Errors.RuleNotFound"));
      if (typeof actor.useManeuver === "function") return actor.useManeuver(maneuver);
      const selected = [...(game.user?.targets ?? [])][0]?.actor;
      const recipient = ["help", "cover"].includes(maneuver.slug) ? selected : actor;
      if (!recipient) throw new Error(game.i18n.localize("DAISY.Errors.NoTarget"));
      if (maneuver.slug === "help" && recipient.hasStatus?.("unconscious")) {
        return recipient.receiveHelpWhileUnconscious();
      }
      await recipient.addStatus(maneuver.slug, {
        remaining: 1,
        durationUnit: "round",
        stacks: 1,
        sourceUuid: actor.uuid,
        sourceName: actor.name,
        detail: maneuver.description
      });
      await postDaisyNotice({ actor, title: maneuver.name, content: `<p>${maneuver.description}</p>`, cssClass: "maneuver" });
    } catch (error) {
      notifyError(error);
    }
  }

  static async _onExtendBeyond(_event, target) {
    try {
      await actorFromSheet(this).extendBeyond(target.dataset.statusId);
    } catch (error) {
      notifyError(error);
    }
  }

  static async _onRollMove() {
    try {
      const actor = actorFromSheet(this);
      if (!await actor.spendAction?.(1, game.i18n.localize("DAISY.Combat.Move"))) return;
      const speed = number(actor.statistics?.speed);
      await postDaisyNotice({
        actor,
        title: game.i18n.localize("DAISY.Combat.Move"),
        content: `<p>${game.i18n.format("DAISY.Combat.MoveDistance", { speed, distance: speed * 5 })}</p>`,
        cssClass: "move"
      });
    } catch (error) {
      notifyError(error);
    }
  }

  static async _onNewEpisode() {
    try {
      const actor = actorFromSheet(this);
      if (actor.type !== "team") return;
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: game.i18n.localize("DAISY.Team.NewEpisode") },
        content: `<p>${game.i18n.localize("DAISY.Team.NewEpisodeConfirm")}</p>`
      });
      if (!confirmed) return;
      await actor.setBurnout(0);
      const members = (game.actors?.contents ?? []).filter((candidate) => candidate.type === "heroine"
        && candidate.system.teamUuid === actor.uuid);
      for (const member of members) {
        await member.update({ "system.resources.scarUsed": false });
        await member.unsetFlag("daisy-chainsaw", "recoverAfterCombat");
      }
      ui.notifications?.info(game.i18n.localize("DAISY.Notifications.EpisodeReset"));
    } catch (error) {
      notifyError(error);
    }
  }

  static async _onRollTable(_event, target) {
    try {
      const table = await getCatalogEntrySafe(target.dataset.slug);
      await rollCatalogTable(table, { actor: actorFromSheet(this) });
    } catch (error) {
      notifyError(error);
    }
  }

  static async _onAddStatus(_event, target) {
    try {
      const statusId = target.dataset.statusId
        || target.closest(".daisy-status-panel")?.querySelector("[data-daisy-status-select]")?.value;
      if (!statusId) return;
      await actorFromSheet(this).addStatus(statusId, {
        remaining: number(target.dataset.remaining, 1),
        durationUnit: target.dataset.durationUnit || "round"
      });
    } catch (error) {
      notifyError(error);
    }
  }

  static async _onOpenMember(_event, target) {
    try {
      const actor = globalThis.fromUuidSync?.(target.dataset.actorUuid)
        ?? await globalThis.fromUuid?.(target.dataset.actorUuid);
      return actor?.sheet?.render?.(true);
    } catch (error) {
      notifyError(error);
    }
  }

  static _onWindowMinimize() {
    return this.minimize();
  }

  static _onWindowMaximize() {
    return this.maximize();
  }

  static _onWindowClose() {
    return this.close();
  }
}

class DaisyHeroineSheetBase extends DaisyBaseActorSheet {
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return {
      ...context,
      ...(await buildHeroineContext(context.actor, this.constructor.SLOT_COUNT))
    };
  }
}

export class DaisyHeroineSheet extends DaisyHeroineSheetBase {
  static SLOT_COUNT = 9;
  static TITLE_KEY = "DAISY.Sheets.HeroineClassic";

  static DEFAULT_OPTIONS = {
    classes: ["daisy-heroine-sheet", "daisy-heroine-classic"],
    position: { width: 1196, height: 875 },
    window: { title: "Daisy Chainsaw — лист персонажа" }
  };

  static PARTS = {
    main: { template: "systems/daisy-chainsaw/templates/actors/heroine-classic.hbs" }
  };
}

export class DaisyHeroine98Sheet extends DaisyHeroineSheetBase {
  static SLOT_COUNT = 10;
  static TITLE_KEY = "DAISY.Sheets.Heroine98";

  static DEFAULT_OPTIONS = {
    classes: ["daisy-heroine-sheet", "daisy-heroine-98"],
    position: { width: 1196, height: 875 },
    window: { title: "Daisy Chainsaw — лист персонажа 98'" }
  };

  static PARTS = {
    main: { template: "systems/daisy-chainsaw/templates/actors/heroine-98.hbs" }
  };
}

export class DaisyEnemySheet extends DaisyBaseActorSheet {
  static TITLE_KEY = "DAISY.Sheets.Enemy";
  static DEFAULT_OPTIONS = {
    classes: ["daisy-enemy-sheet"],
    position: { width: 720, height: 720 },
    window: { title: "Daisy Chainsaw — противник" }
  };

  static PARTS = {
    main: {
      template: "systems/daisy-chainsaw/templates/actors/enemy.hbs",
      scrollable: [".daisy-panel-body"]
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = context.actor;
    const catalog = await catalogForActorSafe(actor);
    return {
      ...context,
      level: number(actor.system.level),
      primary: number(actor.statistics?.primary),
      secondary: number(actor.statistics?.secondary),
      initiative: number(actor.statistics?.initiative),
      speed: number(actor.statistics?.speed),
      damage: number(actor.system.resources?.damage?.value),
      damageMaximum: number(actor.statistics?.damage, actor.system.resources?.damage?.max),
      traits: await selectionSlots(actor.system.traits, 0, "trait"),
      spells: await selectionSlots(actor.system.spells, 0, "spell"),
      statuses: actorStatusRows(actor, catalog),
      statusOptions: catalog.statuses
    };
  }
}

export class DaisyTeamSheet extends DaisyBaseActorSheet {
  static TITLE_KEY = "DAISY.Sheets.Team";
  static DEFAULT_OPTIONS = {
    classes: ["daisy-team-sheet"],
    position: { width: 720, height: 680 },
    window: { title: "Daisy Chainsaw — команда" }
  };

  static PARTS = {
    main: {
      template: "systems/daisy-chainsaw/templates/actors/team.hbs",
      scrollable: [".daisy-panel-body"]
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = context.actor;
    const catalog = await catalogForActorSafe(actor);
    const members = (game.actors?.contents ?? [])
      .filter((candidate) => candidate.type === "heroine")
      .filter((candidate) => candidate.system.teamUuid === actor.uuid
        || (!candidate.system.teamUuid && candidate.system.teamName === actor.name))
      .map((candidate) => ({
        id: candidate.id,
        uuid: candidate.uuid,
        name: candidate.name,
        img: candidate.img,
        damage: number(candidate.system.resources?.damage?.value),
        damageMaximum: number(candidate.statistics?.damageMaximum, 1)
      }));
    return {
      ...context,
      members,
      level: number(actor.system.level, 1),
      burnout: number(actor.system.resources?.burnout?.value),
      burnoutMaximum: number(actor.statistics?.burnoutMaximum, 10),
      mascotTables: catalog.tables.filter((table) => table.group === "mascot"),
      episodeTables: catalog.tables.filter((table) => table.group === "episode")
    };
  }
}
