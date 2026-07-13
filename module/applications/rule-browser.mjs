import {
  catalogForActorSafe,
  catalogGroupLabel,
  collectionForEntry,
  getCatalogEntrySafe,
  normaliseEntry,
  toDragData
} from "../sheets/sheet-helpers.mjs";
import { rollCatalogTable } from "../rules/tables.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const GROUP_ORDER = Object.freeze([
  "rules",
  "abilities",
  "spells",
  "weapons",
  "gimmicks",
  "enemyTraits",
  "maneuvers",
  "statuses",
  "tables"
]);

function collectionForGroup(group) {
  if (group === "abilities") return "abilities";
  if (group === "spells") return "spells";
  if (group === "enemyTraits") return "traits";
  return null;
}

function selectedSlugs(actor, collection) {
  if (!actor || !collection) return new Set();
  const values = actor.system?.[collection] ?? [];
  return new Set(values.map((entry) => typeof entry === "string" ? entry : entry?.slug).filter(Boolean));
}

function canSelect(actor, group) {
  if (!actor) return false;
  if (group === "abilities" || group === "spells") return actor.type === "heroine" || actor.type === "enemy";
  return group === "enemyTraits" && actor.type === "enemy";
}

function notifyError(error) {
  console.error("Daisy Chainsaw | Rule browser action failed.", error);
  ui.notifications?.error(error?.message ?? game.i18n.localize("DAISY.Notifications.RuleBrowserActionFailed"));
}

export class DaisyRuleBrowser extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "daisy-rule-browser",
    classes: ["daisy-chainsaw", "daisy-rule-browser"],
    position: { width: 900, height: 760 },
    window: {
      title: "Daisy Chainsaw — справочник правил",
      icon: "fa-solid fa-book-open",
      resizable: true,
      minimizable: true,
      contentClasses: ["daisy-browser-window-content"]
    },
    actions: {
      "select-group": this._onSelectGroup,
      "use-entry": this._onUseEntry,
      "roll-table": this._onRollTable,
      "toggle-entry": this._onToggleEntry
    }
  };

  static PARTS = {
    main: {
      template: "systems/daisy-chainsaw/templates/applications/rule-browser.hbs",
      scrollable: [".daisy-browser-results"]
    }
  };

  constructor({ actor = null, activeGroup = null, ...options } = {}) {
    super({
      ...options,
      id: `daisy-rule-browser-${actor?.id ?? foundry.utils.randomID()}`
    });
    this.actor = actor;
    const initialGroup = activeGroup ?? (actor ? "abilities" : "rules");
    this.activeGroup = GROUP_ORDER.includes(initialGroup) ? initialGroup : "rules";
    this.query = "";
  }

  get title() {
    return game.i18n.localize("DAISY.Sheets.RuleBrowser");
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const catalog = await catalogForActorSafe(this.actor);
    const groups = GROUP_ORDER.map((id) => {
      const collection = collectionForGroup(id);
      const selected = selectedSlugs(this.actor, collection);
      const entries = (catalog[id] ?? []).map((source) => {
        const entry = normaliseEntry(source);
        return {
          ...entry,
          selected: selected.has(entry.slug),
          selectable: canSelect(this.actor, id),
          usable: Boolean(this.actor) || entry.kind === "table",
          searchable: `${entry.name} ${entry.slug} ${entry.description}`.toLocaleLowerCase("ru")
        };
      });
      return {
        id,
        label: catalogGroupLabel(id),
        collection,
        active: id === this.activeGroup,
        count: entries.length,
        entries
      };
    });
    const active = groups.find((group) => group.active) ?? groups[0];

    return {
      ...context,
      actor: this.actor,
      actorName: this.actor?.name ?? "",
      hasActor: Boolean(this.actor),
      groups,
      activeGroup: active,
      query: this.query,
      catalogEmpty: groups.every((group) => group.entries.length === 0)
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const search = this.element.querySelector("[data-daisy-browser-search]");
    search?.addEventListener("input", (event) => {
      this.query = event.currentTarget.value;
      this._filterVisibleEntries(this.query);
    });
    this._filterVisibleEntries(this.query);

    for (const element of this.element.querySelectorAll("[data-catalog-drag]")) {
      element.addEventListener("dragstart", (event) => {
        const entry = normaliseEntry({
          slug: element.dataset.slug,
          kind: element.dataset.kind,
          name: element.dataset.name
        });
        event.dataTransfer?.setData("application/x-foundry-data", JSON.stringify(toDragData(entry)));
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "copy";
      });
    }
  }

  _filterVisibleEntries(query) {
    const needle = String(query ?? "").trim().toLocaleLowerCase("ru");
    for (const element of this.element.querySelectorAll("[data-searchable]")) {
      element.hidden = Boolean(needle) && !element.dataset.searchable.includes(needle);
    }
    for (const empty of this.element.querySelectorAll("[data-filter-empty]")) {
      const visible = [...this.element.querySelectorAll("[data-searchable]")]
        .some((element) => !element.hidden);
      empty.hidden = visible;
    }
  }

  static _onSelectGroup(_event, target) {
    this.activeGroup = target.dataset.group;
    return this.render({ force: true });
  }

  static async _onUseEntry(_event, target) {
    try {
      const entry = await getCatalogEntrySafe(target.dataset.slug)
        ?? normaliseEntry({
          slug: target.dataset.slug,
          kind: target.dataset.kind,
          name: target.dataset.name,
          description: target.dataset.description
        });
      if (entry.kind === "table") {
        await rollCatalogTable(entry, { actor: this.actor });
      } else if (this.actor) {
        await this.actor.useRuleEntry(entry);
      } else {
        const name = foundry.utils.escapeHTML(entry.name);
        const description = foundry.utils.escapeHTML(entry.description);
        await ChatMessage.create({
          content: `<article class="daisy-chat-card daisy-rule-card"><header class="daisy-chat-header"><div><p class="daisy-chat-kicker">Daisy Chainsaw</p><h3>${name}</h3></div></header><div class="daisy-chat-content daisy-prose"><p>${description}</p></div></article>`
        });
      }
    } catch (error) {
      notifyError(error);
    }
  }

  static async _onRollTable(_event, target) {
    try {
      const table = await getCatalogEntrySafe(target.dataset.slug);
      if (!table || table.kind !== "table") throw new Error(game.i18n.localize("DAISY.Errors.TableNotFound"));
      await rollCatalogTable(table, { actor: this.actor });
    } catch (error) {
      notifyError(error);
    }
  }

  static async _onToggleEntry(_event, target) {
    if (!this.actor) return;
    try {
      const entry = await getCatalogEntrySafe(target.dataset.slug)
        ?? normaliseEntry({ slug: target.dataset.slug, kind: target.dataset.kind });
      const collection = target.dataset.collection || collectionForEntry(entry);
      if (!collection) return;
      const selected = selectedSlugs(this.actor, collection).has(entry.slug);
      if (selected) await this.actor.removeSelection(collection, entry.slug);
      else await this.actor.addSelection(collection, entry.slug);
      await this.render({ force: true });
    } catch (error) {
      notifyError(error);
    }
  }
}
