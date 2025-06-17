// Import dependencies that were previously global
import {DOM, state} from './interface.js'; // DOM elements
import notificationManager from './NotificationManager.js';
import {
  topologicalSortPreferences, computeTransitiveReduction, computeTransitiveClosure
} from './GraphUtils.js'; // Preference processing utilities
import { addImportedDecision, checkCurrentComparison, getDecisionHistory } from './sorter/SongSorterFactory.js'; // Factory instance

/**
 * Manages clipboard operations and import/export functionality
 */
export class ImportExportManager {
  constructor() {
    this.LINE_REGEX = /^(?:I|X|\d)+\.\s+.+\s+>\s+.+$/;
    this.EXTRACT_REGEX = /^(?:I|X|\d)+\.\s+(?:"([^"]+)"|([^>]+))\s+>\s+(?:"([^"]+)"|(.+))$/;
  }

  /**
   * Initialize event listeners
   */
  initialize() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    const handlers = {
      click: {
        closeModal: () => this.closeImportModal(),
        cancelImport: () => this.closeImportModal(),
        confirmImport: () => this.processImportedDecisions(),
        copyDecisionsButton: () => this.copyToClipboard('decisions', state.currentSongList),
        importDecisionsButton: () => this.openImportModal(),
        copyButton: () => this.copyToClipboard('ranking', state.currentSongList),
        copyHistoryButton: () => this.copyToClipboard('history', state.currentSongList),
      }
    };

    // Batch event listener setup
    Object.entries(handlers.click).forEach(([id, handler]) => {
      DOM[id]?.addEventListener('click', handler);
    });

    // Modal-specific listeners
    DOM.importModal.addEventListener('click', e => e.target === DOM.importModal && this.closeImportModal());
    DOM.importModal.addEventListener('keydown', e => {
      if (e.key === 'Escape') this.closeImportModal(); else if (e.key === 'Enter' && e.ctrlKey) this.processImportedDecisions();
    });
  }

  copyToClipboard(type, currentSongList) {
    const copyTypes = {
      ranking: () => {
        const songs = Array.from(DOM.resultList.children, (el, i) => `${i + 1}. ${el.textContent}`);
        return [`My ${currentSongList.name} Song Ranking:\n\n${songs.join('\n')}`, "Ranking copied to clipboard!"];
      },
      decisions: () => this.formatDecisions(currentSongList, true),
      history: () => this.formatDecisions(currentSongList, false)
    };

    const [textToCopy, successMessage] = copyTypes[type]();

    navigator.clipboard.writeText(textToCopy)
      .then(() => notificationManager.showNotification(successMessage, true))
      .catch(err => {
        console.error('Failed to copy text:', err);
        notificationManager.showNotification("Copy failed. Please try again.", false);
      });
  }

  formatDecisions(currentSongList, isPartial) {
    const headerText = `${isPartial ? 'Partial ' : ''}${currentSongList.name} Decision History`;
    const hist = state.useCleanPrefs ? topologicalSortPreferences(computeTransitiveReduction(getDecisionHistory())) : getDecisionHistory();

    const filteredHist = hist.filter(d => d.type !== 'infer');
    const decisionsText = filteredHist.map((d, i) => `${i + 1}. ${d.chosen} > ${d.rejected}`);

    return [`My ${headerText}:\n\n${decisionsText.join('\n')}`, `${filteredHist.length} ${isPartial ? 'Preferences' : 'History entries'} copied to clipboard!`];
  }

  processImportedDecisions() {
    const text = DOM.importTextarea.value.trim();
    if (!text) {
      notificationManager.showNotification("No decisions to import", false);
      this.closeImportModal();
      return;
    }

    try {
      const parsedDecisions = this.parseImportedDecisions(text);
      if (!parsedDecisions.length) {
        notificationManager.showNotification("No valid decisions found", false);
        return;
      }

      this.importDecisions(parsedDecisions);
      checkCurrentComparison?.();
    } catch (error) {
      notificationManager.showNotification(`Error parsing decisions: ${error.message}`, false);
    }

    this.closeImportModal();
  }

  parseImportedDecisions(text) {
    return text.split('\n')
      .map(line => line.trim())
      .filter(line => this.LINE_REGEX.test(line))
      .map(line => {
        const match = line.match(this.EXTRACT_REGEX);
        if (!match) return null;

        const chosen = (match[1] || match[2])?.trim();
        const rejected = (match[3] || match[4])?.trim();

        return chosen && rejected ? {comparison: "X", chosen, rejected, type: 'import'} : null;
      })
      .filter(Boolean);
  }

  importDecisions(decisions) {
    const currentHistory = getDecisionHistory();
    const currentSongList = state.currentSongList;

    // Use Maps for O(1) lookups instead of Sets with string concatenation
    const existingDecisions = new Map();
    const conflictingDecisions = new Map();

    currentHistory.forEach(decision => {
      existingDecisions.set(`${decision.chosen}|${decision.rejected}`, true);
      conflictingDecisions.set(`${decision.rejected}|${decision.chosen}`, true);
    });

    let stats = {addedCount: 0, skippedCount: 0, conflictCount: 0, cleanedCount: 0};
    let importArray = decisions;

    if (state.useCleanPrefs) {
      const transitiveClosure = computeTransitiveClosure(decisions);
      const filteredClosure = transitiveClosure.filter(d => currentSongList.songs.includes(d.chosen) && currentSongList.songs.includes(d.rejected));
      importArray = computeTransitiveReduction(filteredClosure, true);
      stats.cleanedCount = decisions.length - importArray.length;
      console.log(`Transitive processing: ${transitiveClosure.length} → ${filteredClosure.length} → ${importArray.length}`);
    }

    for (const decision of importArray) {
      if (!currentSongList.songs.includes(decision.chosen) || !currentSongList.songs.includes(decision.rejected)) {
        stats.cleanedCount++;
        continue;
      }

      const key = `${decision.chosen}|${decision.rejected}`;

      if (existingDecisions.has(key)) {
        stats.skippedCount++;
        continue;
      }

      if (conflictingDecisions.has(key)) {
        stats.conflictCount++;
        continue;
      }

      addImportedDecision(decision);
      existingDecisions.set(key, true);
      conflictingDecisions.set(`${decision.rejected}|${decision.chosen}`, true);
      stats.addedCount++;
    }

    const message = `Imported ${decisions.length} decisions: ${stats.addedCount} added, ${stats.skippedCount} skipped, ${stats.conflictCount} conflicts, ${stats.cleanedCount} cleaned`;
    notificationManager.showNotification(message, true, 5000, true);
    console.log(message);

    return stats;
  }

  openImportModal() {
    DOM.importModal.hidden = false;
    requestAnimationFrame(() => {
      DOM.importTextarea.value = '';
      DOM.importTextarea.focus();
    });
  }

  closeImportModal() {
    DOM.importModal.hidden = true;
    DOM.importTextarea.value = '';
  }
}

export const importExportManager = new ImportExportManager();
export default importExportManager;