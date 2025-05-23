/**
 * Factory class for creating sorting instances and managing the public API
 */
class SongSorterFactory {
  constructor() {
    this.currentSorter = null;
  }

  createSorter(useMergeInsertion = false) {
    if (useMergeInsertion) {
      this.currentSorter = new MergeInsertionSorter();
    } else {
      this.currentSorter = new MergeSorter();
    }
    return this.currentSorter;
  }

  async startSorting(songs, shuffle = false, useMergeInsertion = false) {
    const sorter = this.createSorter(useMergeInsertion);
    return await sorter.startSorting(songs, shuffle);
  }

  handleOption(selectedLeft) {
    if (this.currentSorter) {
      this.currentSorter.handleOption(selectedLeft);
    }
  }

  getDecisionHistory() {
    return this.currentSorter ? this.currentSorter.getDecisionHistory() : [];
  }

  addImportedDecision(decision) {
    if (this.currentSorter) {
      this.currentSorter.addImportedDecision(decision);
    }
  }

  checkCurrentComparison() {
    if (this.currentSorter) {
      this.currentSorter.checkCurrentComparison();
    }
  }
}

// Create global instance
const songSorterFactory = new SongSorterFactory();

// Global decisionHistory property for backwards compatibility
Object.defineProperty(window, 'decisionHistory', {
  get: function() {
    return songSorterFactory.getDecisionHistory();
  }
});