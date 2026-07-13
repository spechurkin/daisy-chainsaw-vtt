import { STATUS_DEFINITIONS, SYSTEM_ID } from "../constants.mjs";
import { postDaisyNotice } from "../dice/daisy-roll.mjs";

function isAilment(status) {
  return STATUS_DEFINITIONS[status.id]?.kind === "ailment";
}

function localize(key, data = null, fallback = key) {
  const i18n = globalThis.game?.i18n;
  if (!i18n) return fallback;
  if (data && typeof i18n.format === "function") return i18n.format(key, data);
  return typeof i18n.localize === "function" ? i18n.localize(key) : fallback;
}

export async function tickRoundStatuses(actor) {
  if (!actor?.system?.statuses?.length) return;
  const statuses = foundry.utils.deepClone(actor.system.statuses);
  const retained = [];
  let damage = 0;

  for (const status of statuses) {
    if (status.id === "burning") damage += Math.max(0, Number(status.sourceLevel) || 0);
    if (status.id === "bleeding") damage += Math.max(1, Number(status.stacks) || 1);

    let removedBySave = false;
    if (isAilment(status)) {
      const result = await actor.rollSave({
        sourceSuccesses: status.sourceSuccesses,
        sourceLevel: status.sourceLevel,
        label: localize(
          "DAISY.Combat.Resistance",
          {
            status: localize(
              `DAISY.Status.${status.id}.Name`,
              null,
              STATUS_DEFINITIONS[status.id].name
            )
          },
          `Сопротивление: ${STATUS_DEFINITIONS[status.id].name}`
        )
      });
      removedBySave = result.successful;
    }
    if (removedBySave) continue;

    if (status.id === "marked" && status.durationUnit === "round" && status.sources?.length) {
      const trackedBefore = status.sources.length;
      const untrackedStacks = Math.max(0, Number(status.stacks) - trackedBefore);
      const sources = status.sources
        .map((source) => ({
          uuid: source.uuid,
          remaining: Math.max(0, Number(source.remaining) - 1)
        }))
        .filter((source) => source.remaining > 0);
      const untrackedRemaining = untrackedStacks > 0
        ? Math.max(0, Number(status.remaining) - 1)
        : 0;
      const retainedUntracked = untrackedRemaining > 0 ? untrackedStacks : 0;
      status.sources = sources;
      status.stacks = sources.length + retainedUntracked;
      status.remaining = Math.max(untrackedRemaining, 0, ...sources.map((source) => source.remaining));
      status.sourceUuid = sources[0]?.uuid ?? "";
      if (status.stacks <= 0) continue;
      retained.push(status);
      continue;
    }

    if (status.durationUnit === "round" && status.remaining > 0) {
      status.remaining -= 1;
      if (status.remaining <= 0) continue;
    }
    retained.push(status);
  }

  await actor.update({ "system.statuses": retained });
  await actor.syncStatusEffects?.();
  if (damage > 0) {
    if (typeof actor.applyHarm === "function") {
      await actor.applyHarm(damage, { isAttack: false, allowProtection: false });
    } else {
      await actor.adjustDamage(-damage);
    }
  }
}

export async function tickTurnStatuses(actor) {
  if (!actor?.system?.statuses?.length) return;
  const statuses = foundry.utils.deepClone(actor.system.statuses);
  const retained = [];

  for (const status of statuses) {
    if (status.id !== "unconscious" && status.durationUnit === "turn" && status.remaining > 0) {
      status.remaining -= 1;
      if (status.remaining <= 0) {
        continue;
      }
    }
    retained.push(status);
  }

  await actor.update({ "system.statuses": retained });
  await actor.syncStatusEffects?.();
}

export async function tickUnconsciousStatus(actor) {
  if (!actor?.system?.statuses?.some((status) => status.id === "unconscious")) return;
  const statuses = foundry.utils.deepClone(actor.system.statuses);
  const unconscious = statuses.find((status) => status.id === "unconscious");
  if (unconscious.durationUnit !== "turn" || unconscious.remaining <= 0) return;
  unconscious.remaining -= 1;
  const expired = unconscious.remaining <= 0;
  if (expired) {
    unconscious.detail = localize(
      "DAISY.Status.unconscious.Expired",
      null,
      "Героиня погибла: Помощь не была оказана вовремя."
    );
  }
  await actor.update({ "system.statuses": statuses });
  await actor.syncStatusEffects?.();
  if (expired) {
    await postDaisyNotice({
      actor,
      title: localize("DAISY.Chat.Death.Title", null, "Героиня погибает"),
      content: `<p>${localize("DAISY.Chat.Death.Content", null, "Три хода прошли без манёвра Помощь.")}</p>`,
      cssClass: "failure"
    });
  }
}

export async function processCombatUpdate(combat, changes) {
  if (!game.user?.isActiveGM || !combat?.started) return;
  const roundChanged = Object.hasOwn(changes, "round");
  const turnChanged = Object.hasOwn(changes, "turn");
  if (!roundChanged && !turnChanged) return;

  const round = Number(changes.round ?? combat.round);
  const turn = Number(changes.turn ?? combat.turn);
  const lastTick = combat.getFlag(SYSTEM_ID, "lastStatusTick") ?? {};
  const newRound = roundChanged && round > 1 && Number(lastTick.round) !== round;
  const newTurn = turnChanged && (
    Number(lastTick.round) !== round || Number(lastTick.turn) !== turn
  );

  if (newRound) {
    for (const combatant of combat.combatants) {
      if (combatant.actor) await tickRoundStatuses(combatant.actor);
    }
  }
  if (newTurn) {
    for (const combatant of combat.combatants) {
      if (combatant.actor) await tickUnconsciousStatus(combatant.actor);
    }
    const combatant = combat.turns[turn];
    if (combatant?.actor) await tickTurnStatuses(combatant.actor);
  }
  await combat.setFlag(SYSTEM_ID, "lastStatusTick", {
    round,
    turn
  });
}
