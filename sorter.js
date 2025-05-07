// Global variables for tracking the sorting process
let songs = [];  // The songs to be sorted
let compareQueue = []; // Queue of comparisons to be made
let finalSorted = [];  // The final sorted list of songs
let songRanks = {};    // Object to store the relative ranks of songs
let decisionHistory = []; // Array to store the history of decisions
let completedComparisons = 0;  // Number of comparisons completed

let worstCaseTotalComparisons = 0; // Estimated total comparisons needed in worst case
let bestCaseTotalComparisons = 0; // Estimated total comparisons needed in best case

// Initializes and starts the sorting process
function startSorting() {
  // Reset all state variables
  songs = currentSongList.songs; // currentSongList obtained from interface.js
  compareQueue = [];
  finalSorted = [];
  songRanks = {};
  decisionHistory = [];
  completedComparisons = 0;
  
  // Start with each song as a separate list
  const lists = songs.map(song => [song]);

  // Calculate the estimated number of comparisons needed
  // For this implementation of merge sort:
  // - the worst case is approximately n*ceil(log2(n)) - 2^ceil(log2(n)) + 1
  // - the best case is the sum of the size of the smaller list in each of the n-1 merge steps
  worstCaseTotalComparisons = songs.length * Math.ceil(Math.log2(songs.length)) - 2 ** Math.ceil(Math.log2(songs.length)) + 1;
  bestCaseTotalComparisons = sumOfSmallerListsInMerges(songs.length);

  // Begin the merge sort process
  mergeSort(lists);
}

/*** START
 * main merge sort function 
 ***/

/** 
 * Main merge sort function
 * @param {Array} lists - Array of arrays
 * Finishes by firing showResult() from interface.js
 */
function mergeSort(lists) {
  // Base case: if there's only one list, we're done
  if (lists.length <= 1) {
    finalSorted = lists[0] || [];
    showResult();
    return;
  }

  //console.log("Lists:",lists.map(inner => `[${inner.join(',')}]`).join(' '));
  //console.log(`lists length: ${lists.length}`);
  
  // Create pairs of lists to merge
  const mergedLists = [];

  for (let i = 0; i < lists.length; i += 2) {
    if (i + 1 < lists.length) {
      // Merge two lists
      merge(lists[i], lists[i + 1], mergedResult => {
        mergedLists.push(mergedResult);
        checkContinueToNextLevel();
      });
    } else {
      // Odd number of lists, this one gets passed through
      mergedLists.push(lists[i]);
      checkContinueToNextLevel();
    }
  }
  // Helper function to check if we should continue to the next level
  function checkContinueToNextLevel() {
    // If all pairs have been merged, continue to the next level
    if (mergedLists.length === Math.ceil(lists.length / 2)) {
      mergeSort(mergedLists);
    }
  }
}

/**
 * Merge two sorted lists with user input
 * @param {Array} left - left array
 * @param {Array} right - right array
 * @param {callback} callback - push the merged list to mergedLists
 * */ 
function merge(left, right, callback) {
  const merged = [];
  let leftIndex = 0;
  let rightIndex = 0;
  
  // Start the merging process
  continueComparing();

  function continueComparing() {
    
    // If one list is exhausted, add all items from the other
    if (leftIndex >= left.length) {
      merged.push(...right.slice(rightIndex));
      callback(merged);
      return;
    }
    
    if (rightIndex >= right.length) {
      merged.push(...left.slice(leftIndex));
      callback(merged);
      return;
    }
    
    // Get the next items to compare
    const songA = left[leftIndex];
    const songB = right[rightIndex];

    /* Dev note: cases that can be resolved through transitivity never show up
     * in this implementation so this is actually a completely useless check
     *
    // Check if we already know the preference based on transitivity
    const knownPreference = getKnownPreference(leftItem, rightItem);

    if (knownPreference === 'left') {
      console.log(`Known preference: ${leftItem} > ${rightItem}`);
      handleSelection(true);
    } else if (knownPreference === 'right') {
      console.log(`Known preference: ${rightItem} > ${leftItem}`);
      handleSelection(false);
    } else
    /**/ 
    {
      // Need user input for this comparison
      //console.log(`Adding ${leftItem} vs ${rightItem} to queue`);
      compareQueue.push({
        songA: songA,
        songB: songB,
        leftIndexFromRight: left.length - (leftIndex+1),
        rightIndexFromRight: right.length - (rightIndex+1),
        onChoice: handleSelection
      });
      
      // If there is a comparison in the queue, show it to the user
      if (compareQueue.length === 1) {
        showComparison();
      }
    }

    /**
     * Processes the result of a comparison
     * @param {boolean} selectedLeft
     */
    function handleSelection(selectedLeft) {
      // Get the appropriate items based on selection
      const chosen = selectedLeft ? songA : songB;
      const rejected = selectedLeft ? songB : songA;
      
      // Add the selected item and update the index
      merged.push(chosen);
      if (selectedLeft) {
        leftIndex++;
      } else {
        rightIndex++;
      }
      
      /* Unnecessary since we never infer from knownPreference
       *
      // If we're recording a new preference (not from knownPreference)
      if (knownPreference === null)
      /**/
      {
        recordPreference(chosen, rejected);
      }
      // Continue with next comparison
      continueComparing();
    }
  }
}

/*** END
 * main merge sort function
 ***/

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
 
  //console.log(`Showing comparison: ${compareQueue[0].songA} vs ${compareQueue[0].songB}`);
  // Program is continued by the user clicking a button and firing handleOption(selectedLeft)
}

/**
 * Handle when the user selects an option
 * Clicking the left button fires handleOption(true)
 * Clicking the right button fires handleOption(false)
 */
function handleOption(selectedLeft) {
  if (compareQueue.length === 0) return;
  
  // removes the first element from compareQueue 
  // comparison.onChoice fires handleSelection(selectedLeft)
  const comparison = compareQueue.shift();
  // Update the estimates based on the selection
  updateEstimates(selectedLeft, comparison.leftIndexFromRight, comparison.rightIndexFromRight);
  comparison.onChoice(selectedLeft);

  // If there are more comparisons in the queue, show the next one to the user
  if (compareQueue.length > 0) {
    showComparison();
  }
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
    `Comparison #${completedComparisons + 1} of ${bestCaseTotalComparisons} - ${worstCaseTotalComparisons}`;
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

/*** START 
 * Get all preferences: direct and transitive.
 * This is actually not used by the program lol. 
 ***/

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

/*** END
 * Get all preferences: direct and transitive.
 * This is actually not used by the program lol.
 ***/