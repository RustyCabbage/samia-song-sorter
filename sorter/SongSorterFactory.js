import MergeSorter from './MergeSorter.js';
import MergeInsertionSorter from './MergeInsertionSorter.js';

/**
 * Factory class for creating sorting instances and managing the public API
 */
export class SongSorterFactory {
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

// Create and export singleton instance
export const songSorterFactory = new SongSorterFactory();

// Named exports for individual methods (maintains backward compatibility)
export const createSorter = (useMergeInsertion = false) => songSorterFactory.createSorter(useMergeInsertion);
export const startSorting = (songs, shuffle = false, useMergeInsertion = false) => songSorterFactory.startSorting(songs, shuffle, useMergeInsertion);
export const handleOption = (selectedLeft) => songSorterFactory.handleOption(selectedLeft);
export const getDecisionHistory = () => songSorterFactory.getDecisionHistory();
export const addImportedDecision = (decision) => songSorterFactory.addImportedDecision(decision);
export const checkCurrentComparison = () => songSorterFactory.checkCurrentComparison();

// Default export of the singleton instance
export default songSorterFactory;