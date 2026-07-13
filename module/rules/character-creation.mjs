import { ATTRIBUTES, WEAPON_PARAMETER_KEYS } from "../constants.mjs";
import { cumulativeProgression, normalizeLevel } from "./core.mjs";

const ATTRIBUTE_LOCALIZATION_KEYS = Object.freeze({
  charm: "DAISY.Attributes.Charm",
  focus: "DAISY.Attributes.Focus",
  heart: "DAISY.Attributes.Heart",
  strength: "DAISY.Attributes.Power"
});

function localize(key, data = null, fallback = key) {
  const i18n = globalThis.game?.i18n;
  if (!i18n) return fallback;
  if (data && typeof i18n.format === "function") return i18n.format(key, data);
  return typeof i18n.localize === "function" ? i18n.localize(key) : fallback;
}

export function maximumAbilityLevel(teamLevel, levelTwoUnlock = 4) {
  const level = normalizeLevel(teamLevel);
  if (level >= 8) return 3;
  if (level >= Number(levelTwoUnlock)) return 2;
  return 1;
}

export function attributeBudget(teamLevel) {
  return 4 + cumulativeProgression(teamLevel).attributePoints;
}

export function validateHeroineBuild({
  attributes,
  weapons,
  abilities = [],
  spells = [],
  teamLevel = 1,
  levelTwoUnlock = 4,
  weaponStatRule = "original"
}) {
  const errors = [];
  const warnings = [];
  const values = Object.fromEntries(Object.keys(ATTRIBUTES).map((key) => [
    key,
    Number(attributes?.[key]?.value ?? attributes?.[key])
  ]));

  for (const [key, value] of Object.entries(values)) {
    if (!Number.isInteger(value) || value < 1 || value > 6) {
      const attribute = localize(ATTRIBUTE_LOCALIZATION_KEYS[key], null, ATTRIBUTES[key]);
      errors.push(localize(
        "DAISY.Errors.AttributeRange",
        { attribute },
        `${ATTRIBUTES[key]} должен быть целым числом от 1 до 6.`
      ));
    }
  }
  const spent = Object.values(values).reduce((total, value) => total + (Number(value) || 0), 0);
  const budget = attributeBudget(teamLevel);
  if (spent > budget) errors.push(localize(
    "DAISY.Errors.AttributeOverspent",
    { spent, budget },
    `Распределено ${spent} пунктов параметров при доступных ${budget}.`
  ));
  if (spent < budget) warnings.push(localize(
    "DAISY.Errors.AttributePointsRemaining",
    { remaining: budget - spent },
    `Осталось распределить ${budget - spent} пунктов параметров.`
  ));

  const main = weapons?.main ?? {};
  const reserve = weapons?.reserve ?? {};
  if (!WEAPON_PARAMETER_KEYS[main.slug]) {
    errors.push(localize("DAISY.Errors.InvalidMainWeapon", null, "Не выбрано корректное Главное оружие."));
  }
  if (!WEAPON_PARAMETER_KEYS[reserve.slug]) {
    errors.push(localize("DAISY.Errors.InvalidOffhandWeapon", null, "Не выбрано корректное Запасное оружие."));
  }
  const mainAllowed = WEAPON_PARAMETER_KEYS[main.slug] ?? [];
  const reserveAllowed = WEAPON_PARAMETER_KEYS[reserve.slug] ?? [];
  const mainValid = weaponStatRule === "original"
    ? main.parameter === mainAllowed[0]
    : mainAllowed.includes(main.parameter);
  const reserveValid = weaponStatRule === "original"
    ? reserve.parameter === reserveAllowed[1]
    : reserveAllowed.includes(reserve.parameter);
  if (main.slug && !mainValid) {
    errors.push(localize(
      "DAISY.Errors.UnsupportedMainParameter",
      null,
      "Основной параметр не поддерживается Главным оружием."
    ));
  }
  if (reserve.slug && !reserveValid) {
    errors.push(localize(
      "DAISY.Errors.UnsupportedOffhandParameter",
      null,
      "Вторичный параметр не поддерживается Запасным оружием."
    ));
  }
  if (main.slug && reserve.slug && main.slug !== reserve.slug && reserve.gimmick) {
    errors.push(localize(
      "DAISY.Errors.QuirkSelection",
      null,
      "Постоянная Фишка берётся от Главного оружия; вторая доступна только при двух одинаковых оружиях."
    ));
  }
  if (main.slug && !main.gimmick) warnings.push(localize(
    "DAISY.Errors.MainQuirkMissing",
    null,
    "Не выбрана постоянная Фишка Главного оружия."
  ));

  const knownSpellSlots = Math.max(0, (values.charm || 1) - 1);
  const progression = cumulativeProgression(teamLevel);
  const abilitySlots = Object.values(progression.abilitySlots).reduce((total, count) => total + count, 0);
  const totalKnownSlots = knownSpellSlots + abilitySlots;
  const selectedSlots = abilities.length + spells.length;
  if (selectedSlots > totalKnownSlots) errors.push(localize(
    "DAISY.Errors.TooManySelections",
    { selected: selectedSlots, available: totalKnownSlots },
    `Выбрано ${selectedSlots} способностей и заклинаний при доступных ${totalKnownSlots} слотах.`
  ));
  if (selectedSlots < totalKnownSlots) warnings.push(localize(
    "DAISY.Errors.SelectionSlotsRemaining",
    { remaining: totalKnownSlots - selectedSlots },
    `Осталось заполнить ${totalKnownSlots - selectedSlots} слотов способностей или заклинаний.`
  ));
  if (spells.length > knownSpellSlots) warnings.push(localize(
    "DAISY.Errors.SpellLimit",
    null,
    "Использованы слоты способностей вместо заклинаний; обмен можно вернуть при следующем развитии."
  ));
  const maxAbilityLevel = maximumAbilityLevel(teamLevel, levelTwoUnlock);
  const locked = abilities.filter((ability) => Number(ability.level) > maxAbilityLevel);
  if (locked.length) errors.push(localize(
    "DAISY.Errors.AbilityLevelLocked",
    { level: maxAbilityLevel },
    `Есть способности выше доступного ${maxAbilityLevel} уровня.`
  ));

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    attributePoints: { spent, budget },
    knownSpellSlots,
    abilitySlots,
    totalKnownSlots,
    selectedSlots,
    maximumAbilityLevel: maxAbilityLevel
  };
}
