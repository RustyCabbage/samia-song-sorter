import BaseSorter from './BaseSorter.js';

/**
 * Merge-Insertion Sort (Ford-Johnson algorithm) implementation extending BaseSorter
 */
export default class MergeInsertionSorter extends BaseSorter {
  constructor() {
    super();
    this.jacobsthalNumbers = [1, 1, 3, 5, 11, 21, 43, 85, 171];
    this.insertionGroups = [2, 2, 6, 10, 22, 42, 86, 170, 342];
  }

  /**
   * Main sort implementation for merge-insertion sort
   */
  async sort(songs) {
    const result = await this.mergeInsertionSort(songs);
    return result.reverse(); // Return in descending order
  }

  /**
   * Calculate worst case comparisons for merge-insertion sort
   */
  calculateWorstCase(n) {
    const z = (3 * n) / 4;
    const term1 = n * Math.ceil(Math.log2(z));
    const term2 = Math.floor(2 ** Math.floor(Math.log2(8 * z)) / 3);
    const term3 = Math.floor(Math.log2(8 * z) / 2);
    return term1 - term2 + term3;
  }

  /**
   * Calculate best case comparisons for merge-insertion sort
   */
  calculateBestCase(n) {
    return this.F(n) + this.G(n);
  }

  /**
   * Main merge-insertion sort function
   */
  async mergeInsertionSort(arr, depth = 0) {
    if (arr.length <= 1) {
      return arr;
    }

    // Step 1: Create pairs
    const pairs = [];
    for (let i = 0; i < arr.length - 1; i += 2) {
      pairs.push([arr[i], arr[i + 1]]);
    }
    const unpaired = arr.length % 2 === 1 ? arr[arr.length - 1] : null;

    // Step 2: Compare elements in each pair
    const orderedPairs = new Map();
    for (const pair of pairs) {
      const pref = await this.doComparison(pair[0], pair[1]);
      orderedPairs.set(pref.chosen, pref.rejected);
      this.recordPreference(pref.chosen, pref.rejected, pref.type);
    }

    // Step 3: Recursively sort the larger elements
    const largerElements = Array.from(orderedPairs.keys());
    const sortedLargerElements = await this.mergeInsertionSort(largerElements, depth + 1);

    // Prepare the result array with sorted larger elements
    const result = [...sortedLargerElements];

    // Step 4: Insert the element paired with the smallest element
    result.unshift(orderedPairs.get(result[0]));

    // Step 5: Insertion phase
    const remainingElements = [];
    for (let i = 1; i < sortedLargerElements.length; i++) {
      const smallerElement = orderedPairs.get(sortedLargerElements[i]);
      remainingElements.push(smallerElement);
    }

    if (unpaired !== null) {
      remainingElements.push(unpaired);
    }

    if (remainingElements.length === 0) {
      return result;
    }

    // Calculate insertion groups and reorder elements
    const insertionGroups = this.calculateInsertionGroups(remainingElements.length);
    const reorderedElements = this.reorderForInsertion(remainingElements, insertionGroups);

    // Create reverse map for finding larger elements
    const orderedPairsReversed = new Map();
    orderedPairs.forEach((value, key) => {
      orderedPairsReversed.set(value, key);
    });

    // Insert each element using binary search
    let groupIndex = 0;
    let currentGroupCount = 0;

    for (const elem of reorderedElements) {
      currentGroupCount++;
      const isLastInGroup = currentGroupCount === insertionGroups[groupIndex];

      let subsequenceOfS = [...result];
      const largerElement = orderedPairsReversed.get(elem);
      if (largerElement !== undefined) {
        const index = result.indexOf(largerElement);
        subsequenceOfS = result.slice(0, index);
      }

      const index = await this.getInsertionIndex(subsequenceOfS, elem, isLastInGroup);
      result.splice(index, 0, elem);

      if (isLastInGroup) {
        groupIndex++;
        currentGroupCount = 0;
      }
    }
    return result;
  }

  /**
   * Get insertion index through binary search
   */
  async getInsertionIndex(arr, elem, isLastInGroup) {
    let left = 0;
    let right = arr.length - 1;
    let keepUpdatingEstimates = true;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const pref = await this.doComparison(arr[mid], elem);

      this.recordPreference(pref.chosen, pref.rejected, pref.type);

      if (keepUpdatingEstimates) {
        keepUpdatingEstimates = this.updateMergeInsertionEstimates(
          pref.selectedLeft, arr.length, left, mid, right, isLastInGroup
        );
      }

      if (pref.selectedLeft) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }
    return left;
  }

  /**
   * Update estimates for merge-insertion sort
   *
   */
  updateMergeInsertionEstimates(selectedLeft, insertionLength, left, mid, right, isLastInGroup) {
    const shouldGoLeft = !Number.isInteger(Math.log2(insertionLength + 1));

    // Handle right direction case
    if (!shouldGoLeft && !isLastInGroup && selectedLeft) {
      this.sortState.comparisons.bestCase++;
      return false;
    }
    // Handle left direction case
    if (shouldGoLeft) {
      // Check for best case increment condition
      if ((right - left) % 2 !== 0 && Number.isInteger(Math.log2(right - mid + 1)) && !selectedLeft) {
        this.sortState.comparisons.bestCase++;
        return false;
      }
      if (selectedLeft) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
      if (left >= right) {
        this.sortState.comparisons.worstCase--;
        return false;
      }
    }
    return true;
  }

  /**
   * Get or compute Jacobsthal number at index n
   */
  getJacobsthalNumber(n) {
    while (this.jacobsthalNumbers.length <= n) {
      const len = this.jacobsthalNumbers.length;
      const next = this.jacobsthalNumbers[len - 1] + 2 * this.jacobsthalNumbers[len - 2];
      this.jacobsthalNumbers.push(next);
      this.insertionGroups.push(next * 2);
    }
    return this.jacobsthalNumbers[n];
  }

  /**
   * Calculate insertion groups using cached Jacobsthal numbers
   */
  calculateInsertionGroups(numElements) {
    const groups = [];
    let remainingElements = numElements;
    let insertionGroupIndex = 0;

    while (remainingElements > 0) {
      if (insertionGroupIndex > this.jacobsthalNumbers.length - 1) {
        this.getJacobsthalNumber(insertionGroupIndex);
      }

      const groupSize = Math.min(this.insertionGroups[insertionGroupIndex], remainingElements);
      groups.push(groupSize);
      remainingElements -= groupSize;
      insertionGroupIndex++;
    }
    return groups;
  }

  /**
   * Reorder elements for insertion according to the Ford-Johnson sequence
   */
  reorderForInsertion(elements, groups) {
    const result = [];
    let startIndex = 0;

    for (const groupSize of groups) {
      const group = elements.slice(startIndex, startIndex + groupSize);
      result.push(...group.reverse());
      startIndex += groupSize;
    }
    return result;
  }

  /**
   * Computes F(n) = F(⌊n/2⌋) + ⌊n/2⌋
   */
  F(n) {
    let total = 0;
    while (n > 1) {
      n = Math.floor(n / 2);
      total += n;
    }
    return total;
  }

  /**
   * Calculate the number of insertion comparisons in the best case
   */
  G(n) {
    if (n <= 2) {
      return 0;
    }

    const numInsertions = Math.floor((n - 1) / 2);
    const decomposition = this.calculateInsertionGroups(numInsertions);

    let numComparisons = 0;
    for (let i = 0; i < decomposition.length; i++) {
      numComparisons += decomposition[i] * (i + 1);
    }

    numComparisons += (decomposition.slice(-2).reduce((a, b) => a + b, 0) === 2 ** decomposition.length)
      ? decomposition.length
      : (decomposition.length - 1);

    return this.G(Math.floor(n / 2)) + numComparisons;
  }
}