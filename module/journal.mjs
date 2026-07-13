const { JournalEntrySheet } = foundry.applications.sheets.journal;

export const JOURNAL_STYLES = Object.freeze({
  CLASSIC: "classic",
  WINDOWS_98: "98"
});

export function addJournalClasses(element, style = JOURNAL_STYLES.CLASSIC) {
  const rendered = element?.jquery ? element[0] : element;
  const root = rendered?.matches?.(".application, .app")
    ? rendered
    : rendered?.closest?.(".application, .app") ?? rendered;
  if (!root?.classList) return;
  const selectedStyle = Object.values(JOURNAL_STYLES).includes(style) ? style : JOURNAL_STYLES.CLASSIC;
  root.classList.add("daisy-journal", `daisy-journal-${selectedStyle}`);
  root.classList.remove(...Object.values(JOURNAL_STYLES)
    .filter((candidate) => candidate !== selectedStyle)
    .map((candidate) => `daisy-journal-${candidate}`));
  root.querySelectorAll?.(
    ".journal-page-content, .journal-entry-page, .editor-content, prose-mirror, .prosemirror"
  ).forEach((node) => node.classList.add("daisy-prose"));
}

class DaisyJournalSheet extends JournalEntrySheet {
  static JOURNAL_STYLE = JOURNAL_STYLES.CLASSIC;

  static DEFAULT_OPTIONS = {
    classes: ["daisy-journal"]
  };

  async _onRender(context, options) {
    await super._onRender(context, options);
    addJournalClasses(this.element, this.constructor.JOURNAL_STYLE);
  }
}

export class DaisyJournalClassicSheet extends DaisyJournalSheet {
  static JOURNAL_STYLE = JOURNAL_STYLES.CLASSIC;

  static DEFAULT_OPTIONS = {
    classes: ["daisy-journal-classic"]
  };
}

export class DaisyJournal98Sheet extends DaisyJournalSheet {
  static JOURNAL_STYLE = JOURNAL_STYLES.WINDOWS_98;

  static DEFAULT_OPTIONS = {
    classes: ["daisy-journal-98"]
  };
}

export function registerJournalStyling() {
  Hooks.on("createProseMirrorEditor", (_uuid, _plugins, options) => {
    if (options?.element?.closest?.(".daisy-journal")) options.element.classList.add("daisy-prose");
  });
}
