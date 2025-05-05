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
  // For merge sort, worst case is approximately n*log2(n)
  estimatedTotalComparisons = Math.ceil(songs.length * Math.log2(songs.length));
  
  // Start with each song as a separate list
  const lists = songs.map(song => [song]);
  
  // Begin the merge sort process
  mergeSort(lists);
}

<<<<<<< HEAD
// Main merge sort function
function mergeSort(lists) {
  // Base case: if there's only one list, we're done
  if (lists.length <= 1) {
    finalSorted = lists[0] || [];
    showResult();
=======
function updateProgressDisplay() {
  const progressPercentage = totalComparisons === 0 ?
    0 : Math.round((completedComparisons / totalComparisons) * 100);

  document.getElementById("progress").textContent = `Progress: ${progressPercentage}% sorted`;
}

function processCurrentState() {
  if (!currentState) return;

  if (currentState.type === 'mergeSort') {
    processMergeSort();
  } else if (currentState.type === 'merge') {
    processMerge();
  }
}

function processMergeSort() {
  const { array, onComplete } = currentState;

  if (array.length <= 1) {
    onComplete(array);
>>>>>>> main
    return;
  }
  
  // Create pairs of lists to merge
  const mergedLists = [];
  
  for (let i = 0; i < lists.length; i += 2) {
    if (i + 1 < lists.length) {
      // Merge two lists
      merge(lists[i], lists[i + 1], mergedResult => {
        mergedLists.push(mergedResult);
        
        // If all pairs have been merged, continue to the next level
        if (mergedLists.length === Math.ceil(lists.length / 2)) {
          mergeSort(mergedLists);
        }
      });
    } else {
      // Odd number of lists, this one gets passed through
      mergedLists.push(lists[i]);
      
      // If all pairs have been merged, continue to the next level
      if (mergedLists.length === Math.ceil(lists.length / 2)) {
        mergeSort(mergedLists);
      }
    }
  }
}

// Merge two sorted lists with user input
function merge(left, right, callback) {
  const merged = [];
  let leftIndex = 0;
  let rightIndex = 0;
  
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
  
  // Start the merging process
  continueComparing();
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
  let added = true;
  
  // Keep adding transitive preferences until no more can be found
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
          
<<<<<<< HEAD
          // Check if this preference is already known
          const alreadyKnown = allPreferences.some(p => 
            p.preferred === newPref.preferred && p.lessPreferred === newPref.lessPreferred
          );
          
          if (!alreadyKnown) {
            allPreferences.push(newPref);
            added = true;
          }
=======
          // Recalculate expected comparisons now that we have sorted subarrays
          recalculateRemainingComparisons();
          processCurrentState();
        }
      };
      processCurrentState();
    }
  };
  processCurrentState();
}

function processMerge() {
  const { left, right, result, leftIndex, rightIndex, onComplete, mergeId } = currentState;

  // All items processed, merge complete
  if (leftIndex >= left.length && rightIndex >= right.length) {
    if (mergeId !== undefined) {
      pendingMerges[mergeId].status = 'completed';
    }
    onComplete(result);
    return;
  }

  // Left array exhausted, add remaining right items
  if (leftIndex >= left.length) {
    currentState.result = [...result, ...right.slice(rightIndex)];
    if (mergeId !== undefined) {
      pendingMerges[mergeId].status = 'completed';
    }
    onComplete(currentState.result);
    return;
  }

  // Right array exhausted, add remaining left items
  if (rightIndex >= right.length) {
    currentState.result = [...result, ...left.slice(leftIndex)];
    if (mergeId !== undefined) {
      pendingMerges[mergeId].status = 'completed';
    }
    onComplete(currentState.result);
    return;
  }

  // Set the button content
  document.getElementById("btnA").textContent = left[leftIndex];
  document.getElementById("btnB").textContent = right[rightIndex];

  // Update comparison display
  document.getElementById("comparison").textContent = 
    `Comparison #${completedComparisons + 1} of ${totalComparisons} (approx)`;
}

function recalculateRemainingComparisons() {
  // Start with comparisons already made
  let newTotal = completedComparisons;
  
  // For each active merge operation, calculate remaining comparisons
  pendingMerges.forEach(merge => {
    if (merge.status === 'active') {
      const { left, right } = merge;
      const currentMerge = pendingMerges.find(m => 
        m.left === left && m.right === right && m.status === 'active');
      
      if (currentMerge) {
        const leftIndex = currentState.left === left ? currentState.leftIndex : 0;
        const rightIndex = currentState.right === right ? currentState.rightIndex : 0;
        
        // Calculate comparisons needed for remaining elements
        const remainingLeft = left.length - leftIndex;
        const remainingRight = right.length - rightIndex;
        
        if (remainingLeft > 0 && remainingRight > 0) {
          // For remaining elements, we need at most min(remainingLeft, remainingRight) comparisons
          newTotal += Math.min(remainingLeft, remainingRight);
>>>>>>> main
        }
      }
    }
  }
  
  return allPreferences;
}

// Record a user preference
function recordPreference(preferred, lessPreferred) {
  decisionHistory.push({
    comparison: completedComparisons + 1,
    chosen: preferred,
    rejected: lessPreferred
  });
  
  completedComparisons++;
}

// Display the next comparison to the user
function showNextComparison() {
  if (compareQueue.length === 0) return;
  
  const comparison = compareQueue[0];
  
  // Update the UI
  document.getElementById("btnA").textContent = comparison.songA;
  document.getElementById("btnB").textContent = comparison.songB;
  
  // Update progress information
  updateProgressDisplay();
}

// Update the progress display
function updateProgressDisplay() {
  // Calculate progress percentage (we can refine this estimate)
  const progressPercentage = Math.min(
    100, 
    Math.round((completedComparisons / estimatedTotalComparisons) * 100)
  );
  
  document.getElementById("progress").textContent = 
    `Progress: ${progressPercentage}% sorted`;
  
  document.getElementById("comparison").textContent = 
    `Comparison #${completedComparisons + 1} of ~${estimatedTotalComparisons} (estimated)`;
}

// Handle when the user selects option A
function handleOptionA() {
  if (compareQueue.length === 0) return;
  
  const comparison = compareQueue.shift();
  comparison.onChoice(true);
  
  // Show the next comparison if any
  if (compareQueue.length > 0) {
    showNextComparison();
  }
}

// Handle when the user selects option B
function handleOptionB() {
  if (compareQueue.length === 0) return;
  
  const comparison = compareQueue.shift();
  comparison.onChoice(false);
  
  // Show the next comparison if any
  if (compareQueue.length > 0) {
    showNextComparison();
  }
}