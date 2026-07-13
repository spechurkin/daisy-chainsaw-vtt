import {
  ATTRIBUTES,
  BURNOUT_LIMITS,
  ENEMY_TRAIT_SLUGS,
  ENEMY_BY_LEVEL,
  LEVEL_PROGRESSION
} from "../constants.mjs";

export function clamp(value, minimum, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number)) return minimum;
  return Math.min(maximum, Math.max(minimum, number));
}

export function normalizeLevel(level) {
  return Math.trunc(clamp(level, 1, 10));
}

export function burnoutLimit(level) {
  return BURNOUT_LIMITS[normalizeLevel(level)];
}

function traitSlug(trait) {
  return typeof trait === "string" ? trait : trait?.slug;
}

export function enemyTraitEffects(traits = []) {
  const slugs = new Set((Array.isArray(traits) ? traits : [])
    .map(traitSlug)
    .filter(Boolean));
  return Object.fromEntries(
    Object.entries(ENEMY_TRAIT_SLUGS).map(([key, slug]) => [key, slugs.has(slug)])
  );
}

export function hasEnemyTrait(traits, key) {
  const slug = ENEMY_TRAIT_SLUGS[key] ?? key;
  return (Array.isArray(traits) ? traits : []).some((trait) => traitSlug(trait) === slug);
}

export function applyEnemyTraits(statistics, traits = []) {
  const derived = { ...statistics };
  const effects = enemyTraitEffects(traits);

  if (effects.fast) {
    derived.initiative = Math.max(0, Number(derived.initiative) || 0) + 1;
    derived.speed = Math.max(0, Number(derived.speed) || 0) + 1;
  }
  if (effects.big) {
    const speed = Math.max(0, Number(derived.speed) || 0);
    derived.speed = speed / 2;
    derived.damage = Math.max(0, Number(derived.damage) || 0) * 2;
  }
  return derived;
}

export function enemyStatistics(level, options = {}) {
  const normalized = Math.trunc(clamp(level, 0, 10));
  const traits = Array.isArray(options) ? options : options?.traits ?? [];
  return applyEnemyTraits(ENEMY_BY_LEVEL[normalized], traits);
}

export function attributeValue(attributes, key) {
  if (!(key in ATTRIBUTES)) return 0;
  const raw = attributes?.[key]?.value ?? attributes?.[key] ?? 0;
  return Math.trunc(clamp(raw, 1, 6));
}

export function heroineStatistics({ attributes, primaryKey, level = 1 }) {
  const charm = attributeValue(attributes, "charm");
  const focus = attributeValue(attributes, "focus");
  const heart = attributeValue(attributes, "heart");
  const strength = attributeValue(attributes, "strength");
  const primary = attributeValue(attributes, primaryKey);

  return {
    charm,
    focus,
    heart,
    strength,
    primary,
    knownSpells: Math.max(0, charm - 1),
    speed: focus + primary,
    damageMaximum: heart * 3,
    burnoutMaximum: burnoutLimit(level)
  };
}

export function successesFromResults(results, threshold, { failureFaces = [6] } = {}) {
  const target = Math.trunc(clamp(threshold, 1, 6));
  const automaticFailures = new Set(failureFaces.map(Number));
  return results.reduce((total, result) => {
    const die = Number(result);
    return total + (!automaticFailures.has(die) && die <= target ? 1 : 0);
  }, 0);
}

export function explodingDiceNeeded(results) {
  return results.filter((result) => Number(result) === 1).length;
}

export function resolveDaisyTest(results, threshold, { failureFaces = [6], convertedFailures = 0 } = {}) {
  const dice = results.map(Number);
  const baseSuccesses = successesFromResults(dice, threshold, { failureFaces });
  const failedDice = Math.max(0, dice.length - baseSuccesses);
  const converted = Math.min(failedDice, Math.max(0, Number(convertedFailures) || 0));
  const successes = baseSuccesses + converted;
  return {
    results: dice,
    threshold: Math.trunc(clamp(threshold, 1, 6)),
    successes,
    baseSuccesses,
    convertedFailures: converted,
    failureFaces: [...failureFaces],
    exploded: dice.filter((result) => result === 1).length,
    sixes: dice.filter((result) => result === 6).length,
    successful: successes > 0
  };
}

export function burnoutOutcome({ die, current, cost, level }) {
  const maximum = burnoutLimit(level);
  const next = Math.max(0, Number(current) + Number(cost));
  const overflow = Math.max(0, next - maximum);
  const total = Number(die) + overflow;
  return {
    current: Number(current),
    cost: Number(cost),
    next,
    maximum,
    overflow,
    die: Number(die),
    total,
    checked: overflow > 0,
    failed: overflow > 0 && total >= 6,
    damage: overflow > 0 && total >= 6 ? 1 : 0
  };
}

export function shouldGainBurnout(entry) {
  return entry?.kind === "spell" || (
    entry?.kind === "ability" && entry?.category === "damage"
  );
}

export function outnumberedRequirement({
  enemyCount = 0,
  consciousHeroineCount = 0,
  bossPresent = false
} = {}) {
  const enemies = Math.max(0, Math.trunc(Number(enemyCount) || 0));
  const heroines = Math.max(0, Math.trunc(Number(consciousHeroineCount) || 0));
  const clearlyOutnumbered = heroines > 0 && enemies >= heroines * 2;
  const lastAgainstBoss = heroines === 1 && Boolean(bossPresent);
  return {
    enemyCount: enemies,
    consciousHeroineCount: heroines,
    bossPresent: Boolean(bossPresent),
    clearlyOutnumbered,
    lastAgainstBoss,
    allowed: clearlyOutnumbered || lastAgainstBoss
  };
}

export function beyondRequirements({
  outnumbered,
  clearlyOutnumbered = false,
  lastAgainstBoss = false,
  nearlyDead,
  burnedOut
}) {
  const requirements = {
    outnumbered: typeof outnumbered === "boolean"
      ? outnumbered
      : Boolean(clearlyOutnumbered || lastAgainstBoss),
    nearlyDead: Boolean(nearlyDead),
    burnedOut: Boolean(burnedOut)
  };
  const met = Object.values(requirements).filter(Boolean).length;
  return {
    requirements,
    outnumberedDetails: {
      clearlyOutnumbered: Boolean(clearlyOutnumbered),
      lastAgainstBoss: Boolean(lastAgainstBoss)
    },
    met,
    allowed: met >= 2
  };
}

export function heroineWinsInitiative({
  successes,
  highestEnemyInitiative,
  rule = "original"
}) {
  const result = Math.max(0, Number(successes) || 0);
  const enemyInitiative = Math.max(0, Number(highestEnemyInitiative) || 0);
  return rule === "russian"
    ? result >= enemyInitiative
    : result > enemyInitiative;
}

export function elusiveAttackPenalty(traits, { ranged = false } = {}) {
  if (!hasEnemyTrait(traits, "elusive")) return 0;
  return ranged ? -2 : -1;
}

export function harmAfterArmor(amount, {
  armored = false,
  isAttack = true,
  ignoreArmor = false
} = {}) {
  const harm = Math.max(0, Math.trunc(Number(amount) || 0));
  const reduction = armored && isAttack && !ignoreArmor && harm > 0 ? 1 : 0;
  return { requested: harm, reduction, applied: Math.max(0, harm - reduction) };
}

export function splitProtectedHarm(amount, { oddTo = "target" } = {}) {
  const harm = Math.max(0, Math.trunc(Number(amount) || 0));
  const half = Math.floor(harm / 2);
  const odd = harm - (half * 2);
  return oddTo === "protector"
    ? { target: half, protector: half + odd }
    : { target: half + odd, protector: half };
}

export function cumulativeProgression(level) {
  const target = normalizeLevel(level);
  let attributePoints = 0;
  const abilitySlots = { 1: 0, 2: 0, 3: 0 };
  for (let current = 1; current <= target; current += 1) {
    const step = LEVEL_PROGRESSION[current];
    attributePoints += step.attributePoints;
    for (const grant of step.abilities) {
      abilitySlots[grant.level] += grant.count;
    }
  }
  return { attributePoints, abilitySlots };
}

export function saveTarget({ sourceSuccesses, sourceLevel }) {
  const successes = Number(sourceSuccesses);
  return Number.isFinite(successes) && successes > 0
    ? Math.trunc(successes)
    : Math.max(1, Math.trunc(Number(sourceLevel) || 1));
}
