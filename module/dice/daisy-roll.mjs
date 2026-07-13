import { SYSTEM_ID, SYSTEM_PATH } from "../constants.mjs";
import { applyMessageMode, coreGeneration, renderSystemTemplate } from "../compat/foundry.mjs";
import {
  clamp,
  explodingDiceNeeded,
  resolveDaisyTest
} from "../rules/core.mjs";

function activeResults(roll) {
  return roll.dice.flatMap((term) => term.results)
    .filter((result) => result.active !== false)
    .map((result) => Number(result.result));
}

export async function evaluateDaisyTest({ pool, threshold, failureFaces = [6], convertedFailures = 0 }) {
  const basePool = Math.trunc(clamp(pool, 0, 100));
  const target = Math.trunc(clamp(threshold, 1, 6));
  const rolls = [];
  const results = [];
  let pending = basePool;
  let guard = 0;

  while (pending > 0 && guard < 100) {
    const roll = Roll.create(`${pending}d6`);
    await roll.evaluate();
    const batch = activeResults(roll);
    rolls.push(roll);
    results.push(...batch);
    pending = explodingDiceNeeded(batch);
    guard += 1;
  }

  const resolution = resolveDaisyTest(results, target, { failureFaces, convertedFailures });
  return {
    ...resolution,
    pool: basePool,
    rolls,
    guarded: guard >= 100
  };
}

export function defaultMessageMode() {
  try {
    return game.settings.get("core", coreGeneration() >= 14 ? "messageMode" : "rollMode");
  } catch (_error) {
    try {
      return game.settings.get("core", coreGeneration() >= 14 ? "rollMode" : "messageMode");
    } catch (_secondError) {
      return undefined;
    }
  }
}

function diceViewData(result) {
  const threshold = Number(result?.threshold) || 1;
  const failureFaces = new Set((result?.failureFaces ?? []).map(Number));
  let convertedRemaining = Math.max(0, Number(result?.convertedFailures) || 0);

  return (result?.results ?? []).map((rawValue) => {
    const value = Number(rawValue);
    const baseSuccess = !failureFaces.has(value) && value <= threshold;
    const converted = !baseSuccess && convertedRemaining > 0;
    if (converted) convertedRemaining -= 1;
    return {
      value,
      successful: baseSuccess || converted,
      converted,
      exploded: value === 1
    };
  });
}

export async function postDaisyTest({
  actor,
  label,
  result,
  kind = "check",
  target = null,
  messageMode = defaultMessageMode(),
  details = ""
}) {
  const displayTarget = target && typeof target === "object"
    ? target
    : target !== null && target !== undefined
      ? { name: String(target) }
      : null;
  const content = await renderSystemTemplate(
    `${SYSTEM_PATH}/templates/chat/check-card.hbs`,
    {
      actor,
      label,
      kind,
      result,
      dice: diceViewData(result),
      target: displayTarget,
      details,
      isAttack: kind === "attack"
    }
  );
  const data = {
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    rolls: result.rolls,
    flags: {
      [SYSTEM_ID]: {
        type: "daisy-test",
        actorUuid: actor.uuid,
        kind,
        label,
        target,
        result: {
          pool: result.pool,
          threshold: result.threshold,
          results: result.results,
          successes: result.successes,
          baseSuccesses: result.baseSuccesses,
          convertedFailures: result.convertedFailures,
          failureFaces: result.failureFaces,
          exploded: result.exploded,
          sixes: result.sixes,
          successful: result.successful
        }
      }
    }
  };
  applyMessageMode(data, messageMode);
  return ChatMessage.create(data);
}

export async function postDaisyNotice({ actor, title, content, cssClass = "notice", actions = [] }) {
  const html = await renderSystemTemplate(
    `${SYSTEM_PATH}/templates/chat/notice-card.hbs`,
    { actor, title, content, cssClass, actions }
  );
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: html,
    flags: { [SYSTEM_ID]: { type: "notice", actorUuid: actor.uuid, actions } }
  });
}
