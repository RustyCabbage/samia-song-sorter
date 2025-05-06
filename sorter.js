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
      merged.push(leftItem);
      leftIndex++;
      continueComparing();
    } else if (knownPreference === 'right') {
      merged.push(rightItem);
      rightIndex++;
      continueComparing();
    } else {
      // Need user input for this comparison
      compareQueue.push({
        songA: leftItem,
        songB: rightItem,
        onChoice: (choseA) => {
          if (choseA) {
            merged.push(leftItem);
            leftIndex++;
            // Record this preference
            recordPreference(leftItem, rightItem);
          } else {
            merged.push(rightItem);
            rightIndex++;
            // Record this preference
            recordPreference(rightItem, leftItem);
          }
          // Continue with the next comparison
          continueComparing();
        }
      });
      // If this is the first item in the queue, start the comparison
      if (compareQueue.length === 1) {
        showNextComparison();
      }
    }
  }
}

// Check if we already know which song is preferred
function getKnownPreference(songA, songB) {
  // If we've directly compared these two songs before
  for (const decision of decisionHistory) {
    if (decision.chosen === songA && decision.rejected === songB) {
      return 'left';
    } else if (decision.chosen === songB && decision.rejected === songA) {
      return 'right';
    }
  }
  
  // Check for transitive preferences
  const preferences = inferTransitivePreferences();
  
  for (const pref of preferences) {
    if (pref.preferred === songA && pref.lessPreferred === songB) {
      return 'left';
    } else if (pref.preferred === songB && pref.lessPreferred === songA) {
      return 'right';
    }
  }
  
  return null; // No known preference
}

// Infer preferences based on transitivity (A > B and B > C implies A > C)
function inferTransitivePreferences() {
  const directPreferences = decisionHistory.map(d => ({
    preferred: d.chosen,
    lessPreferred: d.rejected
  }));
  
  const allPreferences = [...directPreferences];
  
  // Keep adding transitive preferences until no more can be found
  let added = true;
  while (added) {
    added = false;
    
    for (const pref1 of allPreferences) {
      for (const pref2 of allPreferences) {
        // If A > B and B > C, then A > C
        if (pref1.lessPreferred === pref2.preferred) {
          const newPref = {
            preferred: pref1.preferred,
            lessPreferred: pref2.lessPreferred
          };
          
          // Check if this preference is already known
          const alreadyKnown = allPreferences.some(p => 
            p.preferred === newPref.preferred && p.lessPreferred === newPref.lessPreferred
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
function recordPreference(preferred, lessPreferred) {
  decisionHistory.push({
    comparison: completedComparisons + 1,
    chosen: preferred,
    rejected: lessPreferred
  });
  completedComparisons++;
}

// Handle when the user selects an option
function handleOption(choseOptionA) {
  if (compareQueue.length === 0) return;
  
  const comparison = compareQueue.shift();
  comparison.onChoice(choseOptionA);
  
  // Show the next comparison if any
  if (compareQueue.length > 0) {
    showNextComparison();
  }
}

// Display the next comparison to the user
function showNextComparison() {
  if (compareQueue.length === 0) return;
  
  const comparison = compareQueue[0];
  
  // Update the UI
  DOM.btnA.textContent = comparison.songA;
  DOM.btnB.textContent = comparison.songB;
  
  // Update progress information
  updateProgressDisplay();
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