import {DOM, state} from './interface.js';
import notificationManager from './NotificationManager.js';
import {
  topologicalSortPreferences, computeTransitiveReduction, computeTransitiveClosure
} from './GraphUtils.js';
import { addImportedDecision, checkCurrentComparison, getDecisionHistory } from './sorter/SongSorterFactory.js';

/**
 * Handles exporting decision history and rankings to clipboard
 */
export class DecisionExporter {
  initialize() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    const handlers = {
      copyDecisionsButton: () => this.exportDecisions(state.currentSongList, true),
      copyButton: () => this.exportRanking(state.currentSongList),
      copyHistoryButton: () => this.exportDecisions(state.currentSongList, false),
    };

    Object.entries(handlers).forEach(([id, handler]) => {
      DOM[id]?.addEventListener('click', handler);
    });
  }

  async copyToClipboard(text, successMessage) {
    try {
      await navigator.clipboard.writeText(text);
      notificationManager.showNotification(successMessage, true);
    } catch (err) {
      console.error('Failed to copy text:', err);
      notificationManager.showNotification("Copy failed. Please try again.", false);
    }
  }

  exportRanking(currentSongList) {
    const songs = Array.from(DOM.resultList.children, (el, i) => `${i + 1}. ${el.textContent}`);
    const textToCopy = `My ${currentSongList.name} Song Ranking:\n\n${songs.join('\n')}`;
    this.copyToClipboard(textToCopy, "Ranking copied to clipboard!");
  }

  exportDecisions(currentSongList, isPartial) {
    const headerText = `${isPartial ? 'Partial ' : ''}${currentSongList.name} Decision History`;
    const hist = state.useCleanPrefs ?
      topologicalSortPreferences(computeTransitiveReduction(getDecisionHistory())) :
      getDecisionHistory();

    const filteredHist = hist.filter(d => d.type !== 'infer');
    const decisionsText = filteredHist.map((d, i) => `${i + 1}. ${d.chosen} > ${d.rejected}`);
    const textToCopy = `My ${headerText}:\n\n${decisionsText.join('\n')}`;

    const successMessage = `${filteredHist.length} ${isPartial ? 'Preferences' : 'History entries'} copied to clipboard!`;
    this.copyToClipboard(textToCopy, successMessage);
  }
}

/**
 * Handles importing decision history from text input
 */
export class DecisionImporter {
  constructor() {
    this.LINE_REGEX = /^(?:I|X|\d)+\.\s+.+\s+>\s+.+$/;
    this.EXTRACT_REGEX = /^(?:I|X|\d)+\.\s+(?:"([^"]+)"|([^>]+))\s+>\s+(?:"([^"]+)"|(.+))$/;
  }

  initialize() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    const handlers = {
      closeModal: () => this.closeImportModal(),
      cancelImport: () => this.closeImportModal(),
      confirmImport: () => this.processImportedDecisions(),
      importDecisionsButton: () => this.openImportModal(),
    };

    Object.entries(handlers).forEach(([id, handler]) => {
      DOM[id]?.addEventListener('click', handler);
    });

    // Modal-specific listeners
    DOM.importModal.addEventListener('click', e => {
      if (e.target === DOM.importModal) this.closeImportModal();
    });

    DOM.importModal.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        this.closeImportModal();
      } else if (e.key === 'Enter' && e.ctrlKey) {
        this.processImportedDecisions();
      }
    });
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

  processImportedDecisions() {
    const text = DOM.importTextarea.value.trim();
    if (!text) {
      notificationManager.showNotification("No decisions to import", false);
      this.closeImportModal();
      return;
    }

    try {
      const parsedDecisions = this.parseDecisions(text);
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

  parseDecisions(text) {
    return text.split('\n')
      .map(line => line.trim())
      .filter(line => this.LINE_REGEX.test(line))
      .map(line => {
        const match = line.match(this.EXTRACT_REGEX);
        if (!match) return null;

        const chosen = (match[1] || match[2])?.trim();
        const rejected = (match[3] || match[4])?.trim();

        return chosen && rejected ? {
          comparison: "X",
          chosen,
          rejected,
          type: 'import'
        } : null;
      })
      .filter(Boolean);
  }

  importDecisions(decisions) {
    const currentHistory = getDecisionHistory();
    const currentSongList = state.currentSongList;
    const existingDecisions = this.createExistingDecisionsMap(currentHistory);

    let stats = {addedCount: 0, skippedCount: 0, conflictCount: 0, cleanedCount: 0, cycleCount: 0};
    let importArray = decisions;

    // Apply transitive processing if clean preferences is enabled
    if (state.useCleanPrefs) {
      importArray = this.processTransitiveDecisions(decisions, currentSongList, stats);
    }

    // Import the processed decisions
    const workingHistory = [...currentHistory];
    this.processDecisionArray(importArray, currentSongList, existingDecisions, workingHistory, stats);

    // Show results
    this.showImportResults(decisions.length, stats);
    return stats;
  }

  createExistingDecisionsMap(currentHistory) {
    const existingDecisions = new Map();
    currentHistory.forEach(decision => {
      existingDecisions.set(`${decision.chosen}|${decision.rejected}`, true);
    });
    return existingDecisions;
  }

  processTransitiveDecisions(decisions, currentSongList, stats) {
    const transitiveClosure = computeTransitiveClosure(decisions);
    const filteredClosure = transitiveClosure.filter(d =>
      currentSongList.songs.includes(d.chosen) &&
      currentSongList.songs.includes(d.rejected)
    );

    const reduced = computeTransitiveReduction(filteredClosure, true);
    stats.cleanedCount = decisions.length - reduced.length;

    console.log(`Transitive processing: closure (${transitiveClosure.length}) → filtered (${filteredClosure.length}) → reduced (${reduced.length})`);
    console.log('Songs being filtered out:',
      transitiveClosure.filter(d =>
        !currentSongList.songs.includes(d.chosen) ||
        !currentSongList.songs.includes(d.rejected)
      )
    );

    return reduced;
  }

  processDecisionArray(importArray, currentSongList, existingDecisions, workingHistory, stats) {
    for (const decision of importArray) {
      if (!this.isValidSongPair(decision, currentSongList)) {
        stats.cleanedCount++;
        continue;
      }

      const key = `${decision.chosen}|${decision.rejected}`;

      if (existingDecisions.has(key)) {
        stats.skippedCount++;
        continue;
      }

      if (this.wouldCreateCycle(workingHistory, decision)) {
        stats.cycleCount++;
        console.log(`Cycle detected: Adding "${decision.chosen} > ${decision.rejected}" would create a cycle`);
        continue;
      }

      // Decision is valid - add it
      addImportedDecision(decision);
      existingDecisions.set(key, true);
      workingHistory.push(decision);
      stats.addedCount++;
    }
  }

  isValidSongPair(decision, currentSongList) {
    return currentSongList.songs.includes(decision.chosen) &&
      currentSongList.songs.includes(decision.rejected);
  }

  showImportResults(originalCount, stats) {
    const totalConflicts = stats.conflictCount + stats.cycleCount;
    const conflictMessage = totalConflicts > 0 ? `, ${totalConflicts} conflicts` : '';
    const message = `Imported ${originalCount} decisions: ${stats.addedCount} added, ${stats.skippedCount} skipped, ${stats.cleanedCount} cleaned${conflictMessage}`;

    notificationManager.showNotification(message, true, 5000, true);

    const cycleMessage = stats.cycleCount > 0 ? `, ${stats.cycleCount} cycles` : '';
    const detailedMessage = `Imported ${originalCount} decisions: ${stats.addedCount} added, ${stats.skippedCount} skipped, ${stats.cleanedCount} cleaned${cycleMessage}`;
    console.log(detailedMessage);
  }

  wouldCreateCycle(existingDecisions, newDecision) {
    const graph = this.buildGraph(existingDecisions, newDecision);
    return this.hasPath(graph, newDecision.rejected, newDecision.chosen);
  }

  buildGraph(existingDecisions, newDecision) {
    const graph = new Map();
    const allDecisions = [...existingDecisions, newDecision];

    allDecisions.forEach(({chosen, rejected}) => {
      if (!graph.has(chosen)) {
        graph.set(chosen, new Set());
      }
      graph.get(chosen).add(rejected);
    });

    return graph;
  }

  hasPath(graph, source, target) {
    if (source === target) return true;
    if (!graph.has(source)) return false;

    const visited = new Set();
    const stack = [source];

    while (stack.length > 0) {
      const current = stack.pop();

      if (visited.has(current)) continue;
      visited.add(current);

      if (current === target) return true;

      if (graph.has(current)) {
        for (const neighbor of graph.get(current)) {
          if (!visited.has(neighbor)) {
            stack.push(neighbor);
          }
        }
      }
    }

    return false;
  }
}

/**
 * Main manager that coordinates import and export functionality
 */
export class ImportExportManager {
  constructor() {
    this.exporter = new DecisionExporter();
    this.importer = new DecisionImporter();
  }

  initialize() {
    this.exporter.initialize();
    this.importer.initialize();
  }

  // Delegate methods for backward compatibility
  copyToClipboard(type, currentSongList) {
    switch(type) {
      case 'ranking':
        this.exporter.exportRanking(currentSongList);
        break;
      case 'decisions':
        this.exporter.exportDecisions(currentSongList, true);
        break;
      case 'history':
        this.exporter.exportDecisions(currentSongList, false);
        break;
    }
  }
}

export const importExportManager = new ImportExportManager();
export default importExportManager;