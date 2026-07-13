export function coreGeneration() {
  return Number(game?.release?.generation ?? 13);
}

export function messageModes() {
  return coreGeneration() >= 14
    ? CONFIG.ChatMessage?.modes
    : CONFIG.Dice?.rollModes;
}

export function applyMessageMode(data, mode) {
  if (!mode) return data;
  if (coreGeneration() >= 14 && ChatMessage.applyMode) {
    ChatMessage.applyMode(data, mode);
  } else if (ChatMessage.applyRollMode) {
    ChatMessage.applyRollMode(data, mode);
  }
  return data;
}

export async function renderSystemTemplate(path, data) {
  const renderer = foundry?.applications?.handlebars?.renderTemplate ?? globalThis.renderTemplate;
  return renderer(path, data);
}

export function registerDocumentSheet(documentClass, namespace, sheetClass, options) {
  const config = foundry.applications.apps.DocumentSheetConfig;
  return config.registerSheet(documentClass, namespace, sheetClass, options);
}

export function unregisterDocumentSheets(documentClass, namespace) {
  const config = foundry.applications.apps.DocumentSheetConfig;
  try {
    return config.unregisterSheet(documentClass, namespace);
  } catch (_error) {
    return undefined;
  }
}
