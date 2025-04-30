const songs = [
  "Bovine Excision",
  "Hole in a Frame",
  "Lizard",
  "Dare",
  "Fair Game",
  "Spine Oil",
  "Craziest Person",
  "Sacred",
  "Carousel",
  "Proof",
  "North Poles",
  "Pants"
];

let currentState = null;
let finalSorted = [];
let completedComparisons = 0;
let totalComparisons = 0;
let pendingMerges = [];
let decisionHistory = [];

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
document.getElementById("btnA").onclick = function() {
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
    updateProgressDisplay();
    processCurrentState();
  }
};

// User chooses option B
document.getElementById("btnB").onclick = function() {
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
    updateProgressDisplay();
    processCurrentState();
  }
};

function showResult() {
  const resultDiv = document.getElementById("result");
  
  // Create the final ranking list
  let resultHTML = "<h2>Your Song Ranking:</h2><ol>" +
    finalSorted.map(song => `<li>${song}</li>`).join('') +
    "</ol>";
    
  // Create the decision history section
  resultHTML += "<h2>Your Decision History:</h2>";
  resultHTML += "<div class='decision-table'>";
  resultHTML += "<table>" +
    "<thead><tr>" +
    "<th>Comparison #</th>" +
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
}

// Start the sorter
startSorting();