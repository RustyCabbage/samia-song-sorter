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

// State to track our current progress
let currentState = null;
let finalSorted = [];
let totalComparisons = 0;
let completedComparisons = 0;

// Calculate actual number of comparisons needed for merge sort
function calculateTotalComparisons(n) {
  if (n <= 1) return 0;
  
  // For merge sort with n elements:
  // - We need to split the array into two halves recursively
  // - Then merge them by comparing elements from both halves
  // The number of comparisons is the sum of:
  // 1. Comparisons in the left half
  // 2. Comparisons in the right half
  // 3. Comparisons to merge the two halves (worst case: n-1)
  
  const leftSize = Math.floor(n/2);
  const rightSize = n - leftSize;
  
  return calculateTotalComparisons(leftSize) + 
         calculateTotalComparisons(rightSize) + 
         (n - 1);
}

// Start the sorting process
function startSorting() {
  // Start with a shuffled array
  const shuffledSongs = [...songs];
  for (let i = shuffledSongs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledSongs[i], shuffledSongs[j]] = [shuffledSongs[j], shuffledSongs[i]];
  }
  
  // Estimate total comparisons
  totalComparisons = calculateTotalComparisons(shuffledSongs.length);
  completedComparisons = 0;
  
  // Update progress display
  updateProgressDisplay();
  
  // Initialize our sorting state
  currentState = {
    type: 'mergeSort',
    array: shuffledSongs,
    onComplete: (sorted) => {
      finalSorted = sorted;
      showResult();
    }
  };
  
  // Begin the sorting process
  processCurrentState();
}

// Update the progress display
function updateProgressDisplay() {
  const progressPercentage = totalComparisons === 0 ? 
    0 : Math.round((completedComparisons / totalComparisons) * 100);
  
  const progressDiv = document.getElementById("progress");
  if (!progressDiv) {
    // Create progress display if it doesn't exist
    const newProgressDiv = document.createElement("div");
    newProgressDiv.id = "progress";
    newProgressDiv.style.marginBottom = "20px";
    document.getElementById("choices").insertAdjacentElement('beforebegin', newProgressDiv);
  }
  
  document.getElementById("progress").textContent = `Progress: ${progressPercentage}% sorted`;
}

// Process the current state of our algorithm
function processCurrentState() {
  if (!currentState) return;
  
  if (currentState.type === 'mergeSort') {
    processMergeSort();
  } else if (currentState.type === 'merge') {
    processMerge();
  }
}

// Process a merge sort state
function processMergeSort() {
  const { array, onComplete } = currentState;
  
  // Base case: arrays of length 0 or 1 are already sorted
  if (array.length <= 1) {
    onComplete(array);
    return;
  }
  
  const middle = Math.floor(array.length / 2);
  
  // Split into left and right subarrays
  const leftArray = array.slice(0, middle);
  const rightArray = array.slice(middle);
  
  // First, sort the left subarray
  currentState = {
    type: 'mergeSort',
    array: leftArray,
    onComplete: (sortedLeft) => {
      // After left is sorted, sort the right subarray
      currentState = {
        type: 'mergeSort',
        array: rightArray,
        onComplete: (sortedRight) => {
          // After both are sorted, merge them
          currentState = {
            type: 'merge',
            left: sortedLeft,
            right: sortedRight,
            result: [],
            leftIndex: 0,
            rightIndex: 0,
            onComplete
          };
          processCurrentState();
        }
      };
      processCurrentState();
    }
  };
  
  processCurrentState();
}

// Process a merge state
function processMerge() {
  const { left, right, result, leftIndex, rightIndex, onComplete } = currentState;

  // If we've processed all elements from both arrays
  if (leftIndex >= left.length && rightIndex >= right.length) {
    onComplete(result);
    return;
  }
  
  // If we've finished with the left array, add the current right element
  if (leftIndex >= left.length) {
    currentState.result.push(right[rightIndex]);
    currentState.rightIndex++;
    processCurrentState();
    return;
  }
  
  // If we've finished with the right array, add the current left element
  if (rightIndex >= right.length) {
    currentState.result.push(left[leftIndex]);
    currentState.leftIndex++;
    processCurrentState();
    return;
  }
  
  // Otherwise, ask the user which they prefer
  const btnA = document.getElementById("btnA");
  const btnB = document.getElementById("btnB");
  
  // Set the button content
  btnA.textContent = left[leftIndex];
  btnB.textContent = right[rightIndex];
  
  // Ensure consistent button size and positioning
  btnA.style.width = "200px";
  btnA.style.height = "50px";
  btnB.style.width = "200px";
  btnB.style.height = "50px";
}

// When the user chooses option A
document.getElementById("btnA").onclick = () => {
  if (currentState && currentState.type === 'merge') {
    currentState.result.push(currentState.left[currentState.leftIndex]);
    currentState.leftIndex++;
    completedComparisons++;
    updateProgressDisplay();
    processCurrentState();
  }
};

// When the user chooses option B
document.getElementById("btnB").onclick = () => {
  if (currentState && currentState.type === 'merge') {
    currentState.result.push(currentState.right[currentState.rightIndex]);
    currentState.rightIndex++;
    completedComparisons++;
    updateProgressDisplay();
    processCurrentState();
  }
};

function showResult() {
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = "<h2>Your Song Ranking:</h2><ol>" +
    finalSorted.map(song => `<li>${song}</li>`).join('') +
    "</ol>";
  document.getElementById("choices").style.display = "none";
  if (document.getElementById("progress")) {
    document.getElementById("progress").style.display = "none";
  }
}

// Start the sorter
startSorting();