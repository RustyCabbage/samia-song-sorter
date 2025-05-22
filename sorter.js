/**
 * Song Sorter
 * Contains both merge sort and merge-insertion sort algorithms
 */

const SongSorter = (function () {
  // Consolidated state
  let sortState = {
    comparisons: {completed: 0, worstCase: 0, bestCase: 0},
    decisionHistory: [],
    compareQueue: [],
    lastDecisionTimestamp: null,
    inferCount: 0
  };

  // Caching systems
  const cache = {
    preferences: new Map(), // "songA|songB" -> {selectedLeft, type}
    transitiveClosure: null, transitiveClosureVersion: 0, jacobsthalNumbers: [1, 1, 3, 5, 11, 21, 43, 85, 171], // Pre-computed sequence
    insertionGroups: [2, 2, 6, 10, 22, 42, 86, 170, 342], // Pre-computed sequence
  };

  const DOM = {
    progress: document.getElementById("progress"),
    comparison: document.getElementById("comparison"),
    btnA: document.getElementById("btnA"),
    btnB: document.getElementById("btnB")
  };

  /******************************************
   * MERGE SORT IMPLEMENTATION
   ******************************************/

  /**
   * Main merge sort function
   * @param {Array} lists - Array of arrays to merge sort
   * @returns {Promise<Array>} - Promise that resolves to the sorted array
   */
  async function mergeSort(lists) {
    if (lists.length <= 1) {
      return lists[0] || [];
    }
    // Create pairs of lists to merge
    const mergedLists = [];
    for (let i = 0; i < lists.length; i += 2) {
      if (i + 1 < lists.length) {
        // Merge two lists
        const mergedList = await merge(lists[i], lists[i + 1]);
        mergedLists.push(mergedList);
      } else {
        // Odd number of lists, this one gets placed at the front
        mergedLists.unshift(lists[i]);
      }
    }
    // Continue to the next level of merge sort
    return mergeSort(mergedLists);
  }

  /**
   * Merge two sorted lists with user input
   * @param {Array} left - Left array
   * @param {Array} right - Right array
   * @returns {Promise<Array>} - Promise that resolves to the merged array
   */
  async function merge(left, right) {
    const merged = [];
    let leftIndex = 0;
    let rightIndex = 0;

    while (leftIndex < left.length || rightIndex < right.length) {
      // If one list is exhausted, add all items from the other
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

      const pref = await doComparison(songA, songB);
      recordPreference(pref.chosen, pref.rejected, pref.type);
      updateMergeSortEstimates(pref.selectedLeft, left.length - (leftIndex + 1), right.length - (rightIndex + 1));

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
   * Update the best and worst case estimates based on user selection for merge sort
   * @param {boolean} selectedLeft - Whether the left item was selected
   * @param {number} leftIndexFromRight - Index of the left item in its list from the right
   * @param {number} rightIndexFromRight - Index of the right item in its list from the right
   */
  function updateMergeSortEstimates(selectedLeft, leftIndexFromRight, rightIndexFromRight) {
    // If indexes are equal, no change needed
    if (leftIndexFromRight === rightIndexFromRight) {
      return;
    }

    // If indexes are unequal:
    if (selectedLeft) {
      // Selected left item
      if (leftIndexFromRight > rightIndexFromRight) {
        // Selected higher index - increase min estimate
        sortState.comparisons.bestCase++;
      } else if (leftIndexFromRight === 0 && rightIndexFromRight > 0) {
        // Selected 0 index when other is > 0 - decrease max estimate
        sortState.comparisons.worstCase -= rightIndexFromRight;
      }
    } else {
      // Selected right item
      if (rightIndexFromRight > leftIndexFromRight) {
        // Selected higher index - increase min estimate
        sortState.comparisons.bestCase++;
      } else if (rightIndexFromRight === 0 && leftIndexFromRight > 0) {
        // Selected 0 index when other is > 0 - decrease max estimate
        sortState.comparisons.worstCase -= leftIndexFromRight;
      }
    }
  }

  /**
   * Calculate the sum of the sizes of the smaller list in each merge step
   * @param {number} n - The number of elements in the list
   * @returns {number} - The sum of the sizes of the smaller list in each merge step
   */
  function getBestCaseMergeSort(n) {
    let total = 0;
    for (let size = 1; size < n; size *= 2) {
      // number of full-size merges of two sublists of length `size`
      const fullMerges = Math.floor(n / (2 * size));
      // leftover elements after those full merges
      const rem = n % (2 * size);
      // in the final (possibly partial) merge, we contribute any excess beyond `size`
      const partial = Math.max(0, rem - size);
      total += size * fullMerges + partial;
    }
    return total;
  }

  /******************************************
   * MERGE INSERTION SORT IMPLEMENTATION
   ******************************************/

  /**
   * Main merge-insertion sort function
   * @param {Array} arr - Array to sort
   * @param {number} depth - Recursion depth (for debug)
   * @returns {Promise<Array>} - Promise that resolves to the sorted array
   */
  async function mergeInsertionSort(arr, depth = 0) {
    //const indent = '  '.repeat(depth);
    //.log(`${indent}Recursion depth ${depth} - Input array: [${arr}]`);
    if (arr.length <= 1) {
      //console.log(`${indent}Only one element. Sort complete: [${arr}]`);
      //console.log(`${indent}<<<Exiting depth ${depth}>>>`);
      return arr;
    }

    // Step 1: Create floor(n/2) pairs
    const pairs = [];

    for (let i = 0; i < arr.length - 1; i += 2) {
      pairs.push([arr[i], arr[i + 1]]);
    }
    const unpaired = arr.length % 2 === 1 ? arr[arr.length - 1] : null;

    // Step 2: Compare elements in each pair (larger element first)
    const orderedPairs = new Map();
    for (const pair of pairs) {
      const pref = await doComparison(pair[0], pair[1]);
      orderedPairs.set(pref.chosen, pref.rejected);
      recordPreference(pref.chosen, pref.rejected, pref.type);
    }
    /* console.log(
      `${indent}Pairs: [`
      + pairs.map(pair => `(${pair[0]}:${pair[1]})`).join(", ")
      + "]"
    );
    /**/

    // Step 3: Recursively sort the larger elements
    const largerElements = Array.from(orderedPairs.keys());
    const sortedLargerElements = await mergeInsertionSort(largerElements, depth + 1);

    // Prepare the result array with sorted larger elements
    const result = [...sortedLargerElements];

    // Step 4: Insert the element paired with the smallest element in S
    result.unshift(orderedPairs.get(result[0]));
    //console.log(`${indent}Inserted smallest paired with sorted largest elements. S: [${result}]`);

    // Step 5: Insertion
    // Step 5.1: Collect remaining smaller elements + unpaired element if it exists
    const remainingElements = [];
    for (let i = 1; i < sortedLargerElements.length; i++) {
      const smallerElement = orderedPairs.get(sortedLargerElements[i]);
      remainingElements.push(smallerElement);
    }

    // Add the unpaired element if it exists
    if (unpaired !== null) {
      remainingElements.push(unpaired);
    }

    // If there are no elements to insert, we can stop here
    if (remainingElements.length === 0) {
      //console.log(`${indent}No elements to insert. Sort complete: [${result}]`);
      return result;
    }
    //console.log(`${indent}Remaining elements (${remainingElements.length}): [${remainingElements}]`);

    // Step 5.2: Calculate the insertion groups
    const insertionGroups = calculateInsertionGroups(remainingElements.length);
    //console.log(`${indent}Insertion Groups: [${insertionGroups}]`);

    // Step 5.3: Reorder elements according to the Ford-Johnson sequence
    const reorderedElements = reorderForInsertion(remainingElements, insertionGroups);
    //console.log(`${indent}Reordered elements (${reorderedElements.length}): [${reorderedElements}]`);

    // Create a reverse map to get the index of the larger element
    const orderedPairsReversed = new Map();
    orderedPairs.forEach((value, key) => {
      orderedPairsReversed.set(value, key);
    });

    // Step 5.4: Insert each element using binary search
    let groupIndex = 0;
    let currentGroupCount = 0;

    for (const elem of reorderedElements) {
      currentGroupCount++;
      const isLastInGroup = currentGroupCount === insertionGroups[groupIndex];

      let subsequenceOfS = [...result]; // default case for unpaired element
      const largerElement = orderedPairsReversed.get(elem);
      if (largerElement !== undefined) {
        const index = result.indexOf(largerElement);
        subsequenceOfS = result.slice(0, index); // get elements of S up to the larger element
      }

      const index = await getInsertionIndex(subsequenceOfS, elem, isLastInGroup);
      //console.log(`${indent}Updated S: [${result}]`);
      result.splice(index, 0, elem);

      if (isLastInGroup) {
        groupIndex++;
        currentGroupCount = 0;
      }
    }
    //console.log(`${indent}Sorted list: [${result}]`);
    return result;
  }

  /**
   * Calculate the worst case number of comparisons for merge-insertion sort
   * @param {number} n - Number of elements
   * @returns {number} - Worst case number of comparisons
   */
  function getWorstCaseMergeInsertion(n) {
    const z = (3 * n) / 4;
    const term1 = n * Math.ceil(Math.log2(z));
    const term2 = Math.floor(2 ** Math.floor(Math.log2(8 * z)) / 3);
    const term3 = Math.floor(Math.log2(8 * z) / 2);
    return term1 - term2 + term3;
  }

  /**
   * Get or compute Jacobsthal number at index n
   */
  function getJacobsthalNumber(n) {
    // Extend the cache if needed
    while (cache.jacobsthalNumbers.length <= n) {
      const len = cache.jacobsthalNumbers.length;
      const next = cache.jacobsthalNumbers[len - 1] + 2 * cache.jacobsthalNumbers[len - 2];
      cache.jacobsthalNumbers.push(next);
      cache.insertionGroups.push(next * 2);
    }
    return cache.jacobsthalNumbers[n];
  }

  /**
   * Optimized insertion groups calculation using cached Jacobsthal numbers
   */
  function calculateInsertionGroups(numElements) {
    const groups = [];
    let remainingElements = numElements;
    let insertionGroupIndex = 0;

    while (remainingElements > 0) {
      if (insertionGroupIndex > cache.jacobsthalNumbers.length - 1) {
        getJacobsthalNumber(insertionGroupIndex);
      }

      const groupSize = Math.min(cache.insertionGroups[insertionGroupIndex], remainingElements);
      groups.push(groupSize);
      remainingElements -= groupSize;
      insertionGroupIndex++;
    }
    return groups;
  }

  /**
   * Reorder elements for insertion according to the Ford-Johnson sequence
   * @param {Array} elements - Elements to reorder
   * @param {Array} groups - Group sizes
   * @returns {Array} - Reordered elements
   */
  function reorderForInsertion(elements, groups) {
    const result = [];
    let startIndex = 0;

    // Process each group
    for (const groupSize of groups) {
      // Get elements for this group
      const group = elements.slice(startIndex, startIndex + groupSize);

      // Reverse the elements in the group
      result.push(...group.reverse());
      startIndex += groupSize;
    }
    return result;
  }

  /**
   * Get insertion index through binary search
   * @param {Array} arr - The sorted array
   * @param {*} elem - The element to insert
   * @param {boolean} isLastInGroup - Whether this is the last element in the group
   * @returns {number} - Index to insert at
   */
  async function getInsertionIndex(arr, elem, isLastInGroup) {
    let left = 0;
    let right = arr.length - 1;
    let keepUpdating = true;

    // Find the insertion point using binary search
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);

      const pref = await doComparison(arr[mid], elem);

      // Record the preference
      recordPreference(pref.chosen, pref.rejected, pref.type);

      // Update the estimates based on the selection
      if (keepUpdating) {
        keepUpdating = updateMergeInsertionEstimates(pref.selectedLeft, arr.length, left, mid, right, isLastInGroup);
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
   * @param {boolean} selectedLeft - Whether the left option was selected
   * @param {number} insertionLength - Length of the insertion array
   * @param {number} left - Left index
   * @param {number} mid - middle value
   * @param {number} right - Right index
   * @param {boolean} isLastInGroup - Whether this is the last element in a group
   * @returns {boolean} - Whether to keep updating
   */
  function updateMergeInsertionEstimates(selectedLeft, insertionLength, left, mid, right, isLastInGroup) {
    let keepUpdating = true;

    // The best case occurs by going right if the subsequence size is of the form m=2^k-1
    // i.e., 1,3,7,15,31,63, etc.
    // and going left otherwise.
    const shouldGoLeft = !Number.isInteger(Math.log2(insertionLength + 1));

    // 4 cases:
    // 1. Should go right & not last in group
    // 2. Should go right & last in the group (then it doesn't matter)
    // 3. Should go left & right-left is even (then it doesn't matter)
    // 4. Should go left & right-left is odd
    if (!shouldGoLeft && !isLastInGroup) {
      if (selectedLeft) {
        sortState.comparisons.bestCase++;
        keepUpdating = false;
        return keepUpdating;
      }
    } else if (shouldGoLeft) {
      if (!selectedLeft) {
        // if (right - left) is even, your choice didn't matter (probably because it's impossible to generate a power of 2 in these cases but whatever)
        if ((right - left) % 2 !== 0) {
          // but if (right - left) is odd, and you're now inserting into a (power of 2)-1, you dun messed up
          if (Number.isInteger(Math.log2(right - mid + 1))) {
            sortState.comparisons.bestCase++;
            keepUpdating = false;
            return keepUpdating;
          }
        }
      }
      // if not the above case, and we broke the loop, then worstCase--
      if (selectedLeft) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
      if (left >= right) {
        // greater than or equal to because if they are equal, then you have a binary choice that doesn't matter
        sortState.comparisons.worstCase--;
        keepUpdating = false;
      }
    }
    return keepUpdating;
  }

  /**
   * Calculate the best case number of comparisons for merge-insertion sort
   * @param {number} n - Number of elements
   * @returns {number} - Best case number of comparisons
   */
  function getBestCaseMergeInsertion(n) {
    return F(n) + G(n);
  }

  /**
   * Computes F(n) = F(⌊n/2⌋) + ⌊n/2⌋
   * @param {number} n - Number of elements
   * @returns {number} - Number of merge comparisons
   */
  function F(n) {
    let total = 0;
    while (n > 1) {
      n = Math.floor(n / 2);
      total += n;
    }
    return total;
  }

  /**
   * Calculate the number of insertion comparisons in the best case
   * @param {number} n - Number of elements
   * @returns {number} - Number of insertion comparisons
   */
  function G(n) {
    if (n <= 2) {
      return 0; // no insertions necessary for n<=2
    }

    // Get the number of insertions
    const numInsertions = Math.floor((n - 1) / 2);

    // Decompose the number of insertions into consecutive Jacobsthal differences
    const decomposition = calculateInsertionGroups(numInsertions);

    let numComparisons = 0;
    for (let i = 0; i < decomposition.length; i++) {
      numComparisons += decomposition[i] * (i + 1);
    }

    // Add the number of full groups
    numComparisons += (decomposition.slice(-2).reduce((a, b) => a + b, 0) === 2 ** decomposition.length) ? decomposition.length : (decomposition.length - 1);

    return G(Math.floor(n / 2)) + numComparisons;
  }

  /******************************************
   * SHARED UTILITY FUNCTIONS
   ******************************************/

  async function doComparison(songA, songB) {
    let pref = getKnownPreference(songA, songB);

    if (pref.selectedLeft === null) {
      // Need user input for this comparison
      sortState.inferCount = 0;
      pref = await requestUserComparison(songA, songB);
    } else {
      console.log(`Known comparison: ${(pref.selectedLeft) ? `${songA} > ${songB}` : `${songB} > ${songA}`}`);
      sortState.inferCount++;
    }

    // secondary check for checkCurrentComparison() after importing
    if (pref.selectedLeft === null && pref.type === 'import') {
      pref = getKnownPreference(songA, songB);
      sortState.inferCount++;
    }

    // Process the user's choice
    const chosen = pref.selectedLeft ? songA : songB;
    const rejected = pref.selectedLeft ? songB : songA;

    if (sortState.inferCount > 0) {
      ClipboardManager.showNotification(`Inferred ${sortState.inferCount} comparisons from imported decisions`);
    }

    return {
      selectedLeft: pref.selectedLeft, chosen: chosen, rejected: rejected, type: pref.type
    }
  }

  /**
   * Request user comparison between two songs
   * @param {string} songA - First song to compare
   * @param {string} songB - Second song to compare
   * @returns {Promise<*>} - Promise that resolves to {selectedLeft<Boolean>, type<String>}, true if left was selected
   */
  function requestUserComparison(songA, songB) {
    return new Promise(resolve => {
      // Create a comparison object with the resolver included
      const comparison = {
        songA: songA, songB: songB, resolve: resolve
      };

      // Add to queue
      sortState.compareQueue.push(comparison);

      // If this is the only comparison in the queue, show it
      if (sortState.compareQueue.length === 1) {
        requestAnimationFrame(showComparison);
      }
    });
  }

  /**
   * Display a comparison for the user
   */
  function showComparison() {
    if (sortState.compareQueue.length === 0) return;

    // Shows the first element from compareQueue
    const comparison = sortState.compareQueue[0];

    // Update the UI
    DOM.btnA.textContent = comparison.songA;
    DOM.btnB.textContent = comparison.songB;

    // Update progress information
    updateProgressDisplay();
  }

  /**
   * Invalidate relevant caches when new preferences are added
   */
  function invalidateCaches() {
    cache.preferences.clear();
    cache.transitiveClosure = null;
    cache.transitiveClosureVersion = 0;
  }

  function recordPreference(chosen, rejected, type = 'decision') {
    sortState.comparisons.completed++;

    const now = new Date();
    let elapsedTimeFormatted = " N/A  ";

    if (type === 'decision' && sortState.lastDecisionTimestamp) {
      const elapsedTime = now - sortState.lastDecisionTimestamp;
      const totalSeconds = Math.floor(elapsedTime / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      elapsedTimeFormatted = `${minutes}m:${seconds.toString().padStart(2, '0')}s`;
    }

    sortState.lastDecisionTimestamp = now;

    console.log(`${formatLocalTime(now)} | Time: ${elapsedTimeFormatted} | Comparison #${sortState.comparisons.completed}: ${chosen} > ${rejected}`);

    // Add to history
    sortState.decisionHistory.push({
      comparison: sortState.comparisons.completed,
      chosen: chosen,
      rejected: rejected,
      elapsedTime: elapsedTimeFormatted,
      type: type
    });

    // Invalidate caches when new data is added
    if (type === 'decision' || type === 'import') {
      invalidateCaches();
    }
  }

  /**
   * Update the progress display
   */
  function updateProgressDisplay() {
    // Calculate progress percentage
    const progressPercentage = Math.round((sortState.comparisons.completed / sortState.comparisons.bestCase) * 100);

    DOM.progress.textContent = `Progress: ${progressPercentage}% sorted`;

    const comparisonText = (sortState.comparisons.bestCase === sortState.comparisons.worstCase) ? `Comparison #${sortState.comparisons.completed + 1} of ${sortState.comparisons.bestCase}` : `Comparison #${sortState.comparisons.completed + 1} of ${sortState.comparisons.bestCase} to ${sortState.comparisons.worstCase}`;

    if (DOM.comparison.textContent !== comparisonText) {
      DOM.comparison.textContent = comparisonText;
    }
  }

  /**
   * Memoized preference lookup with cache key optimization
   */
  function getKnownPreference(songA, songB) {
    // Create a consistent cache key (smaller song first for normalization)
    const key = songA < songB ? `${songA}|${songB}` : `${songB}|${songA}`;
    const isReversed = songA >= songB;

    if (cache.preferences.has(key)) {
      const cached = cache.preferences.get(key);
      return {
        selectedLeft: isReversed ? !cached.selectedLeft : cached.selectedLeft, type: cached.type
      };
    }

    // Check direct preferences first (O(1) with Map)
    const directPrefs = getDirectPreferences();
    if (directPrefs.has(key)) {
      const pref = directPrefs.get(key);
      const result = {
        selectedLeft: isReversed ? !pref.selectedLeft : pref.selectedLeft, type: 'infer'
      };
      cache.preferences.set(key, result);
      return result;
    }

    // Check transitive preferences if needed
    const transitivePref = checkTransitivePreference(songA, songB);
    if (transitivePref.selectedLeft !== null) {
      cache.preferences.set(key, transitivePref);
      return transitivePref;
    }

    // No known preference
    return {selectedLeft: null, type: null};
  }

  /**
   * Get direct preferences as a Map for O(1) lookup
   */
  function getDirectPreferences() {
    const direct = new Map();
    for (const {chosen, rejected} of sortState.decisionHistory) {
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
  function checkTransitivePreference(songA, songB) {
    // Only compute transitive closure if history changed
    if (!cache.transitiveClosure || cache.transitiveClosureVersion !== sortState.decisionHistory.length) {
      cache.transitiveClosure = computeTransitiveClosure(sortState.decisionHistory);
      cache.transitiveClosureVersion = sortState.decisionHistory.length;
    }

    // Check in cached closure
    for (const {chosen, rejected, type} of cache.transitiveClosure) {
      if (type === 'infer') { // Only check inferred preferences
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

  // Return the public API
  // Export optimized functions
  return {
    // Keep the existing API but with optimized internals
    startSorting: async function (songs, shuffle = false, useMergeInsertion = false) {
      // Reset state
      sortState.comparisons.completed = 0;
      sortState.decisionHistory = [];
      sortState.compareQueue = [];
      sortState.lastDecisionTimestamp = null;
      invalidateCaches();

      let songsToSort = [...songs];
      if (shuffle) {
        songsToSort = shuffleArray(songsToSort);
      }

      let result;
      if (useMergeInsertion) {
        sortState.comparisons.worstCase = getWorstCaseMergeInsertion(songsToSort.length);
        sortState.comparisons.bestCase = getBestCaseMergeInsertion(songsToSort.length);
        result = await mergeInsertionSort(songsToSort);
        result = result.reverse();
      } else {
        sortState.comparisons.worstCase = songsToSort.length * Math.ceil(Math.log2(songsToSort.length)) - 2 ** Math.ceil(Math.log2(songsToSort.length)) + 1;
        sortState.comparisons.bestCase = getBestCaseMergeSort(songsToSort.length);
        const lists = songsToSort.map(song => [song]);
        result = await mergeSort(lists);
      }

      showResult(result);
      return result;
    },

    handleOption: function (selectedLeft) {
      if (sortState.compareQueue.length === 0) return;
      const comparison = sortState.compareQueue.shift();
      comparison.resolve({selectedLeft: selectedLeft, type: 'decision'});
      if (sortState.compareQueue.length > 0) {
        requestAnimationFrame(showComparison);
      }
    },

    getDecisionHistory: () => sortState.decisionHistory,

    addImportedDecision: function (decision) {
      sortState.decisionHistory.push({
        comparison: "X", chosen: decision.chosen, rejected: decision.rejected, elapsedTime: null, type: 'import'
      });
      invalidateCaches();
    },

    checkCurrentComparison: function () {
      if (!sortState.compareQueue || sortState.compareQueue.length === 0) return;

      const currentComparison = sortState.compareQueue[0];
      const pref = getKnownPreference(currentComparison.songA, currentComparison.songB);

      if (pref.selectedLeft !== null) {
        console.log(`After import, we now know: ${(pref.selectedLeft) ? `${currentComparison.songA} > ${currentComparison.songB}` : `${currentComparison.songB} > ${currentComparison.songA}`}`);
        sortState.compareQueue.shift();
        currentComparison.resolve({selectedLeft: null, type: 'import'});
        if (sortState.compareQueue.length > 0) {
          requestAnimationFrame(showComparison);
        }
      }
    }
  };
})();

// Export the decision history for access by other modules
function getDecisionHistory() {
  return SongSorter.getDecisionHistory();
}

// Define a global handleOption function to handle button clicks
function handleOption(selectedLeft) {
  SongSorter.handleOption(selectedLeft);
}

// Define a single unified startSorting function
function startSorting(songs, shuffle = false, useMergeInsertion = false) {
  return SongSorter.startSorting(songs, shuffle, useMergeInsertion);
}

// Make sure we don't need to redefine global decisionHistory
Object.defineProperty(window, 'decisionHistory', {
  get: function () {
    return SongSorter.getDecisionHistory();
  }
});