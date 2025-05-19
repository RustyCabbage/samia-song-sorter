/**
 * Song Sorter
 * Contains both merge sort and merge-insertion sort algorithms
 */

const SongSorter = (function () {
  let worstCaseTotalComparisons = 0;
  let bestCaseTotalComparisons = 0;
  let completedComparisons = 0;
  let decisionHistory = [];
  let compareQueue = [];
  let lastDecisionTimestamp = null;

  const DOM = {
    progress: document.getElementById("progress"),
    comparison: document.getElementById("comparison"),
    btnA: document.getElementById("btnA"),
    btnB: document.getElementById("btnB")
  };


  /**
   * Initialize the sorting process with the selected algorithm
   */
  async function startSorting(songs, shuffle = false, useMergeInsertion = false) {
    // Reset all state variables
    completedComparisons = 0;
    decisionHistory = [];
    compareQueue = [];
    lastDecisionTimestamp = null;

    // Create a copy of the song array
    let songsToSort = [...songs];

    // Shuffle if requested
    if (shuffle) {
      songsToSort = shuffleArray(songsToSort);
    }

    let result;

    if (useMergeInsertion) {
      worstCaseTotalComparisons = getWorstCaseMergeInsertion(songsToSort.length);
      bestCaseTotalComparisons = getBestCaseMergeInsertion(songsToSort.length);
      result = await mergeInsertionSort(songsToSort);
      // The merge insertion algorithm returns the array in reverse order
      result = result.reverse();
    } else {
      // Start with each song as a separate list
      worstCaseTotalComparisons = songsToSort.length * Math.ceil(Math.log2(songsToSort.length)) - 2 ** Math.ceil(Math.log2(songsToSort.length)) + 1;
      bestCaseTotalComparisons = sumOfSmallerListsInMerges(songsToSort.length);

      const lists = songsToSort.map(song => [song]);
      result = await mergeSort(lists);
    }

    showResult(result);
    return result;
  }

  /******************************************
   * MERGE SORT IMPLEMENTATION
   ******************************************/

  /**
   * Calculate the sum of the sizes of the smaller list in each merge step
   * @param {number} n - The number of elements in the list
   * @returns {number} - The sum of the sizes of the smaller list in each merge step
   */
  function sumOfSmallerListsInMerges(n) {
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

      const pref = await doComparison(songA, songB, left.length - (leftIndex + 1), right.length - (rightIndex + 1));

      if (pref.selectedLeft) {
        merged.push(songA);
        leftIndex++;
      } else {
        merged.push(songB);
        rightIndex++;
      }
      recordPreference(pref.chosen, pref.rejected, pref.type);
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
        bestCaseTotalComparisons++;
      } else if (leftIndexFromRight === 0 && rightIndexFromRight > 0) {
        // Selected 0 index when other is > 0 - decrease max estimate
        worstCaseTotalComparisons -= rightIndexFromRight;
      }
    } else {
      // Selected right item
      if (rightIndexFromRight > leftIndexFromRight) {
        // Selected higher index - increase min estimate
        bestCaseTotalComparisons++;
      } else if (rightIndexFromRight === 0 && leftIndexFromRight > 0) {
        // Selected 0 index when other is > 0 - decrease max estimate
        worstCaseTotalComparisons -= leftIndexFromRight;
      }
    }
  }

  /******************************************
   * MERGE INSERTION SORT IMPLEMENTATION
   ******************************************/

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
   * Calculate the insertion groups for the Ford-Johnson algorithm
   * @param {number} numElements - Number of elements to group
   * @returns {Array} - Array of group sizes
   */
  function calculateInsertionGroups(numElements) {
    const groups = [];
    let remainingElements = numElements;

    // Calculate Jacobsthal numbers for determining group sizes
    let a = 1, b = 1;
    while (remainingElements > 0) {
      // Next Jacobsthal number
      const next = b + 2 * a;
      a = b;
      b = next;

      // Group size = difference between consecutive Jacobsthal numbers
      const groupSize = Math.min(b - a, remainingElements);
      groups.push(groupSize);
      remainingElements -= groupSize;
    }
    return groups;
  }

  /**
   * Main merge-insertion sort function
   * @param {Array} arr - Array to sort
   * @param {number} depth - Recursion depth (for debug)
   * @returns {Promise<Array>} - Promise that resolves to the sorted array
   */
  async function mergeInsertionSort(arr, depth = 0) {
    if (arr.length <= 1) {
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

    // Step 3: Recursively sort the larger elements
    const largerElements = Array.from(orderedPairs.keys());
    const sortedLargerElements = await mergeInsertionSort(largerElements, depth + 1);

    // Prepare the result array with sorted larger elements
    const result = [...sortedLargerElements];

    // Step 4: Insert the element paired with the smallest element in S
    result.unshift(orderedPairs.get(result[0]));

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
      return result;
    }

    // Step 5.2: Calculate the insertion groups
    const insertionGroups = calculateInsertionGroups(remainingElements.length);

    // Step 5.3: Reorder elements according to the Ford-Johnson sequence
    const reorderedElements = reorderForInsertion(remainingElements, insertionGroups);

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
      result.splice(index, 0, elem);

      if (isLastInGroup) {
        groupIndex++;
        currentGroupCount = 0;
      }
    }
    return result;
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

      if (pref.selectedLeft) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }

      // Record the preference
      recordPreference(pref.chosen, pref.rejected, pref.type);

      // Update the estimates based on the selection
      if (keepUpdating) {
        keepUpdating = updateMergeInsertionEstimates(pref.selectedLeft, arr.length, left, right, isLastInGroup);
      }
    }
    return left;
  }

  /**
   * Update estimates for merge-insertion sort
   * @param {boolean} selectedLeft - Whether the left option was selected
   * @param {number} insertionLength - Length of the insertion array
   * @param {number} left - Left index
   * @param {number} right - Right index
   * @param {boolean} isLastInGroup - Whether this is the last element in a group
   * @returns {boolean} - Whether to keep updating
   */
  function updateMergeInsertionEstimates(selectedLeft, insertionLength, left, right, isLastInGroup) {
    let keepUpdating = true;

    // The best case occurs by going right if the subsequence size is of the form m=2^k-1
    // i.e., 1,3,7,15,31,63, etc.
    // and going left otherwise.
    const shouldGoRight = Number.isInteger(Math.log2(insertionLength + 1));

    if (shouldGoRight && !isLastInGroup) {
      if (selectedLeft) {
        bestCaseTotalComparisons++;
        keepUpdating = false;
      }
    }
    if (!shouldGoRight) {
      if (!selectedLeft) {
        bestCaseTotalComparisons++;
        keepUpdating = false;
      } else if (left === right) {
        // If left === right then choosing left or right doesn't matter
        worstCaseTotalComparisons--;
        keepUpdating = false;
      } else if (left > right) {
        // If the loop is broken and they went left the whole time
        worstCaseTotalComparisons--;
        keepUpdating = false;
      }
    }
    bestCaseTotalComparisons = Math.min(bestCaseTotalComparisons, worstCaseTotalComparisons);
    return keepUpdating;
  }

  /******************************************
   * SHARED UTILITY FUNCTIONS
   ******************************************/

  async function doComparison(songA, songB, leftIndexFromRight = 0, rightIndexFromRight = 0) {
    let pref = getKnownPreference(songA, songB);

    if (pref.selectedLeft === null) {
      // Need user input for this comparison
      pref = await requestUserComparison(songA, songB, leftIndexFromRight, rightIndexFromRight);
    } else {
      console.log(`Known comparison: ${(pref.selectedLeft) ? `${songA} > ${songB}` : `${songB} > ${songA}`}`);
    }

    // secondary check for checkCurrentComparison() after importing
    if (pref.selectedLeft === null && pref.type === 'import') {
      pref = getKnownPreference(songA, songB);
    }

    // Process the user's choice
    const chosen = pref.selectedLeft ? songA : songB;
    const rejected = pref.selectedLeft ? songB : songA;

    return {
      selectedLeft: pref.selectedLeft, chosen: chosen, rejected: rejected, type: pref.type
    }
  }

  /**
   * Request user comparison between two songs
   * @param {string} songA - First song to compare
   * @param {string} songB - Second song to compare
   * @param {number} leftIndexFromRight - Index from right for the left list (for merge sort)
   * @param {number} rightIndexFromRight - Index from right for the right list (for merge sort)
   * @returns {Promise<*>} - Promise that resolves to {selectedLeft<Boolean>, type<String>}, true if left was selected
   */
  function requestUserComparison(songA, songB, leftIndexFromRight = 0, rightIndexFromRight = 0) {
    return new Promise(resolve => {
      // Create a comparison object with the resolver included
      const comparison = {
        songA: songA,
        songB: songB,
        leftIndexFromRight: leftIndexFromRight,
        rightIndexFromRight: rightIndexFromRight,
        resolve: resolve
      };

      // Add to queue
      compareQueue.push(comparison);

      // If this is the only comparison in the queue, show it
      if (compareQueue.length === 1) {
        requestAnimationFrame(showComparison);
      }
    });
  }

  /**
   * Display a comparison for the user
   */
  function showComparison() {
    if (compareQueue.length === 0) return;

    // Shows the first element from compareQueue
    const comparison = compareQueue[0];

    // Update the UI
    DOM.btnA.textContent = comparison.songA;
    DOM.btnB.textContent = comparison.songB;

    // Update progress information
    updateProgressDisplay();
  }

  /**
   * Handle when the user selects an option
   * @param {boolean} selectedLeft - Whether the left option was selected
   */
  function handleOption(selectedLeft) {
    if (compareQueue.length === 0) return;

    // Get the current comparison with its own resolver
    const comparison = compareQueue.shift();

    // Update the estimates based on the selection
    // Only for merge sort; merge-insertion updates in getInsertionIndex
    if (!state.shouldMergeInsert) {
      updateMergeSortEstimates(selectedLeft, comparison.leftIndexFromRight, comparison.rightIndexFromRight);
    }

    // Resolve the promise with the user's choice
    comparison.resolve({selectedLeft: selectedLeft, type: 'decision'});

    // Process the next comparison with a slight delay for UI responsiveness
    if (compareQueue.length > 0) {
      requestAnimationFrame(showComparison);
    }
  }

  /**
   * Record a user preference
   * @param {*} chosen - The chosen option
   * @param {*} rejected - The rejected option
   * @param {String} type - type: decision, import, infer,
   */
  function recordPreference(chosen, rejected, type = 'decision') {
    completedComparisons++;

    const now = new Date();

    let elapsedTime = null;
    let elapsedTimeFormatted = " N/A  ";

    // Only measure time for user decisions
    if (type === 'decision' && lastDecisionTimestamp) {

      elapsedTime = now - lastDecisionTimestamp;
      const totalSeconds = Math.floor(elapsedTime / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      elapsedTimeFormatted = `${minutes}m:${seconds.toString().padStart(2, '0')}s`;
    }

    // Update the last decision timestamp
    lastDecisionTimestamp = now;

    // Log user decisions to console
    console.log(`${formatLocalTime(now)} | Time: ${elapsedTimeFormatted} | Comparison #${completedComparisons}: ${chosen} > ${rejected}`);

    // Add to history
    decisionHistory.push({
      comparison: completedComparisons, chosen: chosen, rejected: rejected, elapsedTime: elapsedTime, type: type
    });
  }

  /**
   * Update the progress display
   */
  function updateProgressDisplay() {
    // Calculate progress percentage
    const progressPercentage = Math.round((completedComparisons / bestCaseTotalComparisons) * 100);

    DOM.progress.textContent = `Progress: ${progressPercentage}% sorted`;

    const comparisonText = (bestCaseTotalComparisons === worstCaseTotalComparisons) ? `Comparison #${completedComparisons + 1} of ${bestCaseTotalComparisons}` : `Comparison #${completedComparisons + 1} of ${bestCaseTotalComparisons} to ${worstCaseTotalComparisons}`;

    if (DOM.comparison.textContent !== comparisonText) {
      DOM.comparison.textContent = comparisonText;
    }
  }

  /**
   * Add an imported decision to the decision history
   * @param {object} decision - The decision to add
   */
  function addImportedDecision(decision) {
    decisionHistory.push({
      comparison: "X", chosen: decision.chosen, rejected: decision.rejected, elapsedTime: null, type: 'import'
    });
  }

  /**
   * Check if the current displayed comparison can be automatically decided
   * This should be called after importing decisions
   */
  function checkCurrentComparison() {
    // If there's no queue or sorter interface, do nothing
    if (!compareQueue || compareQueue.length === 0) {
      return;
    }

    // Get the current comparison
    const currentComparison = compareQueue[0];
    const songA = currentComparison.songA;
    const songB = currentComparison.songB;

    // Check if we now know the preference after importing
    const pref = getKnownPreference(songA, songB);

    // If we know the preference, automatically select it
    if (pref.selectedLeft !== null) {
      console.log(`After import, we now know: ${(pref.selectedLeft) ? `${songA} > ${songB}` : `${songB} > ${songA}`}`);

      // Remove from queue
      compareQueue.shift();

      // Resolve with the known preference
      currentComparison.resolve({selectedLeft: null, type: 'import'});

      // Show the next comparison if any
      if (compareQueue.length > 0) {
        requestAnimationFrame(showComparison);
      }
    }
  }

  // Return the public API
  return {
    startSorting, handleOption, getDecisionHistory: () => decisionHistory, addImportedDecision, checkCurrentComparison
  };
})();

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
 * Check if we already know which song is preferred
 * @param {*} songA - left choice
 * @param {*} songB - right choice
 * @param {Array} history - Decision history array to work with
 * @returns {*} preference - selectedLeft (boolean), type ('infer', 'decision', 'import')
 */
function getKnownPreference(songA, songB, history = decisionHistory) {
  let selectedLeft = null;

  // Check if this preference is already directly known
  for (const {chosen, rejected} of history) {
    if (chosen === songA && rejected === songB) {
      selectedLeft = true;
      break;
    } else if (chosen === songB && rejected === songA) {
      selectedLeft = false;
      break;
    }
  }
  if (selectedLeft !== null) {
    return {
      selectedLeft, type: 'infer'
    };
  }

  // Else infer transitive preferences in O(N^3) and try again
  const allPreferences = computeTransitiveClosure(history);

  for (const pref of allPreferences) {
    if (pref.chosen === songA && pref.rejected === songB) {
      selectedLeft = true;
      break;
    } else if (pref.chosen === songB && pref.rejected === songA) {
      selectedLeft = false;
      break;
    }
  }
  return {
    selectedLeft, type: 'infer'
  };
}

/**
 * Infer preferences based on transitivity (A > B and B > C implies A > C)
 * This uses the Floyd-Warshall algorithm to find the transitive closure of the comparisons
 * @param {Array} history - Decision history array to work with
 * @returns {Array} - List of direct decisions + transitive preferences
 */
function computeTransitiveClosure(history = decisionHistory) {
  // A. Gather all distinct nodes and build adjacency in one pass
  const graph = new Map();       // item → Set of items it beats
  const allNodes = new Set();    // to collect every item

  for (const {chosen, rejected} of history) {
    allNodes.add(chosen);
    allNodes.add(rejected);

    if (!graph.has(chosen)) {
      graph.set(chosen, new Set());
    }
    graph.get(chosen).add(rejected);
  }

  // B. Ensure every node is in the graph (even if it has no outgoing edges)
  for (const node of allNodes) {
    if (!graph.has(node)) {
      graph.set(node, new Set());
    }
  }

  // Perform transitive closure
  const nodes = Array.from(allNodes);
  for (const k of nodes) {
    for (const i of nodes) {
      if (graph.get(i).has(k)) {
        for (const j of nodes) {
          if (graph.get(k).has(j)) {
            graph.get(i).add(j);
          }
        }
      }
    }
  }

  // Convert back to preference objects
  const allPreferences = [...history];

  // Add transitive preferences
  for (const [chosen, rejectedSet] of graph.entries()) {
    for (const rejected of rejectedSet) {
      // Check if this is already a direct preference
      const isDirect = history.some(pref => pref.chosen === chosen && pref.rejected === rejected);

      if (!isDirect) {
        allPreferences.push({
          comparison: null, chosen: chosen, rejected: rejected, elapsedTime: null, type: 'infer',
        });
      }
    }
  }
  return allPreferences;
}

/**
 * Compute the transitive reduction of the comparison graph
 * @param {Array} history - Decision history array to work with
 * @param isTransitiveClosure - Whether the input is a transitive closure (i.e., already computed)
 * @returns {Array} - Minimal set of comparisons that preserve the same ordering
 */
function computeTransitiveReduction(history = decisionHistory, isTransitiveClosure = false) {
  // Get the transitive closure first
  let transitiveClosure = (isTransitiveClosure) ? history : computeTransitiveClosure(history);

  // Extract direct edges from original history
  const directGraph = new Map();
  const allNodes = new Set();

  for (const {chosen, rejected} of history) {
    allNodes.add(chosen);
    allNodes.add(rejected);

    if (!directGraph.has(chosen)) {
      directGraph.set(chosen, new Set());
    }
    directGraph.get(chosen).add(rejected);
  }

  // Ensure every node is in the graph
  for (const node of allNodes) {
    if (!directGraph.has(node)) {
      directGraph.set(node, new Set());
    }
  }
  //console.log(visualizeGraph(directGraph));

  // Build the transitive closure graph (Map of node → Set of all nodes it beats)
  const transitiveClosureGraph = new Map();

  for (const {chosen, rejected} of transitiveClosure) {
    if (!transitiveClosureGraph.has(chosen)) {
      transitiveClosureGraph.set(chosen, new Set());
    }
    transitiveClosureGraph.get(chosen).add(rejected);
  }

  // Ensure all nodes are in the transitive closure graph
  const nodes = Array.from(allNodes);
  for (const node of nodes) {
    if (!transitiveClosureGraph.has(node)) {
      transitiveClosureGraph.set(node, new Set());
    }
  }
  //console.log(visualizeGraph(transitiveClosureGraph));

  // Now compute the transitive reduction
  const reductionGraph = new Map();

  // Initialize with direct edges
  for (const node of nodes) {
    reductionGraph.set(node, new Set([...directGraph.get(node)]));
  }

  // Remove redundant edges
  for (const i of nodes) {
    for (const j of Array.from(reductionGraph.get(i))) {
      // For each edge i->j, check if there's an indirect path
      let hasIndirectPath = false;

      for (const k of nodes) {
        // If there's a path i->k->j (without going through the direct i->j edge),
        // then the direct edge i->j is redundant
        if (k !== i && k !== j && transitiveClosureGraph.get(i).has(k) && transitiveClosureGraph.get(k).has(j)) {
          hasIndirectPath = true;
          break;
        }
      }

      if (hasIndirectPath) {
        reductionGraph.get(i).delete(j);
      }
    }
  }
  //console.log(visualizeGraph(reductionGraph));

  // Convert back to preference objects
  const reducedPreferences = [];

  // Add only the edges in the transitive reduction
  for (const [chosen, rejectedSet] of reductionGraph.entries()) {
    for (const rejected of rejectedSet) {
      // Find the original comparison
      const originalComparison = history.find(pref => pref.chosen === chosen && pref.rejected === rejected);
      // Since we're only removing edges from the direct graph,
      // every edge in the reduction must exist in the original history
      reducedPreferences.push(originalComparison);
    }
  }
  return reducedPreferences;
}

/**
 * Helper function to visualize the graph structure (useful for debugging)
 * @param {Map} graph - Graph represented as adjacency list
 * @returns {String} - Text representation of the graph
 */
function visualizeGraph(graph) {
  let result = '';
  for (const [node, edges] of graph.entries()) {
    result += `${node} -> ${Array.from(edges).join(', ')}\n`;
  }
  return result;
}

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