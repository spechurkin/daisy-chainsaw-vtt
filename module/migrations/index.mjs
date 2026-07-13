import { SCHEMA_VERSION, SYSTEM_ID } from "../constants.mjs";

function actorMigrationData(actor) {
  const current = Number(actor.system.schemaVersion ?? 0);
  if (current >= SCHEMA_VERSION) return null;
  const update = { "system.schemaVersion": SCHEMA_VERSION };

  if (Array.isArray(actor.system.statuses)) {
    update["system.statuses"] = actor.system.statuses.map((status) => ({
      ...status,
      sourceUuid: String(status.sourceUuid ?? ""),
      sources: Array.isArray(status.sources) ? status.sources : []
    }));
  }

  if (actor.type === "heroine") {
    const heart = Number(actor.system.attributes?.heart?.value ?? 1);
    update["system.resources.damage.max"] = heart * 3;
    const level = Number(actor.system.level ?? 1);
    const limits = { 1: 10, 2: 12, 3: 14, 4: 16, 5: 18, 6: 20, 7: 22, 8: 26, 9: 30, 10: 34 };
    update["system.resources.burnout.max"] = limits[Math.max(1, Math.min(10, level))];
  } else if (actor.type === "team") {
    const level = Number(actor.system.level ?? 1);
    const limits = { 1: 10, 2: 12, 3: 14, 4: 16, 5: 18, 6: 20, 7: 22, 8: 26, 9: 30, 10: 34 };
    update["system.resources.burnout.max"] = limits[Math.max(1, Math.min(10, level))];
  }
  return update;
}

export async function migrateWorld() {
  if (!game.user?.isActiveGM) return;
  const stored = Number(game.settings.get(SYSTEM_ID, "schemaVersion") ?? 0);
  if (stored >= SCHEMA_VERSION) return;

  let migrated = 0;
  for (const actor of game.actors) {
    const update = actorMigrationData(actor);
    if (!update) continue;
    await actor.update(update);
    migrated += 1;
  }

  for (const item of game.items) {
    const current = Number(item.system.schemaVersion ?? 0);
    if (current >= SCHEMA_VERSION) continue;
    await item.update({ "system.schemaVersion": SCHEMA_VERSION });
    migrated += 1;
  }

  await game.settings.set(SYSTEM_ID, "schemaVersion", SCHEMA_VERSION);
  console.info(`${SYSTEM_ID} | Migration ${SCHEMA_VERSION} complete; ${migrated} documents updated.`);
}

export { actorMigrationData };
