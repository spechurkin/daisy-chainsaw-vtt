import { SYSTEM_ID } from "../constants.mjs";
import { postDaisyNotice } from "../dice/daisy-roll.mjs";

function tableResults(table) {
  return Array.isArray(table?.results) ? table.results : [];
}

export async function rollCatalogTable(table, { actor = null } = {}) {
  const results = tableResults(table);
  if (!results.length) throw new Error(game.i18n.localize("DAISY.Errors.EmptyTable"));
  const faces = Math.max(...results.map((entry) => Number(entry.result) || 0), results.length);
  const roll = Roll.create(`1d${faces}`);
  await roll.evaluate();
  const value = Number(roll.total);
  const result = results.find((entry) => Number(entry.result) === value)
    ?? results[Math.max(0, Math.min(results.length - 1, value - 1))];
  const content = `<p class="daisy-table-result"><strong>${foundry.utils.escapeHTML(result.name)}</strong></p>`;

  if (actor) {
    await postDaisyNotice({
      actor,
      title: table.name,
      content: `${content}<p>${game.i18n.format("DAISY.Chat.TableRoll", { value })}</p>`,
      cssClass: "table-result"
    });
  } else {
    await ChatMessage.create({
      content: `<article class="daisy-chat-card daisy-table-card"><header class="daisy-chat-header"><div><p class="daisy-chat-kicker">Daisy Chainsaw</p><h3>${foundry.utils.escapeHTML(table.name)}</h3></div><span class="daisy-chat-outcome">${value}</span></header>${content}</article>`,
      rolls: [roll],
      flags: { [SYSTEM_ID]: { type: "table", slug: table.slug, result: value } }
    });
  }
  return { table, roll, value, result };
}

export function randomTableResult(table) {
  const results = tableResults(table);
  if (!results.length) return null;
  return results[Math.floor(Math.random() * results.length)] ?? null;
}
