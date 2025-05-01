// We'll use the external song lists
let songs = []; // Will be populated from songlists.js

let currentState = null;
let finalSorted = [];
let completedComparisons = 0;
let totalComparisons = 0;
let pendingMerges = [];
let decisionHistory = [];

// Initialize the app
function initializeApp() {
  // Apply the default theme on load
  applyTheme(getCurrentTheme());
  
  // Populate the list selector dropdown
  populateListSelector();
  
  // Set up event listener for list selection change
  document.getElementById("listSelector").addEventListener("change", function() {
    const selectedListId = this.value;
    setCurrentSongList(selectedListId);
    document.getElementById("startButton").disabled = false;
    
    // Update the song count display
    const songCount = songLists[selectedListId].songs.length;
    document.getElementById("songCount").textContent = `${songCount} songs`;
  });
  
  // Hide the sorting UI initially, show only the selection UI
  document.getElementById("sortingInterface").style.display = "none";
  document.getElementById("selectionInterface").style.display = "block";
  
  // Set up the start button
  document.getElementById("startButton").addEventListener("click", function() {
    // Get the current song list
    songs = getCurrentSongList();
    
    // Hide the selection interface and show sorting interface
    document.getElementById("selectionInterface").style.display = "none";
    document.getElementById("sortingInterface").style.display = "block";
    
    // Start the sorting
    startSorting();
  });
  
  // Set up buttons for comparison
  document.getElementById("btnA").addEventListener("click", handleOptionA);
  document.getElementById("btnB").addEventListener("click", handleOptionB);
}

// Populate the list selector dropdown
function populateListSelector() {
  const selector = document.getElementById("listSelector");
  const lists = getAvailableSongLists();
  
  lists.forEach(list => {
    const option = document.createElement("option");
    option.value = list.id;
    option.textContent = list.name;
    selector.appendChild(option);
  });
  
  // Set initial song count
  const initialList = songLists[currentListId];
  document.getElementById("songCount").textContent = `${initialList.songs.length} songs`;
}

// Reset the interface to selection mode
function resetInterface() {
  // Hide result and show selection interface
  document.getElementById("result").innerHTML = '';
  document.getElementById("sortingInterface").style.display = "none";
  document.getElementById("selectionInterface").style.display = "block";
  
  // Show buttons again if they were hidden
  document.getElementById("choices").style.display = "flex";
  
  // Reset progress displays if they exist
  if (document.getElementById("progress")) {
    document.getElementById("progress").style.display = "block";
    document.getElementById("progress").textContent = '';
  }
  if (document.getElementById("comparison")) {
    document.getElementById("comparison").style.display = "block";
    document.getElementById("comparison").textContent = '';
  }
}

// Calculate comparisons needed for an array dynamically
function calcComparisonsNeeded(arr) {
  if (!arr || arr.length <= 1) return 0;
  return arr.length - 1;
}

// Calculate total comparisons needed for merge sort on array
function calculateTotalComparisons(arr) {
  if (!arr || arr.length <= 1) return 0;
  
  const n = arr.length;
  const mid = Math.floor(n / 2);
  const left = arr.slice(0, mid);
  const right = arr.slice(mid);
  
  // Recursively calculate for left and right parts
  const leftComps = calculateTotalComparisons(left);
  const rightComps = calculateTotalComparisons(right);
  
  // Merging left and right requires at most (left.length + right.length - 1) comparisons
  const mergeComps = calcComparisonsNeeded(arr);
  
  return leftComps + rightComps + mergeComps;
}

function startSorting() {
  const shuffledSongs = [...songs];
  for (let i = shuffledSongs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledSongs[i], shuffledSongs[j]] = [shuffledSongs[j], shuffledSongs[i]];
  }

  completedComparisons = 0;
  pendingMerges = [];
  decisionHistory = []; // Reset decision history
  
  // Initialize with worst-case scenario
  totalComparisons = calculateTotalComparisons(shuffledSongs);
  updateProgressDisplay();

  currentState = {
    type: 'mergeSort',
    array: shuffledSongs,
    onComplete: (sorted) => {
      finalSorted = sorted;
      showResult();
    }
  };

  processCurrentState();
}

function updateProgressDisplay() {
  const progressPercentage = totalComparisons === 0 ?
    0 : Math.round((completedComparisons / totalComparisons) * 100);

  const progressDiv = document.getElementById("progress");
  if (!progressDiv) {
    const newProgressDiv = document.createElement("div");
    newProgressDiv.id = "progress";
    newProgressDiv.style.marginBottom = "20px";
    document.getElementById("choices").insertAdjacentElement('beforebegin', newProgressDiv);
  }

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
    return;
  }

  const middle = Math.floor(array.length / 2);
  const leftArray = array.slice(0, middle);
  const rightArray = array.slice(middle);

  // Track this pending merge for future comparisons calculation
  const mergeId = pendingMerges.length;
  pendingMerges.push({
    left: leftArray,
    right: rightArray,
    status: 'pending'
  });

  currentState = {
    type: 'mergeSort',
    array: leftArray,
    onComplete: (sortedLeft) => {
      currentState = {
        type: 'mergeSort',
        array: rightArray,
        onComplete: (sortedRight) => {
          pendingMerges[mergeId].status = 'active';
          pendingMerges[mergeId].left = sortedLeft;
          pendingMerges[mergeId].right = sortedRight;
          
          currentState = {
            type: 'merge',
            left: sortedLeft,
            right: sortedRight,
            result: [],
            leftIndex: 0,
            rightIndex: 0,
            mergeId: mergeId,
            onComplete
          };
          
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
  const btnA = document.getElementById("btnA");
  const btnB = document.getElementById("btnB");

  btnA.textContent = left[leftIndex];
  btnB.textContent = right[rightIndex];

  // Update comparison display
  const comparisonDiv = document.getElementById("comparison");
  if (!comparisonDiv) {
    const newComparisonDiv = document.createElement("div");
    newComparisonDiv.id = "comparison";
    document.getElementById("choices").insertAdjacentElement('beforebegin', newComparisonDiv);
  }
  
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
        }
      }
    } else if (merge.status === 'pending') {
      // For pending merges, we count worst-case scenario
      newTotal += calcComparisonsNeeded([...merge.left, ...merge.right]);
    }
    // Completed merges don't add to the count
  });
  
  totalComparisons = Math.max(completedComparisons, newTotal);
}

// User chooses option A
function handleOptionA() {
  if (currentState && currentState.type === 'merge') {
    const chosenSong = currentState.left[currentState.leftIndex];
    const rejectedSong = currentState.right[currentState.rightIndex];
    
    // Log this decision
    decisionHistory.push({
      comparison: completedComparisons + 1,
      chosen: chosenSong,
      rejected: rejectedSong
    });
    
    currentState.result.push(chosenSong);
    currentState.leftIndex++;
    completedComparisons++;
    
    // Update the active merge in pendingMerges
    if (currentState.mergeId !== undefined) {
      pendingMerges[currentState.mergeId].leftProgress = currentState.leftIndex;
      pendingMerges[currentState.mergeId].rightProgress = currentState.rightIndex;
      pendingMerges[currentState.mergeId].resultLength = currentState.result.length;
    }
    
    recalculateRemainingComparisons();
    processCurrentState();
    updateProgressDisplay();
  }
}

// User chooses option B
function handleOptionB() {
  if (currentState && currentState.type === 'merge') {
    const chosenSong = currentState.right[currentState.rightIndex];
    const rejectedSong = currentState.left[currentState.leftIndex];
    
    // Log this decision
    decisionHistory.push({
      comparison: completedComparisons + 1,
      chosen: chosenSong,
      rejected: rejectedSong
    });
    
    currentState.result.push(chosenSong);
    currentState.rightIndex++;
    completedComparisons++;
    
    // Update the active merge in pendingMerges
    if (currentState.mergeId !== undefined) {
      pendingMerges[currentState.mergeId].leftProgress = currentState.leftIndex;
      pendingMerges[currentState.mergeId].rightProgress = currentState.rightIndex;
      pendingMerges[currentState.mergeId].resultLength = currentState.result.length;
    }
    
    recalculateRemainingComparisons();
    processCurrentState();
    updateProgressDisplay();
  }
}

function showResult() {
  const resultDiv = document.getElementById("result");
  
  // Add the list name to the results
  const listName = songLists[currentListId].name;
  
  // Create the final ranking list
  let resultHTML = `<h2>Your ${listName} Ranking:</h2><ol>` +
    finalSorted.map(song => `<li>${song}</li>`).join('') +
    "</ol>";
    
  // Create the decision history section
  resultHTML += "<h2>Your Decision History:</h2>";
  resultHTML += "<div class='decision-table'>";
  resultHTML += "<table>" +
    "<thead><tr>" +
    "<th>#</th>" +
    "<th>Chosen</th>" +
    "<th>Rejected</th>" +
    "</tr></thead><tbody>";
    
  decisionHistory.forEach(decision => {
    resultHTML += `<tr>
      <td>${decision.comparison}</td>
      <td class="chosen">${decision.chosen}</td>
      <td class="rejected">${decision.rejected}</td>
    </tr>`;
  });
  
  resultHTML += "</tbody></table></div>";
  
  // Add a restart button
  resultHTML += '<div class="restart-container"><button id="restartButton" class="restart-button">Rank Another List</button></div>';
  
  // Update the result div with all content
  resultDiv.innerHTML = resultHTML;
  
  // Hide comparison elements
  document.getElementById("choices").style.display = "none";
  if (document.getElementById("progress")) {
    document.getElementById("progress").style.display = "none";
  }
  if (document.getElementById("comparison")) {
    document.getElementById("comparison").style.display = "none";
  }
  
  // Add event listener to restart button
  document.getElementById("restartButton").addEventListener("click", resetInterface);
}

// Initialize when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", initializeApp);