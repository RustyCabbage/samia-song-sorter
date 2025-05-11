// Global variables for tracking the sorting process
let worstCaseTotalComparisons = 0; // Estimated total comparisons needed in worst case
let bestCaseTotalComparisons = 0; // Estimated total comparisons needed in best case
let completedComparisons = 0;  // Number of comparisons completed
let decisionHistory = []; // Array to store the history of decisions

// Queue of comparisons to be made, each with its own resolver
let compareQueue = []; 

// Initializes and starts the sorting process
async function startSorting(songsToSort, shuffle = false) {
  // Reset all state variables
  let songs = [...songsToSort];
  completedComparisons = 0;
  decisionHistory = [];
  compareQueue = [];
  
  if (shuffle) {
    songs = shuffleArray([...songs]);
  }

  // Start with each song as a separate list
  const lists = songs.map(song => [song]);

  // Calculate the estimated number of comparisons needed
  // For this implementation of merge sort:
  // - the worst case is approximately n*ceil(log2(n)) - 2^ceil(log2(n)) + 1
  // - the best case is the sum of the size of the smaller list in each of the n-1 merge steps
  worstCaseTotalComparisons = songs.length * Math.ceil(Math.log2(songs.length)) - 2 ** Math.ceil(Math.log2(songs.length)) + 1;
  bestCaseTotalComparisons = sumOfSmallerListsInMerges(songs.length);

  // Begin the merge sort process
  const result = await mergeSort(lists);
  showResult(result);
  return result;
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
  return array;
}

/**
 * Calculate the sum of the sizes of the smaller list in each merge step
 * during a bottom-up merge sort of n elements.
 * This is the minimum number of comparisons for a list of size n.
 * 
 * @param {number} n - The number of elements in the list
 * @returns {number} total - The sum of the sizes of the smaller list in each merge step
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

/*************** START
 * main merge sort function 
 ***************/

/** 
 * Main merge sort function
 * @param {Array} lists - Array of arrays
 * @returns {Promise<Array>} - Promise that resolves to the final sorted array
 */
async function mergeSort(lists) {
  // Base case: if there's only one list, we're done
  if (lists.length <= 1) {
    return lists[0] || [];
  }

  //console.log("Lists:",lists.map(inner => `[${inner.join(',')}]`).join(' '));
  //console.log(`lists length: ${lists.length}`);
  
  // Create pairs of lists to merge - process them sequentially to avoid UI conflicts
  const mergedLists = [];
  for (let i = 0; i < lists.length; i += 2) {
    if (i + 1 < lists.length) {
      // Merge two lists - one at a time to prevent UI conflicts
      const mergedList = await merge(lists[i], lists[i + 1]);
      mergedLists.push(mergedList);
    } else {
      // Odd number of lists, this one gets passed through to the front of the list
      mergedLists.unshift(lists[i]);
    }
  }
  
  // Continue to the next level of merge sort
  return mergeSort(mergedLists);
}

/**
 * Merge two sorted lists with user input
 * @param {Array} left - left array
 * @param {Array} right - right array
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
    
    // Get the next items to compare
    const songA = left[leftIndex];
    const songB = right[rightIndex];

    /* Dev note: cases that can be resolved through transitivity never show up
     * in this implementation so this is actually a completely useless check
     *
    // Check if we already know the preference based on transitivity
    const knownPreference = getKnownPreference(songA, songB);

    if (knownPreference === 'left') {
      console.log(`Known preference: ${songA} > ${songB}`);
      merged.push(songA);
      leftIndex++;
      recordPreference(songA, songB);
    } else if (knownPreference === 'right') {
      console.log(`Known preference: ${songB} > ${songA}`);
      merged.push(songB);
      rightIndex++;
      recordPreference(songB, songA);
    } else
    /**/
    {
      // Need user input for this comparison
      const selectedLeft = await requestUserComparison(songA, songB, 
        left.length - (leftIndex+1), right.length - (rightIndex+1));
      
      // Process the user's choice
      const chosen = selectedLeft ? songA : songB;
      const rejected = selectedLeft ? songB : songA;
      
      // Add the selected item and update the index
      merged.push(chosen);
      if (selectedLeft) {
        leftIndex++;
      } else {
        rightIndex++;
      }
      
      // Record the preference
      recordPreference(chosen, rejected);
    }
  }
  
  return merged;
}

/**
 * Request user comparison between two songs
 * @param {string} songA - First song to compare
 * @param {string} songB - Second song to compare
 * @param {number} leftIndexFromRight - Index from right for left list
 * @param {number} rightIndexFromRight - Index from right for right list
 * @returns {Promise<boolean>} - Promise that resolves to true if left was selected, false otherwise
 */
function requestUserComparison(songA, songB, leftIndexFromRight, rightIndexFromRight) {
  return new Promise(resolve => {
    // Create comparison object with the resolver included
    const comparison = {
      songA: songA,
      songB: songB,
      leftIndexFromRight: leftIndexFromRight,
      rightIndexFromRight: rightIndexFromRight,
      resolve: resolve // Store the resolver in the comparison object itself
    };
    
    // Add to queue
    compareQueue.push(comparison);
    
    // If this is the only comparison in the queue, show it
    if (compareQueue.length === 1) {
      // Use setTimeout to ensure UI updates properly
      setTimeout(() => {
        showComparison();
      }, 0);
    }
  });
}

/*************** END
 * main merge sort function
 ***************/

// Record a user preference
function recordPreference(chosen, rejected) {
  completedComparisons++;
  decisionHistory.push({
    comparison: completedComparisons,
    chosen: chosen,
    rejected: rejected
  });
  console.log(`Comparison #${completedComparisons}: Chose ${chosen} > ${rejected}`);
}

/**
 * Handle when the user selects an option
 * Clicking the left button fires handleOption(true)
 * Clicking the right button fires handleOption(false)
 */
function handleOption(selectedLeft) {
  if (compareQueue.length === 0) return;
  
  // Get the current comparison with its own resolver
  const comparison = compareQueue.shift();
  
  // Update the estimates based on the selection
  updateEstimates(selectedLeft, comparison.leftIndexFromRight, comparison.rightIndexFromRight);
  
  // Resolve the promise with the user's choice
  comparison.resolve(selectedLeft);

  // If there are more comparisons in the queue, show the next one to the user
  if (compareQueue.length > 0) {
    // Wait a moment before showing the next comparison to ensure UI updates
    setTimeout(() => {
      showComparison();
    }, 0);
  }
}

/**
 * Display a comparison for the user
 * Takes global variable {Array} compareQueue
 */
function showComparison() {
  if (compareQueue.length === 0) return;
  
  // Shows the first element from compareQueue
  // this element is later removed in handleOption(selectedLeft)
  const comparison = compareQueue[0];
  
  // Update the UI
  DOM.btnA.textContent = comparison.songA;
  DOM.btnB.textContent = comparison.songB;
  
  // Update progress information
  updateProgressDisplay();
  // Program is continued by the user clicking a button and firing handleOption(selectedLeft)
}

/**
 * Update the best and worst case estimates based on user selection
 * By using indexFromRight we don't need to store the size of the sublists as well.
 * @param {boolean} selectedLeft - whether the left item was selected
 * @param {number} leftIndexFromRight - index of the left item in its list
 * @param {number} rightIndexFromRight - index of the right item in its list
 */
function updateEstimates(selectedLeft, leftIndexFromRight, rightIndexFromRight) {
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

// Update the progress display
function updateProgressDisplay() {
  // Calculate progress percentage (we can refine this estimate)
  const progressPercentage = 
    Math.round((completedComparisons / bestCaseTotalComparisons) * 100);
  
  DOM.progress.textContent = 
    `Progress: ${progressPercentage}% sorted`;
  
  // Update the comparison count display to include both best and worst case estimates
  DOM.comparison.textContent = (bestCaseTotalComparisons === worstCaseTotalComparisons) ?
    `Comparison #${completedComparisons + 1} of ${bestCaseTotalComparisons}` :
    `Comparison #${completedComparisons + 1} of ${bestCaseTotalComparisons} to ${worstCaseTotalComparisons}`;
}

/*************** START 
 * Get all preferences: direct and transitive.
 * This is actually not used by the program lol. 
 ***************/

/**
 * Check if we already know which song is preferred
 * @param {const} songA - left choice
 * @param {const} songB - right choice 
 * @returns {string} result - "left", "right" or null
 */ 
function getKnownPreference(songA, songB) {
  // Get all preferences (direct and transitive)
  const allPreferences = inferTransitivePreferences();
  
  for (const pref of allPreferences) {
    if (pref.chosen === songA && pref.rejected === songB) {
      return 'left';
    } else if (pref.chosen === songB && pref.rejected === songA) {
      return 'right';
    }
  }
  return null; // No known preference
}

/**
 * Infer preferences based on transitivity (A > B and B > C implies A > C)
 * Takes global variable {Array} decisionHistory
 * @returns {Array} - list of direct decisions + transitive preferences
 */ 
function inferTransitivePreferences() {
  const allPreferences = [...decisionHistory];
  
  // Keep adding transitive preferences until no more can be found
  let added = true;
  while (added) {
    added = false;
    for (const pref1 of allPreferences) {
      for (const pref2 of allPreferences) {
        // If A > B and B > C, then A > C
        if (pref1.rejected === pref2.chosen) {
          const newPref = {
            chosen: pref1.chosen,
            rejected: pref2.rejected
          };
          
          // Check if this preference is already known
          // If not, add it to the list of preferences and rerun the loop
          const alreadyKnown = allPreferences.some(p => 
            p.chosen === newPref.chosen && p.rejected === newPref.rejected
          );
          if (!alreadyKnown) {
            allPreferences.push(newPref);
            added = true;
          }
        }
      }
    }
  }
  return allPreferences;
}

/*************** END
 * Get all preferences: direct and transitive.
 * This is actually not used by the program lol.
 ***************/