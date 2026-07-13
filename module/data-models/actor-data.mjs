import { ATTRIBUTES, SCHEMA_VERSION } from "../constants.mjs";
import { applyEnemyTraits, enemyStatistics, heroineStatistics } from "../rules/core.mjs";

function attributeField(fields) {
  return new fields.SchemaField({
    value: new fields.NumberField({ required: true, nullable: false, initial: 1, min: 1, max: 6, integer: true })
  });
}

function weaponSlotField(fields) {
  return new fields.SchemaField({
    slug: new fields.StringField({ required: true, nullable: false, initial: "" }),
    parameter: new fields.StringField({ required: true, nullable: false, initial: "" }),
    gimmick: new fields.StringField({ required: true, nullable: false, initial: "" }),
    notes: new fields.StringField({ required: true, nullable: false, initial: "" })
  });
}

function selectionField(fields) {
  return new fields.ArrayField(
    new fields.StringField({ required: true, nullable: false, blank: false }),
    { required: true, nullable: false, initial: [] }
  );
}

function notesRowsField(fields) {
  return new fields.ArrayField(
    new fields.SchemaField({
      name: new fields.StringField({ required: true, nullable: false, initial: "" }),
      note: new fields.StringField({ required: true, nullable: false, initial: "" })
    }),
    { required: true, nullable: false, initial: [] }
  );
}

function statusesField(fields) {
  return new fields.ArrayField(
    new fields.SchemaField({
      id: new fields.StringField({ required: true, nullable: false, blank: false }),
      remaining: new fields.NumberField({ required: true, nullable: false, initial: 1, min: 0, integer: true }),
      durationUnit: new fields.StringField({ required: true, nullable: false, initial: "round" }),
      stacks: new fields.NumberField({ required: true, nullable: false, initial: 1, min: 1, integer: true }),
      sourceLevel: new fields.NumberField({ required: true, nullable: false, initial: 1, min: 0, integer: true }),
      sourceSuccesses: new fields.NumberField({ required: true, nullable: false, initial: 0, min: 0, integer: true }),
      sourceUuid: new fields.StringField({ required: true, nullable: false, initial: "" }),
      sourceName: new fields.StringField({ required: true, nullable: false, initial: "" }),
      sources: new fields.ArrayField(
        new fields.SchemaField({
          uuid: new fields.StringField({ required: true, nullable: false, blank: false }),
          remaining: new fields.NumberField({ required: true, nullable: false, initial: 1, min: 0, integer: true })
        }),
        { required: true, nullable: false, initial: [] }
      ),
      detail: new fields.StringField({ required: true, nullable: false, initial: "" })
    }),
    { required: true, nullable: false, initial: [] }
  );
}

export class HeroineData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      schemaVersion: new fields.NumberField({ required: true, nullable: false, initial: SCHEMA_VERSION, min: 1, integer: true }),
      teamUuid: new fields.StringField({ required: true, nullable: false, initial: "" }),
      teamName: new fields.StringField({ required: true, nullable: false, initial: "" }),
      level: new fields.NumberField({ required: true, nullable: false, initial: 1, min: 1, max: 10, integer: true }),
      attributes: new fields.SchemaField(Object.fromEntries(
        Object.keys(ATTRIBUTES).map((key) => [key, attributeField(fields)])
      )),
      weapons: new fields.SchemaField({
        main: weaponSlotField(fields),
        reserve: weaponSlotField(fields)
      }),
      abilities: selectionField(fields),
      spells: selectionField(fields),
      traits: notesRowsField(fields),
      statuses: statusesField(fields),
      resources: new fields.SchemaField({
        damage: new fields.SchemaField({
          value: new fields.NumberField({ required: true, nullable: false, initial: 3, min: 0, integer: true }),
          max: new fields.NumberField({ required: true, nullable: false, initial: 3, min: 1, integer: true })
        }),
        burnout: new fields.SchemaField({
          value: new fields.NumberField({ required: true, nullable: false, initial: 0, min: 0, integer: true }),
          max: new fields.NumberField({ required: true, nullable: false, initial: 10, min: 1, integer: true })
        }),
        scarUsed: new fields.BooleanField({ required: true, nullable: false, initial: false })
      }),
      biography: new fields.StringField({ required: true, nullable: false, initial: "" }),
      notes: new fields.StringField({ required: true, nullable: false, initial: "" })
    };
  }

  get primaryKey() {
    return this.weapons.main.parameter;
  }

  get secondaryKey() {
    return this.weapons.reserve.parameter;
  }

  get statistics() {
    return heroineStatistics({
      attributes: this.attributes,
      primaryKey: this.primaryKey,
      level: this.level
    });
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    const statistics = this.statistics;
    this.resources.damage.max = statistics.damageMaximum;
    this.resources.burnout.max = statistics.burnoutMaximum;
  }
}

export class EnemyData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      schemaVersion: new fields.NumberField({ required: true, nullable: false, initial: SCHEMA_VERSION, min: 1, integer: true }),
      level: new fields.NumberField({ required: true, nullable: false, initial: 1, min: 0, max: 10, integer: true }),
      useLevelDefaults: new fields.BooleanField({ required: true, nullable: false, initial: true }),
      boss: new fields.BooleanField({ required: true, nullable: false, initial: false }),
      primary: new fields.NumberField({ required: true, nullable: false, initial: 2, min: 0, integer: true }),
      secondary: new fields.NumberField({ required: true, nullable: false, initial: 2, min: 0, integer: true }),
      initiative: new fields.NumberField({ required: true, nullable: false, initial: 1, min: 0, integer: true }),
      speed: new fields.NumberField({ required: true, nullable: false, initial: 1, min: 0, integer: true }),
      resources: new fields.SchemaField({
        damage: new fields.SchemaField({
          value: new fields.NumberField({ required: true, nullable: false, initial: 3, min: 0, integer: true }),
          max: new fields.NumberField({ required: true, nullable: false, initial: 3, min: 1, integer: true })
        })
      }),
      traits: selectionField(fields),
      spells: selectionField(fields),
      statuses: statusesField(fields),
      notes: new fields.StringField({ required: true, nullable: false, initial: "" })
    };
  }

  get statistics() {
    if (this.useLevelDefaults) return enemyStatistics(this.level, { traits: this.traits });
    const source = this._source ?? {};
    return applyEnemyTraits({
      primary: source.primary ?? this.primary,
      secondary: source.secondary ?? this.secondary,
      initiative: source.initiative ?? this.initiative,
      speed: source.speed ?? this.speed,
      damage: source.resources?.damage?.max ?? this.resources.damage.max
    }, this.traits);
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    if (this.useLevelDefaults) this.resources.damage.max = this.statistics.damage;
  }
}

export class TeamData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      schemaVersion: new fields.NumberField({ required: true, nullable: false, initial: SCHEMA_VERSION, min: 1, integer: true }),
      level: new fields.NumberField({ required: true, nullable: false, initial: 1, min: 1, max: 10, integer: true }),
      resources: new fields.SchemaField({
        burnout: new fields.SchemaField({
          value: new fields.NumberField({ required: true, nullable: false, initial: 0, min: 0, integer: true }),
          max: new fields.NumberField({ required: true, nullable: false, initial: 10, min: 1, integer: true })
        })
      }),
      mascot: new fields.SchemaField({
        appearance: new fields.StringField({ required: true, nullable: false, initial: "" }),
        character: new fields.StringField({ required: true, nullable: false, initial: "" }),
        origin: new fields.StringField({ required: true, nullable: false, initial: "" }),
        goal: new fields.StringField({ required: true, nullable: false, initial: "" })
      }),
      notes: new fields.StringField({ required: true, nullable: false, initial: "" })
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    const level = Math.max(1, Math.min(10, Number(this.level) || 1));
    this.resources.burnout.max = ({
      1: 10, 2: 12, 3: 14, 4: 16, 5: 18,
      6: 20, 7: 22, 8: 26, 9: 30, 10: 34
    })[level];
  }
}
