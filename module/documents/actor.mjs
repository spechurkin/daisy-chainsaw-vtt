import {
  RANGED_WEAPON_SLUGS,
  STATUS_DEFINITIONS,
  SYSTEM_ID
} from "../constants.mjs";
import { evaluateDaisyTest, postDaisyNotice, postDaisyTest } from "../dice/daisy-roll.mjs";
import {
  beyondRequirements,
  burnoutLimit,
  burnoutOutcome,
  enemyStatistics,
  elusiveAttackPenalty,
  harmAfterArmor,
  hasEnemyTrait,
  outnumberedRequirement,
  saveTarget,
  splitProtectedHarm,
  shouldGainBurnout
} from "../rules/core.mjs";

function systemSetting(key, fallback) {
  try {
    return globalThis.game?.settings?.get?.(SYSTEM_ID, key) ?? fallback;
  } catch (_error) {
    return fallback;
  }
}

function localize(key, data = null, fallback = key) {
  const i18n = globalThis.game?.i18n;
  if (!i18n) return fallback;
  if (data && typeof i18n.format === "function") return i18n.format(key, data);
  if (typeof i18n.localize === "function") return i18n.localize(key);
  return fallback;
}

async function resolveActorDocument(uuid) {
  if (!uuid) return null;
  try {
    const document = globalThis.fromUuid
      ? await globalThis.fromUuid(uuid)
      : globalThis.fromUuidSync?.(uuid);
    if (document?.documentName === "Actor") return document;
    if (document?.actor?.documentName === "Actor") return document.actor;
  } catch (_error) {
    // An expired token or deleted actor simply means the protection no longer applies.
  }
  return null;
}

async function confirmScarEscape(actor) {
  const title = localize("DAISY.Dialog.Scar.Title", null, "Избежать смертельного удара?");
  const content = `<p>${localize("DAISY.Dialog.Scar.Content", { name: actor.name }, `${actor.name} может полностью отменить этот урон, получить постоянный шрам и немедленно выйти За Предел.`)}</p>`;
  const DialogV2 = globalThis.foundry?.applications?.api?.DialogV2;
  if (DialogV2?.confirm) {
    return Boolean(await DialogV2.confirm({
      window: { title },
      content,
      yes: { label: localize("DAISY.Dialog.Scar.Accept", null, "Получить шрам") },
      no: { label: localize("DAISY.Dialog.Scar.Decline", null, "Принять урон") },
      modal: true
    }));
  }
  if (globalThis.Dialog?.confirm) {
    return Boolean(await globalThis.Dialog.confirm({
      title,
      content,
      yes: () => true,
      no: () => false,
      defaultYes: false
    }));
  }
  return false;
}

export class DaisyActor extends Actor {
  get teamActor() {
    if (this.type !== "heroine" || !this.system.teamUuid) return null;
    try {
      const document = globalThis.fromUuidSync?.(this.system.teamUuid);
      return document?.documentName === "Actor" && document.type === "team" ? document : null;
    } catch (_error) {
      return null;
    }
  }

  get effectiveLevel() {
    if (this.type === "heroine") return this.teamActor?.system.level ?? this.system.level;
    return this.system.level ?? 1;
  }

  get burnoutValue() {
    if (this.type === "team") {
      return Number(this.system.resources?.burnout?.value) || 0;
    }
    if (this.type !== "heroine") return 0;
    return Number(
      this.teamActor?.system.resources?.burnout?.value
        ?? this.system.resources?.burnout?.value
    ) || 0;
  }

  get statistics() {
    if (this.type === "heroine") {
      const base = this.system.statistics;
      const primaryKey = this.system.primaryKey;
      const secondaryKey = this.system.secondaryKey;
      const primary = primaryKey ? this.system.attributes[primaryKey]?.value ?? 0 : 0;
      const secondary = secondaryKey ? this.system.attributes[secondaryKey]?.value ?? 0 : 0;
      return {
        ...base,
        primaryKey,
        secondaryKey,
        primary,
        secondary,
        level: this.effectiveLevel,
        burnoutMaximum: burnoutLimit(this.effectiveLevel),
        damageCurrent: this.system.resources.damage.value,
        burnoutCurrent: this.burnoutValue
      };
    }
    if (this.type === "enemy") {
      const statistics = this.system.statistics ?? enemyStatistics(this.system.level, {
        traits: this.system.traits
      });
      return {
        ...statistics,
        level: this.system.level,
        damageCurrent: this.system.resources.damage.value
      };
    }
    return {
      level: this.system.level,
      burnoutCurrent: this.system.resources.burnout.value,
      burnoutMaximum: burnoutLimit(this.system.level)
    };
  }

  async setBurnout(value) {
    const next = Math.max(0, Math.trunc(Number(value) || 0));
    if (this.type === "team") {
      return this.update({ "system.resources.burnout.value": next });
    }
    if (this.type !== "heroine") return this;
    const team = this.teamActor;
    if (team) return team.update({ "system.resources.burnout.value": next });
    return this.update({ "system.resources.burnout.value": next });
  }

  async adjustBurnout(delta) {
    const change = Number(delta);
    if (!Number.isFinite(change)) return this;
    return this.setBurnout(this.burnoutValue + change);
  }

  async spendAction(cost = 1, label = "") {
    if (this.hasStatus?.("stunned") || this.hasStatus?.("unconscious")) {
      ui.notifications?.warn(game.i18n.localize("DAISY.Notifications.CannotAct"));
      return false;
    }
    const combat = globalThis.game?.combat;
    if (!combat?.spendAction) return true;
    return combat.spendAction(this, cost, { label });
  }

  async adjustDamage(delta) {
    if (!this.system.resources?.damage) return this;
    const statistics = this.statistics;
    const maximum = this.type === "heroine"
      ? statistics.damageMaximum
      : statistics.damage ?? this.system.resources.damage.max;
    const current = Math.max(0, Number(this.system.resources.damage.value) || 0);
    const change = Number(delta);
    const next = Math.max(0, Math.min(maximum, current + (Number.isFinite(change) ? change : 0)));
    const update = await this.update({ "system.resources.damage.value": next });
    if (this.type === "heroine" && next === 0 && !this.hasStatus("unconscious")) {
      await this.addStatus("unconscious", { remaining: 3, durationUnit: "turn" });
      await postDaisyNotice({
        actor: this,
        title: localize("DAISY.Chat.Unconscious.Title", null, "Без сознания"),
        content: `<p>${localize("DAISY.Chat.Unconscious.Content", null, "Героине нужно оказать Помощь в течение трёх ходов, иначе она умрёт. После успешной Помощи она восстановит 1 ПУ в конце боя.")}</p>`,
        cssClass: "failure"
      });
    }
    if (this.type === "enemy" && systemSetting("autoDefeatEnemies", true)) {
      const combatants = [...(globalThis.game?.combat?.combatants ?? [])]
        .filter((combatant) => combatant.actor?.uuid === this.uuid);
      const defeated = next === 0;
      for (const combatant of combatants) {
        if (combatant.defeated !== defeated) await combatant.update({ defeated });
      }
    }
    return update;
  }

  async _applyDirectHarm(amount, {
    isAttack = true,
    ignoreArmor = false,
    allowScar = false
  } = {}) {
    const armor = harmAfterArmor(amount, {
      armored: this.type === "enemy" && hasEnemyTrait(this.system.traits, "armored"),
      isAttack,
      ignoreArmor
    });
    const before = Math.max(0, Number(this.system.resources?.damage?.value) || 0);
    const mayEscapeWithScar = allowScar
      && this.type === "heroine"
      && before > 0
      && armor.applied >= before
      && !this.system.resources.scarUsed;
    if (mayEscapeWithScar && await confirmScarEscape(this)) {
      await this.escapeDeathWithScar({ scar: localize("DAISY.Scar.Permanent", null, "Постоянный шрам") });
      return { ...armor, applied: 0, prevented: armor.applied, scar: true, before, after: before };
    }
    if (armor.applied > 0) await this.adjustDamage(-armor.applied);
    const after = Math.max(0, Number(this.system.resources?.damage?.value) || 0);
    return { ...armor, before, after };
  }

  async applyHarm(amount, {
    isAttack = true,
    ignoreArmor = false,
    weakSpot = false,
    allowProtection = true,
    allowScar = false
  } = {}) {
    const requested = Math.max(0, Math.trunc(Number(amount) || 0));
    const protection = allowProtection && isAttack ? this.getStatus("cover") : null;
    const protector = protection ? await resolveActorDocument(protection.sourceUuid) : null;

    if (!protector || protector.uuid === this.uuid || !protector.system?.resources?.damage) {
      return this._applyDirectHarm(requested, {
        isAttack,
        ignoreArmor: ignoreArmor || weakSpot,
        allowScar
      });
    }

    const oddTo = systemSetting("protectOddHarm", "target");
    const split = splitProtectedHarm(requested, { oddTo });
    const target = await this._applyDirectHarm(split.target, {
      isAttack,
      ignoreArmor: ignoreArmor || weakSpot,
      allowScar
    });
    const protectedBy = typeof protector._applyDirectHarm === "function"
      ? await protector._applyDirectHarm(split.protector, { isAttack, ignoreArmor, allowScar })
      : (await protector.adjustDamage?.(-split.protector), { requested: split.protector, applied: split.protector });
    return { requested, split, target, protector: protectedBy, protectorUuid: protector.uuid };
  }

  async heal(amount) {
    const requested = Math.max(0, Math.trunc(Number(amount) || 0));
    const before = Math.max(0, Number(this.system.resources?.damage?.value) || 0);
    if (requested > 0) await this.adjustDamage(requested);
    const after = Math.max(0, Number(this.system.resources?.damage?.value) || 0);
    return { requested, applied: Math.max(0, after - before), before, after };
  }

  hasStatus(id) {
    return this.system.statuses?.some((status) => status.id === id) ?? false;
  }

  getStatus(id) {
    return this.system.statuses?.find((status) => status.id === id) ?? null;
  }

  async _toggleCoreStatusEffect(id, options) {
    const baseToggle = Object.getPrototypeOf(DaisyActor.prototype)?.toggleStatusEffect;
    if (typeof baseToggle !== "function") return options.active;
    return baseToggle.call(this, id, options);
  }

  async syncStatusEffects({ overlayIds = [] } = {}) {
    if (!this.effects || typeof Object.getPrototypeOf(DaisyActor.prototype)?.toggleStatusEffect !== "function") {
      return;
    }
    const managedIds = new Set(Object.keys(STATUS_DEFINITIONS));
    const desiredIds = new Set((this.system.statuses ?? [])
      .map((status) => status.id)
      .filter((id) => managedIds.has(id)));
    const activeIds = new Set();
    for (const effect of this.effects) {
      for (const id of effect.statuses ?? []) {
        if (managedIds.has(id)) activeIds.add(id);
      }
    }
    const overlays = new Set(overlayIds);
    for (const id of desiredIds) {
      if (!activeIds.has(id)) {
        await this._toggleCoreStatusEffect(id, { active: true, overlay: overlays.has(id) });
      }
    }
    for (const id of activeIds) {
      if (!desiredIds.has(id)) await this._toggleCoreStatusEffect(id, { active: false, overlay: false });
    }
  }

  async toggleStatusEffect(id, { active, overlay = false } = {}) {
    if (!STATUS_DEFINITIONS[id]) {
      return this._toggleCoreStatusEffect(id, { active, overlay });
    }
    const shouldActivate = active ?? !this.hasStatus(id);
    if (shouldActivate) {
      await this.addStatus(id, { durationUnit: "round" }, { overlay });
      return true;
    }
    await this.removeStatus(id);
    return false;
  }

  async addStatus(id, data = {}, { overlay = false } = {}) {
    if (!STATUS_DEFINITIONS[id]) {
      throw new Error(localize("DAISY.Errors.UnknownStatus", { id }, `Unknown Daisy Chainsaw status: ${id}`));
    }
    const statuses = foundry.utils.deepClone(this.system.statuses ?? []);
    const existing = statuses.find((status) => status.id === id);
    const durationUnit = id === "help"
      ? "roll"
      : id === "empowered" ? "attack"
      : id === "invocation" ? "turn" : String(data.durationUnit ?? "round");
    const defaultRemaining = id === "invocation" ? 2 : 1;
    const incomingRemaining = Math.max(
      defaultRemaining,
      Number(data.remaining ?? defaultRemaining) || 0
    );
    const incomingStacks = Math.max(1, Number(data.stacks ?? 1) || 1);
    const sourceUuid = String(data.sourceUuid ?? "");
    if (existing) {
      const currentRemaining = Math.max(0, Number(existing.remaining) || 0);
      const currentStacks = Math.max(1, Number(existing.stacks) || 1);

      if (id === "marked") {
        const sources = (existing.sources ?? [])
          .map((source) => typeof source === "string"
            ? { uuid: source, remaining: currentRemaining }
            : {
                uuid: String(source.uuid ?? ""),
                remaining: Math.max(0, Number(source.remaining) || 0)
              })
          .filter((source) => source.uuid);
        if (existing.sourceUuid && !sources.some((source) => source.uuid === existing.sourceUuid)) {
          sources.push({ uuid: existing.sourceUuid, remaining: currentRemaining });
        }
        const trackedBefore = sources.length;
        const repeatedSource = sourceUuid
          ? sources.find((source) => source.uuid === sourceUuid)
          : null;
        if (repeatedSource) {
          repeatedSource.remaining += Math.max(1, incomingRemaining);
        } else if (sourceUuid) {
          sources.push({ uuid: sourceUuid, remaining: incomingRemaining });
        } else {
          existing.remaining = Math.max(currentRemaining, incomingRemaining);
          existing.stacks = currentStacks + incomingStacks;
        }
        if (sourceUuid) {
          const untrackedStacks = Math.max(0, currentStacks - trackedBefore) + (incomingStacks - 1);
          existing.sources = sources;
          existing.stacks = sources.length + untrackedStacks;
          existing.remaining = Math.max(
            untrackedStacks > 0 ? currentRemaining : 0,
            ...sources.map((source) => source.remaining)
          );
        }
        if (!existing.sourceUuid && sourceUuid) existing.sourceUuid = sourceUuid;
      } else {
        existing.remaining = Math.max(currentRemaining, incomingRemaining);
        existing.stacks = id === "invocation"
          ? Math.min(2, currentStacks + incomingStacks)
          : Math.max(currentStacks, incomingStacks);
        if (sourceUuid) existing.sourceUuid = sourceUuid;
      }

      if (data.durationUnit !== undefined || ["help", "empowered", "invocation"].includes(id)) {
        existing.durationUnit = durationUnit;
      }
      if (data.sourceLevel !== undefined) existing.sourceLevel = Math.max(0, Number(data.sourceLevel) || 0);
      if (data.sourceSuccesses !== undefined) {
        existing.sourceSuccesses = Math.max(0, Number(data.sourceSuccesses) || 0);
      }
      if (data.sourceName !== undefined) existing.sourceName = String(data.sourceName);
      if (data.detail !== undefined) existing.detail = String(data.detail);
    } else {
      statuses.push({
        id,
        remaining: incomingRemaining,
        durationUnit,
        stacks: id === "invocation" ? Math.min(2, incomingStacks) : incomingStacks,
        sourceLevel: Number(data.sourceLevel ?? 1),
        sourceSuccesses: Number(data.sourceSuccesses ?? 0),
        sourceUuid,
        sourceName: String(data.sourceName ?? ""),
        sources: id === "marked" && sourceUuid
          ? [{ uuid: sourceUuid, remaining: incomingRemaining }]
          : [],
        detail: String(data.detail ?? "")
      });
    }
    const update = await this.update({ "system.statuses": statuses });
    await this.syncStatusEffects({ overlayIds: overlay ? [id] : [] });
    return update;
  }

  async applyAilment(id, data = {}) {
    if (STATUS_DEFINITIONS[id]?.kind !== "ailment") return this.addStatus(id, data);
    const canInitiallyResist = this.type === "heroine" || (this.type === "enemy" && this.system.boss);
    if (canInitiallyResist) {
      const result = await this.rollSave({
        sourceSuccesses: data.sourceSuccesses,
        sourceLevel: data.sourceLevel,
        label: localize(
          "DAISY.Combat.Resistance",
          { status: localize(`DAISY.Status.${id}.Name`, null, STATUS_DEFINITIONS[id].name) },
          `Сопротивление: ${STATUS_DEFINITIONS[id].name}`
        )
      });
      if (result.successful) return { applied: false, prevented: true, result };
    }
    await this.addStatus(id, data);
    return { applied: true, prevented: false };
  }

  async applyStatus(id, data = {}) {
    return STATUS_DEFINITIONS[id]?.kind === "ailment"
      ? this.applyAilment(id, data)
      : this.addStatus(id, data);
  }

  async removeStatus(id) {
    const statuses = foundry.utils.deepClone(this.system.statuses ?? [])
      .filter((status) => status.id !== id);
    const update = await this.update({ "system.statuses": statuses });
    await this.syncStatusEffects();
    return update;
  }

  async consumeStatuses(ids) {
    const consumed = new Set(ids);
    const statuses = foundry.utils.deepClone(this.system.statuses ?? [])
      .filter((status) => !consumed.has(status.id));
    const update = await this.update({ "system.statuses": statuses });
    await this.syncStatusEffects();
    return update;
  }

  nextRollPool(basePool) {
    let pool = Number(basePool) || 0;
    const consumed = [];
    const modifiers = [];
    const help = this.getStatus("help");
    const invocation = this.getStatus("invocation");
    if (help) {
      pool += 1;
      consumed.push("help");
      modifiers.push(localize("DAISY.Chat.Roll.Help", null, "Помощь: +1 кость"));
    }
    if (invocation) {
      const stacks = Math.min(2, Math.max(1, Number(invocation.stacks) || 1));
      pool += stacks;
      consumed.push("invocation");
      modifiers.push(localize(
        "DAISY.Chat.Roll.Invocation",
        { count: stacks },
        `Воззвание: +${stacks} ${stacks === 1 ? "кость" : "кости"}`
      ));
    }
    return { pool: Math.max(0, pool), consumed, modifiers };
  }

  attackPool() {
    const nextRoll = this.nextRollPool(this.statistics.primary);
    let pool = nextRoll.pool;
    if (this.hasStatus("beyond")) pool += 2;
    if (this.hasStatus("entangled")) pool -= 2;
    if (this.hasStatus("poisoned")) pool -= 1;
    return { ...nextRoll, pool: Math.max(0, pool) };
  }

  resolveAttackTarget(target) {
    if (target?.documentName === "Actor") return target;
    if (target?.actor?.documentName === "Actor") return target.actor;
    if (typeof target === "string") {
      try {
        const document = globalThis.fromUuidSync?.(target);
        if (document?.documentName === "Actor") return document;
        if (document?.actor?.documentName === "Actor") return document.actor;
      } catch (_error) {
        // Ignore an invalid UUID and fall back to the current target.
      }
    }
    const firstTarget = globalThis.game?.user?.targets?.values?.().next?.().value;
    return firstTarget?.actor ?? null;
  }

  isRangedAttack(explicit) {
    if (typeof explicit === "boolean") return explicit;
    if (this.type === "enemy") return hasEnemyTrait(this.system.traits, "ranged");
    if (this.type !== "heroine") return false;
    return RANGED_WEAPON_SLUGS.includes(this.system.weapons?.main?.slug);
  }

  async rollAttack({ label = null, target = null, ranged = null, spendAction = true } = {}) {
    label ??= localize("DAISY.Combat.BasicAttack", null, "Обычная атака");
    if (spendAction && !await this.spendAction(1, label)) return null;
    const targetActor = this.resolveAttackTarget(target);
    const attack = this.attackPool();
    let pool = attack.pool;
    let threshold = Number(this.statistics.secondary || 1);
    let failureFaces = [6];
    let convertedFailures = 0;
    const modifiers = [...attack.modifiers];

    if (targetActor?.hasStatus?.("empowered")) {
      pool -= 1;
      modifiers.push(localize("DAISY.Chat.Attack.Empowered", null, "Усиление цели: -1 к Основному"));
    }
    if (targetActor?.hasStatus?.("beyond")) {
      pool -= 2;
      modifiers.push(localize("DAISY.Chat.Attack.TargetBeyond", null, "Цель За Пределом: -2 к Основному"));
    }
    if (targetActor?.hasStatus?.("entangled")) {
      threshold += 2;
      modifiers.push(localize("DAISY.Chat.Attack.TargetEntangled", null, "Цель Опутана: +2 к Вторичному"));
    }
    if (targetActor?.hasStatus?.("cover")) {
      failureFaces = [5, 6];
      modifiers.push(localize("DAISY.Chat.Attack.Protected", null, "Прикрытие: 5 и 6 провальны"));
    }
    const elusivePenalty = elusiveAttackPenalty(targetActor?.system?.traits, {
      ranged: this.isRangedAttack(ranged)
    });
    if (elusivePenalty) {
      pool += elusivePenalty;
      modifiers.push(localize(
        "DAISY.Chat.Attack.Elusive",
        { penalty: elusivePenalty },
        `Уворотливая цель: ${elusivePenalty} к Основному`
      ));
    }
    const marks = targetActor?.getStatus?.("marked");
    if (marks) {
      convertedFailures = Math.max(1, Number(marks.stacks) || 1);
      modifiers.push(localize(
        "DAISY.Chat.Attack.Marked",
        { count: convertedFailures },
        `Метка: ${convertedFailures} провальных костей становятся успехами`
      ));
    }

    const result = await evaluateDaisyTest({
      pool: Math.max(0, pool),
      threshold,
      failureFaces,
      convertedFailures
    });
    const targetData = targetActor ? { name: targetActor.name, uuid: targetActor.uuid } : null;
    await postDaisyTest({
      actor: this,
      label,
      result,
      target: targetData,
      kind: "attack",
      details: [
        localize(
          "DAISY.Combat.HarmPerSuccess",
          {
            target: targetActor
              ? localize("DAISY.Combat.TargetNamed", { name: targetActor.name }, ` цели ${targetActor.name}`)
              : ""
          },
          `Каждый успех наносит 1 урон${targetActor ? ` цели ${targetActor.name}` : ""}.`
        ),
        ...modifiers
      ].join(" ")
    });
    if (attack.consumed.length) await this.consumeStatuses(attack.consumed);
    if (targetActor?.hasStatus?.("empowered")) {
      await targetActor.consumeStatuses?.(["empowered"]);
    }
    return result;
  }

  async rollInitiativeCheck({ highestEnemyInitiative = null, rule = null } = {}) {
    if (this.type === "enemy") {
      return { successes: this.statistics.initiative, static: true };
    }
    if (this.type !== "heroine") return { successes: 0, static: true };
    const initiativeRule = rule ?? systemSetting("initiativeRule", "original");
    const combatEnemies = [...(globalThis.game?.combat?.combatants ?? [])]
      .filter((combatant) => combatant.actor?.type === "enemy" && !combatant.defeated)
      .map((combatant) => Number(combatant.actor.statistics?.initiative) || 0);
    const enemyInitiative = highestEnemyInitiative === null
      ? Math.max(0, ...combatEnemies)
      : Math.max(0, Number(highestEnemyInitiative) || 0);
    const threshold = initiativeRule === "russian"
      ? Number(this.system.attributes.focus.value)
      : enemyInitiative;
    const nextRoll = this.nextRollPool(this.statistics.primary);
    const result = await evaluateDaisyTest({
      pool: nextRoll.pool,
      threshold
    });
    await postDaisyTest({
      actor: this,
      label: localize("DAISY.Combat.Initiative", null, "Инициатива"),
      result,
      kind: "initiative",
      details: [
        initiativeRule === "russian"
          ? localize("DAISY.Combat.InitiativeRussianRule", null, "Успехи считаются по Фокусу.")
          : localize(
              "DAISY.Combat.InitiativeOriginalRule",
              { initiative: enemyInitiative },
              `Успехи считаются по наивысшей Инициативе врагов (${enemyInitiative}).`
            ),
        localize("DAISY.Combat.InitiativeTie", null, "При ничьей между героинями побеждает более высокий Фокус."),
        ...nextRoll.modifiers
      ].join(" ")
    });
    if (nextRoll.consumed.length) await this.consumeStatuses(nextRoll.consumed);
    return result;
  }

  async rollSave({ sourceSuccesses = 0, sourceLevel = 1, label = null } = {}) {
    label ??= localize("DAISY.Combat.Save", null, "Спасбросок");
    if (this.type !== "heroine" && !(this.type === "enemy" && this.system.boss)) {
      const roll = Roll.create("1d6");
      await roll.evaluate();
      const die = roll.dice[0].results[0].result;
      const result = {
        pool: 1,
        threshold: 6,
        results: [die],
        successes: die === 6 ? 1 : 0,
        exploded: 0,
        sixes: die === 6 ? 1 : 0,
        successful: die === 6,
        rolls: [roll]
      };
      await postDaisyTest({ actor: this, label, result, kind: "save", target: 1 });
      return result;
    }

    const pool = this.type === "heroine"
      ? this.system.attributes.strength.value
      : this.statistics.primary;
    const threshold = this.type === "heroine"
      ? this.system.attributes.focus.value
      : this.statistics.secondary;
    const target = saveTarget({ sourceSuccesses, sourceLevel });
    const nextRoll = this.nextRollPool(pool);
    const result = await evaluateDaisyTest({ pool: nextRoll.pool, threshold });
    result.successful = result.successes >= target;
    await postDaisyTest({
      actor: this,
      label,
      result,
      kind: "save",
      target,
      details: nextRoll.modifiers.join(" ")
    });
    if (nextRoll.consumed.length) await this.consumeStatuses(nextRoll.consumed);
    return result;
  }

  async rollCustomCheck({ pool, threshold, label = null }) {
    label ??= localize("DAISY.Combat.Check", null, "Проверка");
    const nextRoll = this.nextRollPool(pool);
    const result = await evaluateDaisyTest({ pool: nextRoll.pool, threshold });
    await postDaisyTest({
      actor: this,
      label,
      result,
      kind: "check",
      details: nextRoll.modifiers.join(" ")
    });
    if (nextRoll.consumed.length) await this.consumeStatuses(nextRoll.consumed);
    return result;
  }

  warnTargetRequired(entry) {
    globalThis.ui?.notifications?.warn?.(localize(
      "DAISY.Notifications.TargetRequired",
      { name: entry.name },
      `Выберите цель для «${entry.name}».`
    ));
  }

  async useManeuver(entry) {
    const targeted = new Set(["help", "cover"]);
    const target = targeted.has(entry.slug) ? this.resolveAttackTarget(null) : this;
    if (!target) {
      this.warnTargetRequired(entry);
      return null;
    }
    if (!await this.spendAction(1, entry.name)) return null;

    if (entry.slug === "help" && target.hasStatus?.("unconscious")) {
      return target.receiveHelpWhileUnconscious?.();
    }

    const result = await target.addStatus?.(entry.slug, {
      sourceUuid: this.uuid,
      sourceName: this.name
    });
    await postDaisyNotice({
      actor: this,
      title: entry.name,
      content: `<p>${entry.description}</p><p><strong>${localize("DAISY.Chat.Target", null, "Цель")}:</strong> ${target.name}</p>`,
      cssClass: "rule-entry"
    });
    return { entry, target, result };
  }

  async useStatusEntry(entry) {
    const id = entry.slug;
    if (id === "beyond") return this.goBeyond();
    const target = this.resolveAttackTarget(null);
    if (!target) {
      this.warnTargetRequired(entry);
      return null;
    }
    const timing = id === "beyond" || id === "unconscious"
      ? { remaining: 3, durationUnit: "turn" }
      : { remaining: 1, durationUnit: "round" };
    const result = await target.applyStatus?.(id, {
      ...timing,
      sourceUuid: this.uuid,
      sourceName: this.name,
      sourceLevel: this.effectiveLevel,
      sourceSuccesses: 0
    });
    if (STATUS_DEFINITIONS[id]?.kind !== "ailment") {
      await postDaisyNotice({
        actor: this,
        title: entry.name,
        content: `<p>${entry.description}</p><p><strong>${localize("DAISY.Chat.Target", null, "Цель")}:</strong> ${target.name}</p>`,
        cssClass: "rule-entry"
      });
    }
    return { entry, target, result };
  }

  async useRuleEntry(entry) {
    if (!entry) return null;
    if (entry.kind === "maneuver") return this.useManeuver(entry);
    if (entry.kind === "status") return this.useStatusEntry(entry);
    if (entry.kind === "spell" && this.hasStatus("burning")) {
      ui.notifications.warn(localize(
        "DAISY.Notifications.CannotCastWhileAflame",
        null,
        "Героиня в огне и не может использовать заклинания."
      ));
      return null;
    }
    if (["spell", "ability"].includes(entry.kind) && entry.activation !== "passive") {
      const cost = entry.activation === "two-actions" ? 2 : 1;
      if (!await this.spendAction(cost, entry.name)) return null;
    }

    let burnout = null;
    let gainsBurnout = shouldGainBurnout(entry);
    if (entry.kind === "ability" && systemSetting("burnoutAbilities", "damageOnly") === "all") {
      gainsBurnout = true;
    }
    if (this.type === "heroine" && gainsBurnout && !this.hasStatus("beyond")) {
      const cost = Number(entry.level);
      const maximum = burnoutLimit(this.effectiveLevel);
      const overflow = Math.max(0, this.burnoutValue + cost - maximum);
      let die = 0;
      if (overflow > 0) {
        const roll = Roll.create("1d6");
        await roll.evaluate();
        die = roll.dice[0].results[0].result;
      }
      burnout = burnoutOutcome({
        die,
        current: this.burnoutValue,
        cost,
        level: this.effectiveLevel
      });
      await this.setBurnout(burnout.next);
      if (burnout.failed) await this.adjustDamage(-1);
    }

    const burnoutText = burnout
      ? `<p><strong>${localize("DAISY.Chat.Burnout.Title", null, "Выгорание")}:</strong> `
        + `${localize("DAISY.Chat.Burnout.Value", { value: burnout.next, maximum: burnout.maximum }, `${burnout.next}/${burnout.maximum}`)}; `
        + `${burnout.checked
          ? localize("DAISY.Chat.Burnout.Roll", burnout, `1к6 (${burnout.die}) + превышение (${burnout.overflow}) = ${burnout.total}.`)
          : localize("DAISY.Chat.Burnout.WithinLimit", null, "Лимит не превышен.")} `
        + `${burnout.failed
          ? localize("DAISY.Chat.Burnout.ActionFailed", null, "Действие провалено, получен 1 урон.")
          : localize("DAISY.Chat.Burnout.ActionSucceeded", null, "Действие не провалено.")}</p>`
      : "";
    await postDaisyNotice({
      actor: this,
      title: entry.name,
      content: `<p>${entry.description}</p>${burnoutText}`,
      cssClass: burnout?.failed ? "failure" : "rule-entry"
    });
    return { entry, burnout, failed: burnout?.failed ?? false };
  }

  async addSelection(collection, slug) {
    const allowed = new Set(["abilities", "spells", "traits"]);
    if (!allowed.has(collection)) throw new Error(`Unsupported collection: ${collection}`);
    if (collection === "traits" && this.type === "heroine") {
      throw new Error("Heroine traits are free-form rows; use addTraitRow().");
    }
    const current = [...(this.system[collection] ?? [])];
    if (!current.includes(slug)) current.push(slug);
    return this.update({ [`system.${collection}`]: current });
  }

  async removeSelection(collection, slug) {
    const allowed = new Set(["abilities", "spells", "traits"]);
    if (!allowed.has(collection)) throw new Error(`Unsupported collection: ${collection}`);
    const current = [...(this.system[collection] ?? [])].filter((value) => value !== slug);
    return this.update({ [`system.${collection}`]: current });
  }

  async addTraitRow({ name = null, note = "" } = {}) {
    name ??= localize("DAISY.Trait.New", null, "New Trait");
    if (this.type !== "heroine") throw new Error("Free-form trait rows belong to heroines.");
    const traits = foundry.utils.deepClone(this.system.traits ?? []);
    traits.push({ name, note });
    return this.update({ "system.traits": traits });
  }

  async removeTraitRow(index) {
    if (this.type !== "heroine") throw new Error("Free-form trait rows belong to heroines.");
    const traits = foundry.utils.deepClone(this.system.traits ?? []);
    traits.splice(Number(index), 1);
    return this.update({ "system.traits": traits });
  }

  canGoBeyond({
    enemyCount = 0,
    consciousHeroineCount = 0,
    bossPresent = false
  } = {}) {
    if (this.type !== "heroine") return { allowed: false, met: 0, requirements: {} };
    const activeCombatants = [...(globalThis.game?.combat?.combatants ?? [])]
      .filter((combatant) => !combatant.defeated && combatant.actor);
    if (activeCombatants.length) {
      enemyCount = activeCombatants.filter((combatant) => combatant.actor.type === "enemy").length;
      consciousHeroineCount = activeCombatants.filter(
        (combatant) => combatant.actor.type === "heroine"
          && !combatant.actor.hasStatus?.("unconscious")
      ).length;
      bossPresent = activeCombatants.some(
        (combatant) => combatant.actor.type === "enemy" && combatant.actor.system.boss
      );
    }
    const outnumbered = outnumberedRequirement({
      enemyCount,
      consciousHeroineCount,
      bossPresent
    });
    const nearlyDead = Number(this.system.resources.damage.value) === 1;
    const burnedOut = this.burnoutValue > burnoutLimit(this.effectiveLevel);
    return beyondRequirements({
      clearlyOutnumbered: outnumbered.clearlyOutnumbered,
      lastAgainstBoss: outnumbered.lastAgainstBoss,
      nearlyDead,
      burnedOut
    });
  }

  async goBeyond(context = {}) {
    const check = this.canGoBeyond(context);
    if (!check.allowed) {
      ui.notifications.warn(localize(
        "DAISY.PushLimits.NotEnoughRequirements",
        null,
        "Для выхода За Предел нужно выполнить как минимум два требования."
      ));
      return false;
    }
    await this.addStatus("beyond", { remaining: 3, durationUnit: "turn" });
    await postDaisyNotice({
      actor: this,
      title: localize("DAISY.Chat.PushLimits.Title", null, "За Пределом"),
      content: `<p>${localize("DAISY.Chat.PushLimits.Content", null, "На 3 хода: атаки по героине получают -2 к Основному, её атаки получают +2 к Основному, способности не добавляют ПВ.")}</p>`,
      cssClass: "beyond"
    });
    return true;
  }

  async extendBeyond(consumedStatusId) {
    const helpful = new Set(["help", "empowered", "invocation", "improvised", "cover"]);
    if (!this.hasStatus("beyond") || !helpful.has(consumedStatusId) || !this.hasStatus(consumedStatusId)) {
      return false;
    }
    const statuses = foundry.utils.deepClone(this.system.statuses ?? []);
    const beyond = statuses.find((status) => status.id === "beyond");
    beyond.remaining += 1;
    const next = statuses.filter((status) => status.id !== consumedStatusId);
    await this.update({ "system.statuses": next });
    await this.syncStatusEffects();
    return true;
  }

  async receiveHelpWhileUnconscious() {
    const unconscious = this.getStatus("unconscious");
    if (!unconscious || Number(unconscious.remaining) <= 0) return false;
    await this.removeStatus("unconscious");
    await this.setFlag("daisy-chainsaw", "recoverAfterCombat", true);
    await postDaisyNotice({
      actor: this,
      title: localize("DAISY.Chat.Assisted.Title", null, "Помощь оказана"),
      content: `<p>${localize("DAISY.Chat.Assisted.Content", null, "Героиня остаётся без сознания и восстановит 1 ПУ в конце боя.")}</p>`,
      cssClass: "notice"
    });
    return true;
  }

  async escapeDeathWithScar({ scar = null } = {}) {
    scar ??= localize("DAISY.Scar.Default", null, "Новый шрам");
    if (this.type !== "heroine" || this.system.resources.scarUsed) return false;
    const traits = foundry.utils.deepClone(this.system.traits ?? []);
    traits.push({
      name: scar,
      note: localize("DAISY.Scar.Note", null, "Постоянный шрам; виден после превращения.")
    });
    await this.update({
      "system.resources.scarUsed": true,
      "system.traits": traits
    });
    await this.addStatus("beyond", { remaining: 3, durationUnit: "turn" });
    await postDaisyNotice({
      actor: this,
      title: localize("DAISY.Chat.Scar.Title", null, "Смертельный удар отражён"),
      content: `<p>${localize(
        "DAISY.Chat.Scar.Content",
        { scar },
        `Урон полностью отменён. Героиня получает постоянный шрам «${scar}» и немедленно выходит За Предел.`
      )}</p>`,
      cssClass: "beyond"
    });
    return true;
  }
}
