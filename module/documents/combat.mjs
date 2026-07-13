import { SYSTEM_ID } from "../constants.mjs";
import { heroineWinsInitiative } from "../rules/core.mjs";

function systemSetting(key, fallback) {
  try {
    return globalThis.game?.settings?.get?.(SYSTEM_ID, key) ?? fallback;
  } catch (_error) {
    return fallback;
  }
}

function localize(key, fallback = key) {
  return globalThis.game?.i18n?.localize?.(key) ?? fallback;
}

function sideOf(combatant) {
  return combatant.actor?.type === "heroine" ? "heroine" : "enemy";
}

function eligibleCombatants(combat) {
  return combat.turns.filter((combatant) => !combatant.defeated
    && ["heroine", "enemy"].includes(combatant.actor?.type));
}

function encodedHeroineInitiative(actor, successes) {
  const focus = Number(actor.system.attributes.focus.value ?? 0);
  return Number(successes) + (focus / 100);
}

async function chooseCombatant(candidates, title) {
  if (!candidates.length) return null;
  if (candidates.length === 1) return candidates[0];

  const DialogV2 = foundry.applications.api.DialogV2;
  if (DialogV2?.wait) {
    const id = await DialogV2.wait({
      window: { title },
      content: `<p>${localize("DAISY.Combat.NextCombatant", "Кто ходит следующим?")}</p>`,
      buttons: candidates.map((combatant) => ({
        action: combatant.id,
        label: combatant.name,
        icon: `<img src="${combatant.img}" alt="">`,
        callback: () => combatant.id
      })),
      close: () => null
    });
    return candidates.find((combatant) => combatant.id === id) ?? null;
  }

  return candidates[0];
}

export class DaisyCombat extends Combat {
  get actionState() {
    return this.getFlag(SYSTEM_ID, "actionState") ?? {
      combatantId: this.combatant?.id ?? null,
      remaining: 2
    };
  }

  actionsRemaining(actor = null) {
    if (!this.started || !this.combatant) return null;
    if (actor && this.combatant.actor?.uuid !== actor.uuid) return 0;
    const state = this.actionState;
    return state.combatantId === this.combatant.id ? Number(state.remaining ?? 2) : 2;
  }

  async resetActionsForCurrent() {
    if (!this.started || !this.combatant) return;
    const state = this.actionState;
    if (state.combatantId === this.combatant.id && Number.isFinite(Number(state.remaining))) return;
    await this.setFlag(SYSTEM_ID, "actionState", { combatantId: this.combatant.id, remaining: 2 });
  }

  async spendAction(actor, cost = 1, { label = "" } = {}) {
    if (!systemSetting("trackActions", true) || !this.started) return true;
    const current = this.combatant;
    if (!current || current.actor?.uuid !== actor?.uuid) {
      ui.notifications?.warn(game.i18n.localize("DAISY.Notifications.NotActorsTurn"));
      return false;
    }
    const state = this.actionState;
    const remaining = state.combatantId === current.id ? Number(state.remaining ?? 2) : 2;
    const requested = Math.max(0, Math.trunc(Number(cost) || 0));
    if (remaining < requested) {
      ui.notifications?.warn(game.i18n.format("DAISY.Notifications.NotEnoughActions", {
        cost: requested,
        remaining,
        label
      }));
      return false;
    }
    await this.setFlag(SYSTEM_ID, "actionState", {
      combatantId: current.id,
      remaining: remaining - requested
    });
    return true;
  }

  _adjacentFodderIds(combatant) {
    if (combatant.actor?.type !== "enemy" || Number(combatant.actor.system?.level) !== 0) return [combatant.id];
    const origin = globalThis.canvas?.tokens?.get?.(combatant.tokenId);
    if (!origin) return [combatant.id];
    const size = Number(canvas.grid?.size ?? canvas.scene?.grid?.size ?? 100) || 100;
    const center = origin.center ?? { x: origin.x + origin.w / 2, y: origin.y + origin.h / 2 };
    return eligibleCombatants(this).filter((candidate) => {
      if (candidate.actor?.type !== "enemy" || Number(candidate.actor.system?.level) !== 0) return false;
      const token = canvas.tokens?.get?.(candidate.tokenId);
      if (!token) return candidate.id === combatant.id;
      const other = token.center ?? { x: token.x + token.w / 2, y: token.y + token.h / 2 };
      return Math.max(Math.abs(center.x - other.x), Math.abs(center.y - other.y)) <= size * 1.5;
    }).map((candidate) => candidate.id);
  }

  async rollInitiative(ids, options = {}) {
    const requested = new Set(Array.isArray(ids) ? ids : [ids]);
    const updates = [];
    const rule = systemSetting("initiativeRule", "original");
    const highestEnemyInitiative = Math.max(0, ...this.combatants
      .filter((combatant) => combatant.actor?.type === "enemy" && !combatant.defeated)
      .map((combatant) => Number(combatant.actor.statistics?.initiative) || 0));

    for (const combatant of this.combatants) {
      if (!requested.has(combatant.id) || !combatant.actor) continue;
      const result = await combatant.actor.rollInitiativeCheck({ highestEnemyInitiative, rule });
      const initiative = combatant.actor.type === "heroine"
        ? encodedHeroineInitiative(combatant.actor, result.successes)
        : Number(result.successes);
      updates.push({ _id: combatant.id, initiative });
    }

    if (updates.length) await this.updateEmbeddedDocuments("Combatant", updates);
    if (options.updateTurn && this.turn !== null) {
      const currentId = this.combatant?.id;
      const turn = this.turns.findIndex((combatant) => combatant.id === currentId);
      if (turn >= 0) await this.update({ turn });
    }
    return this;
  }

  async startCombat() {
    const missing = this.combatants.filter((combatant) => combatant.initiative === null)
      .map((combatant) => combatant.id);
    if (missing.length) await this.rollInitiative(missing, { updateTurn: false });

    await super.startCombat();

    const eligible = eligibleCombatants(this);
    const enemies = eligible.filter((combatant) => sideOf(combatant) === "enemy");
    const heroines = eligible.filter((combatant) => sideOf(combatant) === "heroine");
    const highestEnemy = Math.max(0, ...enemies.map((combatant) => Math.trunc(combatant.initiative ?? 0)));
    const rule = systemSetting("initiativeRule", "original");
    const qualified = heroines.filter(
      (combatant) => heroineWinsInitiative({
        successes: Math.trunc(combatant.initiative ?? 0),
        highestEnemyInitiative: highestEnemy,
        rule
      })
    );

    let first;
    if (qualified.length) {
      const best = Math.max(...qualified.map((combatant) => combatant.initiative ?? 0));
      first = qualified.find((combatant) => combatant.initiative === best);
    } else {
      first = await chooseCombatant(
        enemies,
        localize("DAISY.Combat.EnemyFirstTurn", "Первый ход противника")
      );
    }

    if (!first) first = this.turns[0];
    const turn = this.turns.findIndex((combatant) => combatant.id === first.id);
    await this.update({
      turn,
      [`flags.${SYSTEM_ID}.turnState`]: {
        acted: this._adjacentFodderIds(first),
        mustSwitch: false
      },
      [`flags.${SYSTEM_ID}.actionState`]: { combatantId: first.id, remaining: 2 }
    });
    return this;
  }

  async nextTurn() {
    const enabled = systemSetting("popcornInitiative", true);
    if (!this.started || !this.combatant) return super.nextTurn();
    if (!enabled) {
      const result = await super.nextTurn();
      await this.setFlag(SYSTEM_ID, "actionState", { combatantId: this.combatant?.id ?? null, remaining: 2 });
      return result;
    }

    const state = foundry.utils.deepClone(
      this.getFlag(SYSTEM_ID, "turnState") ?? { acted: [this.combatant.id], mustSwitch: false }
    );
    const current = this.combatant;
    const currentSide = sideOf(current);
    const eligible = eligibleCombatants(this);
    let nextRound = eligible.length > 0 && eligible.every((combatant) => state.acted.includes(combatant.id));
    let candidates = eligible.filter((combatant) => !state.acted.includes(combatant.id));

    if (nextRound) {
      state.acted = [];
      candidates = [...eligible];
    }
    if (state.mustSwitch) {
      const switched = candidates.filter((combatant) => sideOf(combatant) !== currentSide);
      if (switched.length) candidates = switched;
    }

    const chosen = await chooseCombatant(
      candidates,
      nextRound
        ? localize("DAISY.Combat.NewRoundFirstTurn", "Первый ход нового раунда")
        : localize("DAISY.Combat.PassTurn", "Передать ход")
    );
    if (!chosen) return this;

    const selectedAlly = sideOf(chosen) === currentSide;
    state.mustSwitch = selectedAlly;
    state.acted.push(...this._adjacentFodderIds(chosen));
    state.acted = [...new Set(state.acted)];
    const turn = this.turns.findIndex((combatant) => combatant.id === chosen.id);
    const update = {
      turn,
      [`flags.${SYSTEM_ID}.turnState`]: state,
      [`flags.${SYSTEM_ID}.actionState`]: { combatantId: chosen.id, remaining: 2 }
    };
    if (nextRound) update.round = this.round + 1;
    await this.update(update);
    return this;
  }
}
