// Global variables for tracking the sorting process
let songs = [];  // The songs to be sorted
let compareQueue = []; // Queue of comparisons to be made
let finalSorted = [];  // The final sorted list of songs
let songRanks = {};    // Object to store the relative ranks of songs
let decisionHistory = []; // Array to store the history of decisions
let completedComparisons = 0;  // Number of comparisons completed

let estimatedTotalComparisons = 0; // Estimated total comparisons needed
let mergeContext = null; // Tracks the current merge operation

// Initializes and starts the sorting process
function startSorting() {
  // Reset all state variables
  songs = currentSongList.songs;
  compareQueue = [];
  finalSorted = [];
  songRanks = {};
  decisionHistory = [];
  completedComparisons = 0;
  
  // Calculate the estimated number of comparisons needed
  // For merge sort, worst case is approximately n*ceil(log2(n)) - 2^ceil(log2(n)) + 1
  estimatedTotalComparisons = songs.length * Math.ceil(Math.log2(songs.length)) - 2 ** Math.ceil(Math.log2(songs.length)) + 1;
  
  // Start with each song as a separate list
  const lists = songs.map(song => [song]);

  // Begin the merge sort process
  mergeSort(lists);
}

////////////////////////////////////////////////////

/** 
 * Main merge sort function
 * @param {Array} lists - Array of arrays
 */
function mergeSort(lists) {
  // Base case: if there's only one list, we're done
  if (lists.length <= 1) {
    finalSorted = lists[0] || [];
    showResult();
    return;
  }
  
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

// Merge two sorted lists with user input
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
    const leftItem = left[leftIndex];
    const rightItem = right[rightIndex];
    
    // Check if we already know the preference based on transitivity
    const knownPreference = getKnownPreference(leftItem, rightItem);
    
    if (knownPreference === 'left') {
      handleSelection(true);
    } else if (knownPreference === 'right') {
      handleSelection(false);
    } else {
      // Need user input for this comparison
      compareQueue.push({
        songA: leftItem,
        songB: rightItem,
        onChoice: handleSelection
      });
      
      // If this is the first item in the queue, start the comparison
      if (compareQueue.length === 1) {
        showComparison();
      }
    }

    /**
     * Processes the result of a comparison
     * either from known preferences or user input
     * @param {boolean} selectedLeft
     */
    function handleSelection(selectedLeft) {
      // Get the appropriate items based on selection
      const selectedItem = selectedLeft ? leftItem : rightItem;
      const otherItem = selectedLeft ? rightItem : leftItem;
      
      // Add the selected item and update the index
      merged.push(selectedItem);
      if (selectedLeft) {
        leftIndex++;
      } else {
        rightIndex++;
      }
      
      // If we're recording a new preference (not from knownPreference)
      if (knownPreference === null) {
        recordPreference(selectedItem, otherItem);
      }
      
      // Continue with next comparison
      continueComparing();
    }
  }
}

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

////////////////////////////////////////////////////

// Record a user preference
function recordPreference(chosen, rejected) {
  completedComparisons++;
  decisionHistory.push({
    comparison: completedComparisons,
    chosen: chosen,
    rejected: rejected
  });
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
 * Handle when the user selects an option
 * Clicking the left button fires handleOption(true)
 * Clicking the right button fires handleOption(false)
 */
function handleOption(selectedLeft) {
  if (compareQueue.length === 0) return;
  
  // removes the first element from compareQueue 
  // comparison.onChoice fires handleSelection(selectedLeft)
  const comparison = compareQueue.shift();
  comparison.onChoice(selectedLeft);

  // Show the next comparison if any
  if (compareQueue.length > 0) {
    showComparison();
  }
}

// Update the progress display
function updateProgressDisplay() {
  // Calculate progress percentage (we can refine this estimate)
  const progressPercentage = 
    Math.round((completedComparisons / estimatedTotalComparisons) * 100);
  
  DOM.progress.textContent = 
    `Progress: ${progressPercentage}% sorted`;
  
  DOM.comparison.textContent = 
    `Comparison #${completedComparisons + 1} of ~${estimatedTotalComparisons} (estimated)`;
}