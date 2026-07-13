import { getCatalogEntry } from "../data/catalog.mjs";

export class DaisyItem extends Item {
  get catalogEntry() {
    return getCatalogEntry(this.system.slug) ?? {
      slug: this.system.slug,
      kind: this.type,
      name: this.name,
      description: this.system.description,
      level: this.system.level,
      category: this.system.category
    };
  }

  async use() {
    const actor = this.parent?.documentName === "Actor" ? this.parent : null;
    if (!actor) {
      ui.notifications.warn(game.i18n.localize("DAISY.Notifications.UseItemFromActorSheet"));
      return null;
    }
    return actor.useRuleEntry(this.catalogEntry);
  }
}
