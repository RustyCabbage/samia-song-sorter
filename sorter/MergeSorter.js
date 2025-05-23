/**
 * Merge Sort implementation extending BaseSorter
 */
class MergeSorter extends BaseSorter {
  constructor() {
    super();
  }

  /**
   * Main sort implementation for merge sort
   */
  async sort(songs) {
    const lists = songs.map(song => [song]);
    return await this.mergeSort(lists);
  }

  /**
   * Calculate worst case comparisons for merge sort
   */
  calculateWorstCase(n) {
    return n * Math.ceil(Math.log2(n)) - 2 ** Math.ceil(Math.log2(n)) + 1;
  }

  /**
   * Calculate best case comparisons for merge sort
   */
  calculateBestCase(n) {
    let total = 0;
    for (let size = 1; size < n; size *= 2) {
      const fullMerges = Math.floor(n / (2 * size));
      const rem = n % (2 * size);
      const partial = Math.max(0, rem - size);
      total += size * fullMerges + partial;
    }
    return total;
  }

  /**
   * Recursive merge sort function
   */
  async mergeSort(lists) {
    if (lists.length <= 1) {
      return lists[0] || [];
    }

    const mergedLists = [];
    for (let i = 0; i < lists.length; i += 2) {
      if (i + 1 < lists.length) {
        const mergedList = await this.merge(lists[i], lists[i + 1]);
        mergedLists.push(mergedList);
      } else {
        mergedLists.unshift(lists[i]);
      }
    }

    return this.mergeSort(mergedLists);
  }

  /**
   * Merge two sorted lists with user input
   */
  async merge(left, right) {
    const merged = [];
    let leftIndex = 0;
    let rightIndex = 0;

    while (leftIndex < left.length || rightIndex < right.length) {
      if (leftIndex >= left.length) {
        merged.push(...right.slice(rightIndex));
        break;
      }

      if (rightIndex >= right.length) {
        merged.push(...left.slice(leftIndex));
        break;
      }

      const songA = left[leftIndex];
      const songB = right[rightIndex];

      const pref = await this.doComparison(songA, songB);
      this.recordPreference(pref.chosen, pref.rejected, pref.type);
      this.updateMergeSortEstimates(pref.selectedLeft, left.length - (leftIndex + 1), right.length - (rightIndex + 1));

      if (pref.selectedLeft) {
        merged.push(songA);
        leftIndex++;
      } else {
        merged.push(songB);
        rightIndex++;
      }
    }
    return merged;
  }

  /**
   * Update the best and the worst case estimates based on user selection for merge sort
   */
  updateMergeSortEstimates(selectedLeft, leftIndexFromRight, rightIndexFromRight) {
    if (leftIndexFromRight === rightIndexFromRight) {
      return;
    }

    if (selectedLeft) {
      if (leftIndexFromRight > rightIndexFromRight) {
        this.sortState.comparisons.bestCase++;
      } else if (leftIndexFromRight === 0 && rightIndexFromRight > 0) {
        this.sortState.comparisons.worstCase -= rightIndexFromRight;
      }
    } else {
      if (rightIndexFromRight > leftIndexFromRight) {
        this.sortState.comparisons.bestCase++;
      } else if (rightIndexFromRight === 0 && leftIndexFromRight > 0) {
        this.sortState.comparisons.worstCase -= leftIndexFromRight;
      }
    }
  }
}