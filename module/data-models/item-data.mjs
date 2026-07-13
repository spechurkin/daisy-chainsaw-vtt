import { SCHEMA_VERSION } from "../constants.mjs";

function baseSchema(fields) {
  return {
    schemaVersion: new fields.NumberField({ required: true, nullable: false, initial: SCHEMA_VERSION, min: 1, integer: true }),
    slug: new fields.StringField({ required: true, nullable: false, initial: "" }),
    description: new fields.StringField({ required: true, nullable: false, initial: "" }),
    sourcePage: new fields.NumberField({ required: true, nullable: false, initial: 0, min: 0, integer: true })
  };
}

function requirementsField(fields) {
  return new fields.ArrayField(
    new fields.StringField({ required: true, nullable: false, blank: false }),
    { required: true, nullable: false, initial: [] }
  );
}

export class WeaponItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...baseSchema(fields),
      parameters: new fields.ArrayField(new fields.StringField({ blank: false }), { initial: [] }),
      range: new fields.StringField({ required: true, nullable: false, initial: "close" })
    };
  }
}

export class GimmickItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...baseSchema(fields),
      weapon: new fields.StringField({ required: true, nullable: false, initial: "" }),
      subtype: new fields.StringField({ required: true, nullable: false, initial: "gimmick" })
    };
  }
}

export class AbilityItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...baseSchema(fields),
      weapon: new fields.StringField({ required: true, nullable: false, initial: "" }),
      level: new fields.NumberField({ required: true, nullable: false, initial: 1, min: 1, max: 3, integer: true }),
      category: new fields.StringField({ required: true, nullable: false, initial: "utility" }),
      activation: new fields.StringField({ required: true, nullable: false, initial: "action" }),
      requires: requirementsField(fields),
      passive: new fields.BooleanField({ required: true, nullable: false, initial: false })
    };
  }
}

export class SpellItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...baseSchema(fields),
      level: new fields.NumberField({ required: true, nullable: false, initial: 1, min: 1, max: 3, integer: true }),
      category: new fields.StringField({ required: true, nullable: false, initial: "utility" }),
      activation: new fields.StringField({ required: true, nullable: false, initial: "action" }),
      requires: requirementsField(fields),
      duration: new fields.StringField({
        required: true,
        nullable: false,
        initial: game.i18n.localize("DAISY.Common.OneTurn")
      }),
      area: new fields.StringField({ required: true, nullable: false, initial: "" })
    };
  }
}

export class FeatureItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...baseSchema(fields),
      subtype: new fields.StringField({ required: true, nullable: false, initial: "" }),
      duration: new fields.StringField({ required: true, nullable: false, initial: "" }),
      timing: new fields.StringField({ required: true, nullable: false, initial: "" })
    };
  }
}
