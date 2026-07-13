import { normaliseEntry } from "./sheet-helpers.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

function itemFromSheet(sheet) {
  return sheet.item ?? sheet.document;
}

function optionList(values, selected) {
  return Object.entries(values).map(([value, label]) => ({
    value,
    label,
    selected: value === selected
  }));
}

export class DaisyItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["daisy-chainsaw", "daisy-item-sheet"],
    position: { width: 620, height: 680 },
    window: {
      title: "Daisy Chainsaw — элемент правил",
      icon: "fa-solid fa-file-lines",
      resizable: true,
      minimizable: true,
      contentClasses: ["daisy-item-window-content"]
    },
    form: {
      closeOnSubmit: false,
      submitOnChange: true
    },
    actions: {
      "use-item": this._onUseItem
    }
  };

  static PARTS = {
    main: {
      template: "systems/daisy-chainsaw/templates/items/item.hbs",
      scrollable: [".daisy-item-body"]
    }
  };

  get title() {
    const item = itemFromSheet(this);
    return `${game.i18n.localize("DAISY.Sheets.Item")}: ${item?.name ?? ""}`;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const item = itemFromSheet(this);
    const system = item.system;
    return {
      ...context,
      item,
      document: item,
      system,
      editable: this.isEditable,
      isWeapon: item.type === "weapon",
      isGimmick: item.type === "gimmick",
      isAbility: item.type === "ability",
      isSpell: item.type === "spell",
      isFeature: item.type === "condition" || item.type === "enemyTrait",
      hasLevel: item.type === "ability" || item.type === "spell",
      parametersCsv: Array.isArray(system.parameters) ? system.parameters.join(", ") : "",
      requirementsCsv: Array.isArray(system.requires) ? system.requires.join(", ") : "",
      rangeOptions: optionList({
        close: game.i18n.localize("DAISY.Weapons.Range.Close"),
        ranged: game.i18n.localize("DAISY.Weapons.Range.Ranged")
      }, system.range),
      categoryOptions: optionList({
        damage: game.i18n.localize("DAISY.Ability.Category.Harm"),
        defensive: game.i18n.localize("DAISY.Ability.Category.Defense"),
        familiar: game.i18n.localize("DAISY.Ability.Category.Familiar"),
        passive: game.i18n.localize("DAISY.Ability.Category.Passive"),
        utility: game.i18n.localize("DAISY.Ability.Category.Utility")
      }, system.category),
      activationOptions: optionList({
        action: game.i18n.localize("DAISY.ItemSheet.Activation.Action"),
        passive: game.i18n.localize("DAISY.ItemSheet.Activation.Passive"),
        free: game.i18n.localize("DAISY.ItemSheet.Activation.Free")
      }, system.activation),
      subtypeOptions: optionList({
        gimmick: game.i18n.localize("DAISY.ItemSheet.Subtype.Gimmick"),
        trait: game.i18n.localize("DAISY.ItemSheet.Subtype.Trait")
      }, system.subtype),
      canUse: Boolean(item.parent?.useRuleEntry || globalThis.canvas?.tokens?.controlled?.[0]?.actor?.useRuleEntry)
    };
  }

  _processFormData(event, form, formData) {
    const data = super._processFormData(event, form, formData);
    if (data.system && Object.hasOwn(data.system, "parametersCsv")) {
      data.system.parameters = String(data.system.parametersCsv ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      delete data.system.parametersCsv;
    }
    if (data.system && Object.hasOwn(data.system, "requirementsCsv")) {
      data.system.requires = String(data.system.requirementsCsv ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      delete data.system.requirementsCsv;
    }
    return data;
  }

  static async _onUseItem() {
    const item = itemFromSheet(this);
    const actor = item.parent?.useRuleEntry
      ? item.parent
      : globalThis.canvas?.tokens?.controlled?.[0]?.actor;
    if (!actor?.useRuleEntry) {
      ui.notifications?.warn(game.i18n.localize("DAISY.Notifications.SelectTokenOrOwnedItem"));
      return;
    }
    const entry = normaliseEntry({
      ...item.system,
      slug: item.system.slug || item.id,
      name: item.name,
      kind: item.type
    });
    await actor.useRuleEntry(entry);
  }
}
