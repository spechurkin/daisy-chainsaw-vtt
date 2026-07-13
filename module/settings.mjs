import { SCHEMA_VERSION, SYSTEM_ID } from "./constants.mjs";

export function registerSettings() {
  game.settings.register(SYSTEM_ID, "schemaVersion", {
    name: "DAISY.Settings.SchemaVersion.Name",
    scope: "world",
    config: false,
    type: Number,
    default: SCHEMA_VERSION
  });

  game.settings.register(SYSTEM_ID, "burnoutAbilities", {
    name: "DAISY.Settings.BurnoutAbilities.Name",
    hint: "DAISY.Settings.BurnoutAbilities.Hint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      damageOnly: "DAISY.Settings.BurnoutAbilities.Choice.DamageOnly",
      all: "DAISY.Settings.BurnoutAbilities.Choice.All"
    },
    default: "damageOnly",
    restricted: true
  });

  game.settings.register(SYSTEM_ID, "levelTwoUnlock", {
    name: "DAISY.Settings.LevelTwoUnlock.Name",
    hint: "DAISY.Settings.LevelTwoUnlock.Hint",
    scope: "world",
    config: true,
    type: Number,
    choices: {
      4: "DAISY.Settings.LevelTwoUnlock.Choice.Level4",
      5: "DAISY.Settings.LevelTwoUnlock.Choice.Level5"
    },
    default: 4,
    restricted: true
  });

  game.settings.register(SYSTEM_ID, "popcornInitiative", {
    name: "DAISY.Settings.PopcornInitiative.Name",
    hint: "DAISY.Settings.PopcornInitiative.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    restricted: true
  });

  game.settings.register(SYSTEM_ID, "reduceMotion", {
    name: "DAISY.Settings.ReduceMotion.Name",
    hint: "DAISY.Settings.ReduceMotion.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: (value) => document.documentElement.classList.toggle("daisy-reduce-motion", Boolean(value))
  });

  game.settings.register(SYSTEM_ID, "initiativeRule", {
    name: "DAISY.Settings.InitiativeRule.Name",
    hint: "DAISY.Settings.InitiativeRule.Hint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      original: "DAISY.Settings.InitiativeRule.Original",
      russian: "DAISY.Settings.InitiativeRule.Russian"
    },
    default: "original",
    restricted: true
  });

  game.settings.register(SYSTEM_ID, "weaponStatRule", {
    name: "DAISY.Settings.WeaponStatRule.Name",
    hint: "DAISY.Settings.WeaponStatRule.Hint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      original: "DAISY.Settings.WeaponStatRule.Original",
      russian: "DAISY.Settings.WeaponStatRule.Russian"
    },
    default: "original",
    restricted: true
  });

  game.settings.register(SYSTEM_ID, "protectOddHarm", {
    name: "DAISY.Settings.ProtectOddHarm.Name",
    hint: "DAISY.Settings.ProtectOddHarm.Hint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      target: "DAISY.Settings.ProtectOddHarm.Target",
      protector: "DAISY.Settings.ProtectOddHarm.Protector"
    },
    default: "target",
    restricted: true
  });

  game.settings.register(SYSTEM_ID, "autoDefeatEnemies", {
    name: "DAISY.Settings.AutoDefeatEnemies.Name",
    hint: "DAISY.Settings.AutoDefeatEnemies.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    restricted: true
  });

  game.settings.register(SYSTEM_ID, "trackActions", {
    name: "DAISY.Settings.TrackActions.Name",
    hint: "DAISY.Settings.TrackActions.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    restricted: true
  });
}
