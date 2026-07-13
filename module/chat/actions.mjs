import { SYSTEM_ID } from "../constants.mjs";

async function resolveUuid(uuid) {
  if (!uuid) return null;
  try {
    if (globalThis.fromUuid) return await globalThis.fromUuid(uuid);
    return globalThis.fromUuidSync?.(uuid) ?? null;
  } catch (_error) {
    return null;
  }
}

function selectedTargetActors() {
  return [...(game.user?.targets ?? [])]
    .map((target) => target?.actor)
    .filter(Boolean);
}

async function targetsForButton(button) {
  const explicit = await resolveUuid(button.dataset.targetUuid);
  const actor = explicit?.documentName === "Actor"
    ? explicit
    : explicit?.actor?.documentName === "Actor" ? explicit.actor : null;
  return actor ? [actor] : selectedTargetActors();
}

function applicationKey(action, actor) {
  return `${action}:${actor.uuid}`;
}

function alreadyApplied(message, key) {
  return (message.getFlag(SYSTEM_ID, "applications") ?? []).includes(key);
}

async function rememberApplication(message, key) {
  if (!message.isAuthor && !game.user?.isGM) return;
  const applications = [...(message.getFlag(SYSTEM_ID, "applications") ?? [])];
  if (!applications.includes(key)) applications.push(key);
  await message.setFlag(SYSTEM_ID, "applications", applications);
}

function canModify(actor) {
  return Boolean(game.user?.isGM || actor?.isOwner);
}

async function applyHarm(target, amount, source, message) {
  if (typeof target.applyHarm === "function") {
    return target.applyHarm(amount, { source, message, allowScar: true });
  }
  return target.adjustDamage?.(-amount);
}

async function heal(target, amount, source) {
  if (typeof target.heal === "function") return target.heal(amount, { source });
  return target.adjustDamage?.(amount);
}

async function applyStatus(target, button, source, message) {
  const id = button.dataset.statusId;
  if (!id) throw new Error(game.i18n.localize("DAISY.Errors.MissingStatus"));
  const result = message.getFlag(SYSTEM_ID, "result") ?? {};
  const data = {
    remaining: Number(button.dataset.duration || 1),
    durationUnit: button.dataset.durationUnit || "round",
    sourceUuid: source?.uuid ?? "",
    sourceName: source?.name ?? "",
    sourceLevel: Number(source?.effectiveLevel ?? source?.system?.level ?? 1),
    sourceSuccesses: Number(result.successes ?? 0)
  };
  if (typeof target.applyStatus === "function") return target.applyStatus(id, data);
  if (typeof target.applyAilment === "function") return target.applyAilment(id, data);
  return target.addStatus?.(id, data);
}

async function executeAction(action, target, button, source, message) {
  const amount = Math.max(0, Number(button.dataset.amount || 0));
  switch (action) {
    case "apply-harm": return applyHarm(target, amount, source, message);
    case "heal": return heal(target, amount, source);
    case "apply-status": return applyStatus(target, button, source, message);
    case "remove-status": return target.removeStatus?.(button.dataset.statusId);
    case "assist": {
      if (target.hasStatus?.("unconscious")) return target.receiveHelpWhileUnconscious?.();
      return target.addStatus?.("help", {
        remaining: 1,
        durationUnit: "round",
        sourceUuid: source?.uuid ?? "",
        sourceName: source?.name ?? ""
      });
    }
    default: throw new Error(game.i18n.format("DAISY.Errors.UnknownChatAction", { action }));
  }
}

async function onChatAction(event, button, message) {
  event.preventDefault();
  event.stopPropagation();
  const action = button.dataset.daisyChatAction;
  const targets = await targetsForButton(button);
  if (!targets.length) {
    ui.notifications?.warn(game.i18n.localize("DAISY.Errors.NoTarget"));
    return;
  }
  const source = await resolveUuid(message.getFlag(SYSTEM_ID, "actorUuid"));
  button.disabled = true;
  try {
    for (const target of targets) {
      if (!canModify(target)) {
        ui.notifications?.warn(game.i18n.localize("DAISY.Errors.NoPermission"));
        continue;
      }
      const key = applicationKey(action, target);
      if (alreadyApplied(message, key) && !event.shiftKey) {
        ui.notifications?.warn(game.i18n.format("DAISY.Notifications.AlreadyApplied", { name: target.name }));
        continue;
      }
      await executeAction(action, target, button, source, message);
      await rememberApplication(message, key);
    }
  } catch (error) {
    console.error("Daisy Chainsaw | Chat action failed.", error);
    ui.notifications?.error(error?.message ?? game.i18n.localize("DAISY.Errors.ChatActionFailed"));
  } finally {
    button.disabled = false;
  }
}

export function activateChatCard(message, html) {
  if (!html?.querySelectorAll) return;
  const applications = new Set(message.getFlag(SYSTEM_ID, "applications") ?? []);
  for (const button of html.querySelectorAll("[data-daisy-chat-action]")) {
    const targetUuid = button.dataset.targetUuid;
    if (targetUuid && applications.has(`${button.dataset.daisyChatAction}:${targetUuid}`)) {
      button.classList.add("is-applied");
      button.title = game.i18n.localize("DAISY.Chat.ShiftToRepeat");
    }
    if (button.dataset.daisyListenerAttached) continue;
    button.dataset.daisyListenerAttached = "true";
    button.addEventListener("click", (event) => onChatAction(event, button, message));
  }
}

export function registerChatCards() {
  Hooks.on("renderChatMessageHTML", activateChatCard);
}
