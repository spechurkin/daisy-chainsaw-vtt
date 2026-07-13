export const SYSTEM_ID = "daisy-chainsaw";
export const SYSTEM_PATH = `systems/${SYSTEM_ID}`;
export const SCHEMA_VERSION = 2;

export const ATTRIBUTES = Object.freeze({
  charm: "Шарм",
  focus: "Фокус",
  heart: "Сердце",
  strength: "Сила"
});

export const ABILITY_TYPES = Object.freeze({
  damage: "Урон",
  defensive: "Защитное",
  familiar: "Фамильяр",
  passive: "Пассивное",
  utility: "Побочное"
});

export const WEAPON_RANGES = Object.freeze({
  close: 1,
  ranged: null
});

export const RANGED_WEAPON_SLUGS = Object.freeze([
  "gun",
  "knives",
  "whip"
]);

export const ENEMY_TRAIT_SLUGS = Object.freeze({
  armored: "enemy-trait-armored",
  big: "enemy-trait-large",
  elusive: "enemy-trait-evasive",
  fast: "enemy-trait-fast",
  magic: "enemy-trait-magical",
  ranged: "enemy-trait-ranged",
  strong: "enemy-trait-strong",
  summoner: "enemy-trait-summoner"
});

export const WEAPON_PARAMETER_KEYS = Object.freeze({
  "baseball-bat": ["strength", "charm"],
  knuckles: ["heart", "strength"],
  chainsaw: ["heart", "strength"],
  gun: ["charm", "focus"],
  hat: ["charm", "heart"],
  katana: ["strength", "focus"],
  knives: ["focus", "charm"],
  microphone: ["charm", "heart"],
  "roller-skates": ["focus", "strength"],
  whip: ["focus", "heart"]
});

export const BURNOUT_LIMITS = Object.freeze({
  1: 10,
  2: 12,
  3: 14,
  4: 16,
  5: 18,
  6: 20,
  7: 22,
  8: 26,
  9: 30,
  10: 34
});

export const LEVEL_PROGRESSION = Object.freeze({
  1: { attributePoints: 6, abilities: [{ level: 1, count: 2 }] },
  2: { attributePoints: 0, abilities: [{ level: 1, count: 1 }] },
  3: { attributePoints: 1, abilities: [] },
  4: { attributePoints: 0, abilities: [{ level: 2, count: 1 }] },
  5: { attributePoints: 2, abilities: [] },
  6: { attributePoints: 0, abilities: [{ level: 2, count: 2 }] },
  7: { attributePoints: 2, abilities: [] },
  8: { attributePoints: 0, abilities: [{ level: 3, count: 1 }] },
  9: { attributePoints: 0, abilities: [{ level: 3, count: 1 }] },
  10: { attributePoints: 3, abilities: [{ level: 3, count: 1 }] }
});

export const ENEMY_BY_LEVEL = Object.freeze({
  0: { primary: 1, secondary: 2, damage: 1, initiative: 0, speed: 1 },
  1: { primary: 2, secondary: 2, damage: 3, initiative: 1, speed: 1 },
  2: { primary: 2, secondary: 3, damage: 4, initiative: 2, speed: 2 },
  3: { primary: 3, secondary: 3, damage: 6, initiative: 2, speed: 2 },
  4: { primary: 3, secondary: 4, damage: 7, initiative: 3, speed: 3 },
  5: { primary: 4, secondary: 3, damage: 9, initiative: 3, speed: 3 },
  6: { primary: 4, secondary: 4, damage: 10, initiative: 4, speed: 4 },
  7: { primary: 5, secondary: 3, damage: 14, initiative: 4, speed: 4 },
  8: { primary: 5, secondary: 4, damage: 18, initiative: 5, speed: 5 },
  9: { primary: 6, secondary: 4, damage: 24, initiative: 5, speed: 5 },
  10: { primary: 6, secondary: 5, damage: 30, initiative: 6, speed: 6 }
});

export const STATUS_DEFINITIONS = Object.freeze({
  help: {
    name: "Помощь",
    kind: "maneuver",
    description: "Дополнительная кость на следующий бросок."
  },
  empowered: {
    name: "Усиление",
    kind: "maneuver",
    description: "Следующая атака по цели получает -1 к Основному."
  },
  invocation: {
    name: "Воззвание",
    kind: "maneuver",
    description: "+1 кость на следующий бросок до конца следующего хода; максимум 2."
  },
  improvised: {
    name: "На скорую руку",
    kind: "maneuver",
    description: "Временная дополнительная фишка, пока ПУ больше половины."
  },
  cover: {
    name: "Прикрытие",
    kind: "maneuver",
    description: "Атаки по союзнику проваливаются на 5 и 6, урон делится поровну."
  },
  marked: {
    name: "Метка",
    kind: "special",
    description: "Одна провальная кость атаки по цели считается успешной за каждую Метку."
  },
  burning: {
    name: "В огне",
    kind: "ailment",
    description: "Урон, равный уровню источника; нельзя использовать заклинания."
  },
  charmed: {
    name: "Очарован",
    kind: "ailment",
    description: "Нельзя совершать агрессивные действия против источника."
  },
  bleeding: {
    name: "Кровотечение",
    kind: "ailment",
    description: "1 урон в начале раунда."
  },
  broken: {
    name: "Сломан",
    kind: "ailment",
    description: "Нельзя использовать указанное оружие, способность или конечность."
  },
  entangled: {
    name: "Опутан",
    kind: "ailment",
    description: "-2 к Основному атак; атаки по цели получают +2 к Вторичному."
  },
  poisoned: {
    name: "Отравлен",
    kind: "ailment",
    description: "-1 к Основному атак и способностей типа Урон."
  },
  stunned: {
    name: "Оглушён",
    kind: "ailment",
    description: "Нельзя совершать действия."
  },
  taunted: {
    name: "Насмешка",
    kind: "ailment",
    description: "Нужно атаковать источник или приблизиться к нему."
  },
  beyond: {
    name: "За пределом",
    kind: "special",
    description: "На 3 хода: -2 к Основному атак по героине, +2 к её Основному, без выгорания."
  },
  unconscious: {
    name: "Без сознания",
    kind: "special",
    description: "Нужна Помощь в течение трёх ходов, иначе героиня погибает."
  }
});
