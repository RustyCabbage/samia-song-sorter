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

  /**
   * Check if adding a decision would create a cycle in the graph
   * @param {Array} existingDecisions - Current decision history
   * @param {Object} newDecision - Decision to test: {chosen, rejected}
   * @returns {boolean} - True if adding this decision would create a cycle
   */
  wouldCreateCycle(existingDecisions, newDecision) {
    // Build adjacency list from existing decisions
    const graph = new Map();
    const allNodes = new Set();

    // Add existing decisions to graph
    existingDecisions.forEach(({chosen, rejected}) => {
      allNodes.add(chosen);
      allNodes.add(rejected);

      if (!graph.has(chosen)) {
        graph.set(chosen, new Set());
      }
      graph.get(chosen).add(rejected);
    });

    // Add the new decision temporarily
    const {chosen, rejected} = newDecision;
    allNodes.add(chosen);
    allNodes.add(rejected);

    if (!graph.has(chosen)) {
      graph.set(chosen, new Set());
    }
    graph.get(chosen).add(rejected);

    // Check if there's now a path from rejected back to chosen (which would be a cycle)
    return this.hasPath(graph, rejected, chosen);
  }

  /**
   * Check if there's a path from source to target in the graph using DFS
   * @param {Map} graph - Adjacency list representation
   * @param {string} source - Starting node
   * @param {string} target - Target node
   * @returns {boolean} - True if path exists
   */
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

    // Use Maps for O(1) lookups for direct duplicates
    const existingDecisions = new Map();

    currentHistory.forEach(decision => {
      existingDecisions.set(`${decision.chosen}|${decision.rejected}`, true);
    });

    let stats = {addedCount: 0, skippedCount: 0, conflictCount: 0, cleanedCount: 0, cycleCount: 0};
    let importArray = decisions;

    if (state.useCleanPrefs) {
      const transitiveClosure = computeTransitiveClosure(decisions);
      const filteredClosure = transitiveClosure.filter(d => currentSongList.songs.includes(d.chosen) && currentSongList.songs.includes(d.rejected));
      importArray = computeTransitiveReduction(filteredClosure, true);
      stats.cleanedCount = decisions.length - importArray.length;
      console.log(`Transitive processing: ${transitiveClosure.length} → ${filteredClosure.length} → ${importArray.length}`);
    }

    // Keep track of decisions as we add them for cycle detection
    const workingHistory = [...currentHistory];

    for (const decision of importArray) {
      if (!currentSongList.songs.includes(decision.chosen) || !currentSongList.songs.includes(decision.rejected)) {
        stats.cleanedCount++;
        continue;
      }

      const key = `${decision.chosen}|${decision.rejected}`;

      // Check for exact duplicate
      if (existingDecisions.has(key)) {
        stats.skippedCount++;
        continue;
      }

      // Check if this would create a cycle
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

    const totalConflicts = stats.conflictCount + stats.cycleCount;
    const conflictMessage = totalConflicts > 0 ? `, ${totalConflicts} conflicts` : '';
    const message = `Imported ${decisions.length} decisions: ${stats.addedCount} added, ${stats.skippedCount} skipped, ${stats.cleanedCount} cleaned${conflictMessage}`;
    notificationManager.showNotification(message, true, 5000, true);

    // Detailed console logging
    const cycleMessage = stats.cycleCount > 0 ? `, ${stats.cycleCount} cycles` : '';
    const detailedMessage = `Imported ${decisions.length} decisions: ${stats.addedCount} added, ${stats.skippedCount} skipped, ${stats.cleanedCount} cleaned${cycleMessage}`;
    console.log(detailedMessage);

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