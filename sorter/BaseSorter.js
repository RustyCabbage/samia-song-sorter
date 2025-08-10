import {computeTransitiveClosure} from '../GraphUtils.js';
import notificationManager from '../NotificationManager.js';

/**
 * Shuffle an array using the Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} - Shuffled array
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Format the timestamp in local time: YYYY-MM-DD hh:mm:ss AM/PM
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
function formatLocalTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = date.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12; // Convert 0 to 12
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour12}:${minutes}:${seconds} ${ampm}`;
}

/**
 * Abstract base class for sorting algorithms
 * Handles shared functionality like comparisons, state management, and caching
 */
export default class BaseSorter {
  constructor() {
    this.sortState = {
      comparisons: {completed: 0, worstCase: 0, bestCase: 0},
      decisionHistory: [],
      compareQueue: [],
      lastDecisionTimestamp: null,
      inferCount: 0
    };

    this.cache = {
      preferences: new Map(), transitiveClosure: null, transitiveClosureVersion: 0
    };

    this.DOM = {
      progress: document.getElementById("progress"),
      comparison: document.getElementById("comparison"),
      btnA: document.getElementById("btnA"),
      btnB: document.getElementById("btnB")
    };
  }

  /**
   * Abstract method - must be implemented by subclasses
   */
  async sort(songs) {
    throw new Error("sort() method must be implemented by subclass");
  }

  /**
   * Abstract method - must be implemented by subclasses
   */
  calculateWorstCase(n) {
    throw new Error("calculateWorstCase() method must be implemented by subclass");
  }

  /**
   * Abstract method - must be implemented by subclasses
   */
  calculateBestCase(n) {
    throw new Error("calculateBestCase() method must be implemented by subclass");
  }

  /**
   * Main sorting entry point
   */
  async startSorting(songs, shuffle = false) {
    this.resetState();

    let songsToSort = [...songs];
    if (shuffle) {
      songsToSort = shuffleArray(songsToSort);
    }

    this.sortState.comparisons.worstCase = this.calculateWorstCase(songsToSort.length);
    this.sortState.comparisons.bestCase = this.calculateBestCase(songsToSort.length);

    return await this.sort(songsToSort);
  }

  /**
   * Handle comparison between two songs
   */
  async doComparison(songA, songB) {
    let pref = this.getKnownPreference(songA, songB);

    if (pref.selectedLeft === null) {
      this.sortState.inferCount = 0;
      pref = await this.requestUserComparison(songA, songB);
    } else {
      console.log(`Known comparison: ${(pref.selectedLeft) ? `${songA} > ${songB}` : `${songB} > ${songA}`}`);
      this.sortState.inferCount++;
    }

    if (pref.selectedLeft === null && pref.type === 'import') {
      pref = this.getKnownPreference(songA, songB);
      this.sortState.inferCount++;
    }

    const chosen = pref.selectedLeft ? songA : songB;
    const rejected = pref.selectedLeft ? songB : songA;

    if (this.sortState.inferCount > 0) {
      notificationManager.showNotification(`Inferred ${this.sortState.inferCount} comparisons from imported decisions`);
    }

    return {
      selectedLeft: pref.selectedLeft, chosen: chosen, rejected: rejected, type: pref.type
    };
  }

  /**
   * Request user comparison between two songs
   */
  requestUserComparison(songA, songB) {
    return new Promise(resolve => {
      const comparison = {
        songA: songA, songB: songB, resolve: resolve
      };

      this.sortState.compareQueue.push(comparison);

      if (this.sortState.compareQueue.length === 1) {
        requestAnimationFrame(() => this.showComparison());
      }
    });
  }

  /**
   * Display a comparison for the user
   */
  showComparison() {
    if (this.sortState.compareQueue.length === 0) return;

    const comparison = this.sortState.compareQueue[0];
    this.DOM.btnA.textContent = comparison.songA;
    this.DOM.btnB.textContent = comparison.songB;
    this.updateProgressDisplay();
  }

  /**
   * Handle user option selection
   */
  handleOption(selectedLeft) {
    if (this.sortState.compareQueue.length === 0) return;

    const comparison = this.sortState.compareQueue.shift();
    comparison.resolve({selectedLeft: selectedLeft, type: 'decision'});

    if (this.sortState.compareQueue.length > 0) {
      requestAnimationFrame(() => this.showComparison());
    }
  }

  /**
   * Record a preference decision
   */
  recordPreference(chosen, rejected, type = 'decision') {
    this.sortState.comparisons.completed++;

    const now = new Date();
    let elapsedTimeFormatted = " N/A  ";

    if (type === 'decision' && this.sortState.lastDecisionTimestamp) {
      const elapsedTime = now - this.sortState.lastDecisionTimestamp;
      const totalSeconds = Math.floor(elapsedTime / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      elapsedTimeFormatted = `${minutes}m:${seconds.toString().padStart(2, '0')}s`;
    }

    this.sortState.lastDecisionTimestamp = now;

    console.log(`${formatLocalTime(now)} | Time: ${elapsedTimeFormatted} | Comparison #${this.sortState.comparisons.completed}: ${chosen} > ${rejected}`);

    this.sortState.decisionHistory.push({
      comparison: this.sortState.comparisons.completed,
      chosen: chosen,
      rejected: rejected,
      elapsedTime: elapsedTimeFormatted,
      type: type
    });

    if (type === 'decision' || type === 'import') {
      this.invalidateCaches();
    }
  }

  /**
   * Update the progress display
   */
  updateProgressDisplay() {
    const progressPercentage = Math.round((this.sortState.comparisons.completed / this.sortState.comparisons.bestCase) * 100);
    this.DOM.progress.textContent = `Progress: ${progressPercentage}% sorted`;

    const comparisonText = (this.sortState.comparisons.bestCase === this.sortState.comparisons.worstCase)
      ? `Comparison #${this.sortState.comparisons.completed + 1} of ${this.sortState.comparisons.bestCase}`
      : `Comparison #${this.sortState.comparisons.completed + 1} of ${this.sortState.comparisons.bestCase} to ${this.sortState.comparisons.worstCase}`;

    if (this.DOM.comparison.textContent !== comparisonText) {
      this.DOM.comparison.textContent = comparisonText;
    }
  }

  /**
   * Get known preference between two songs
   */
  getKnownPreference(songA, songB) {
    //console.log(`Comparing left: ${songA} vs right: ${songB}`);
    const key = songA < songB ? `${songA}|${songB}` : `${songB}|${songA}`;
    const isReversed = songA >= songB;

    if (this.cache.preferences.has(key)) {
      const cached = this.cache.preferences.get(key);
      // NOTE: CACHED PREFERENCES ARE NEVER REVERSED
      const result = {
        selectedLeft: cached.selectedLeft, type: cached.type
      }
      //console.log("cached preferences", result);
      return result;
    }

    const directPrefs = this.getDirectPreferences();
    if (directPrefs.has(key)) {
      const pref = directPrefs.get(key);
      const result = {
        selectedLeft: isReversed ? !pref.selectedLeft : pref.selectedLeft, type: 'infer'
      };
      this.cache.preferences.set(key, result);
      //console.log("directPrefs passed:", result);
      return result;
    }

    const transitivePref = this.checkTransitivePreference(songA, songB);
    if (transitivePref.selectedLeft !== null) {
      this.cache.preferences.set(key, transitivePref);
      //console.log("transitivePref passed:", transitivePref);
      return transitivePref;
    }

    return {selectedLeft: null, type: null};
  }

  /**
   * Get direct preferences as a Map
   */
  getDirectPreferences() {
    const direct = new Map();
    for (const {chosen, rejected} of this.sortState.decisionHistory) {
      const key = chosen < rejected ? `${chosen}|${rejected}` : `${rejected}|${chosen}`;
      direct.set(key, {
        selectedLeft: chosen < rejected, type: 'direct'
      });
    }
    return direct;
  }

  /**
   * Check transitive preferences using cached closure
   */
  checkTransitivePreference(songA, songB) {
    if (!this.cache.transitiveClosure || this.cache.transitiveClosureVersion !== this.sortState.decisionHistory.length) {
      this.cache.transitiveClosure = computeTransitiveClosure(this.sortState.decisionHistory);
      this.cache.transitiveClosureVersion = this.sortState.decisionHistory.length;
    }

    for (const {chosen, rejected, type} of this.cache.transitiveClosure) {
      if (type === 'infer') {
        if (chosen === songA && rejected === songB) {
          return {selectedLeft: true, type: 'infer'};
        }
        if (chosen === songB && rejected === songA) {
          return {selectedLeft: false, type: 'infer'};
        }
      }
    }

    return {selectedLeft: null, type: null};
  }

  /**
   * Reset sorting state
   */
  resetState() {
    this.sortState.comparisons.completed = 0;
    this.sortState.decisionHistory = [];
    this.sortState.compareQueue = [];
    this.sortState.lastDecisionTimestamp = null;
    this.invalidateCaches();
  }

  /**
   * Invalidate caches
   */
  invalidateCaches() {
    this.cache.preferences.clear();
    this.cache.transitiveClosure = null;
    this.cache.transitiveClosureVersion = 0;
  }

  /**
   * Add imported decision
   */
  addImportedDecision(decision) {
    this.sortState.decisionHistory.push({
      comparison: "X", chosen: decision.chosen, rejected: decision.rejected, elapsedTime: null, type: 'import'
    });
    this.invalidateCaches();
  }

  /**
   * Check the current comparison after import
   */
  checkCurrentComparison() {
    if (!this.sortState.compareQueue || this.sortState.compareQueue.length === 0) return;

    const currentComparison = this.sortState.compareQueue[0];
    const pref = this.getKnownPreference(currentComparison.songA, currentComparison.songB);

    if (pref.selectedLeft !== null) {
      console.log(`After import, we now know: ${(pref.selectedLeft) ? `${currentComparison.songA} > ${currentComparison.songB}` : `${currentComparison.songB} > ${currentComparison.songA}`}`);
      this.sortState.compareQueue.shift();
      currentComparison.resolve({selectedLeft: null, type: 'import'});
      if (this.sortState.compareQueue.length > 0) {
        requestAnimationFrame(() => this.showComparison());
      }
    }
  }

  /**
   * Get decision history
   */
  getDecisionHistory() {
    return this.sortState.decisionHistory;
  }
}