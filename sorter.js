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

  // Calculate the estimated number of comparisons needed
  // - i know the worst case  
  // - i dont know the best case, use 0 for now
  worstCaseTotalComparisons = getWorstCaseMergeInsertion(songs.length);
  bestCaseTotalComparisons = 1;

  // Begin the merge sort process
  const result = await mergeInsertionSort(songs);
  showResult(result.reverse());
  return result.reverse();
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// https://en.wikipedia.org/wiki/Merge-insertion_sort#Analysis
// RIP Dr. Guy.
function getWorstCaseMergeInsertion(n) {
  const z = (3 * n) / 4;
  const term1 = n * Math.ceil(Math.log2(z));
  const term2 = Math.floor(2 ** Math.floor(Math.log2(8*z)) / 3);
  const term3 = Math.floor(Math.log2(8*z) / 2);
  return term1 - term2 + term3;
}

/*************** START
 * main merge-insertion sort function 
 ***************/

/** 
 * Main merge sort function
 * @param {Array} arr - Array to sort
 */
async function mergeInsertionSort(arr, depth=0) {
  const indent = '  '.repeat(depth); // Indentation for current depth
  console.log(`${indent}Recursion depth ${depth} - Input array: [${arr}]`);

  // Base case: array of length 1
  if (arr.length <= 1) {
    console.log(`${indent}Only one element. Sort complete: [${arr}]`);
    console.log(`${indent}<<<Exiting depth ${depth}>>>`);
    return(arr);
  }

  // Step 1: Create floor(n/2) pairs
  const pairs = [];
  for (let i = 0; i < arr.length - 1; i += 2) {
    pairs.push([arr[i], arr[i+1]]);
    
  }
  const unpaired = arr.length % 2 === 1 ? arr[arr.length - 1] : null;
  console.log(
    `${indent}Pairs: [`
    + pairs.map(pair => `(${pair[0]}:${pair[1]})`).join(", ")
    + "]"
  );
  
  // Step 2: Compare elements in each pair (larger element first)
  // <<<Push the larger and smaller>>>
  const orderedPairs = new Map();
  for (const pair of pairs) {
    console.log(`${indent}Comparison ${completedComparisons+1}: ${pair[0]} vs ${pair[1]}`);
    // <<<COMPARE PAIRS BELOW>>>
    // Need user input for this comparison
    const selectedLeft = await requestUserComparison(pair[0], pair[1]);
    
    // Process the user's choice
    const chosen = selectedLeft ? pair[0] : pair[1];
    const rejected = selectedLeft ? pair[1] : pair[0];

    orderedPairs.set(chosen, rejected);

    // Record the preference
    recordPreference(chosen, rejected);
  }
  console.log(
    `${indent}Ordered Pairs: [`
    + Array.from(orderedPairs.entries())
      .map(([larger, smaller]) => `(${larger}:${smaller})`)
      .join(", ")
    + "]"
  );

  // Step 3: Recursively sort the larger elements
  const largerElements = Array.from(orderedPairs.keys());
  console.log(`${indent}Larger Elements: [${largerElements}]`);
  const sortedLargerElements = await mergeInsertionSort(largerElements, depth+1);

  // Prepare the result array with sorted larger elements (S)
  const result = [...sortedLargerElements];  

  // Step 4: Insert the element paired with the smallest element in S  
  result.unshift(orderedPairs.get(result[0]));
  console.log(`${indent}Inserted smallest paired element. S: [${result}]`);

  // Step 5: Insertion
  // Step 5.1: Collect remaining smaller elements + unpaired element if it exists
  const remainingElements = [];
  for (let i = 1; i < sortedLargerElements.length; i++) {
    const smallerElement = orderedPairs.get(sortedLargerElements[i]);
    // i+2 because we start from y3 (as x1 and x2 were paired with each other)
    remainingElements.push(smallerElement);
  }
  // Add unpaired element if it exists with highest index
  if (unpaired !== null) {
    remainingElements.push(unpaired);
  }

  // If there are no elements to insert, we can stop here
  let reorderedElements = [];
  if (remainingElements.length === 0) {
    console.log(`${indent}No elements to insert. Sort complete: [${result}]`);
    return result;
  }
  console.log(`${indent}Remaining elements: [${remainingElements}]`);
  // If there is 1 element, no need to calc groups and stuff
  if (remainingElements.length === 1) {  
    reorderedElements = [...remainingElements];
  } else {
    // Step 5.2: Calculate the special insertion groups
    const insertionGroups = calculateInsertionGroups(remainingElements.length);
    console.log(`${indent}Insertion Groups: [${insertionGroups}]`);
    // Step 5.3: Reorder elements according to the Ford-Johnson sequence
    reorderedElements = reorderForInsertion(remainingElements, insertionGroups);
    console.log(`${indent}Reordered elements: [${reorderedElements}]`);   
  }

  // Step 5.4: Insert each element using binary search up to but not including xi
  // Create a reverse map of orderedPairs so we can get the index of the larger element
  const orderedPairsReversed = new Map();
  orderedPairs.forEach((value, key) => {
    orderedPairsReversed.set(value, key);
  });

  for (const elem of reorderedElements) {
    let subsequenceOfS = [...result];
    const largerElement = orderedPairsReversed.get(elem);
    if (largerElement !== undefined) {
      const index = result.indexOf(largerElement);
      subsequenceOfS = result.slice(0,index);
    }
    console.log(`${indent}Inserting ${elem} into [${subsequenceOfS}]`);
    const index = await getInsertionIndex(subsequenceOfS, elem);
    result.splice(index, 0, elem);
    console.log(`${indent}Updated S: [${result}]`);
  }

  console.log(`${indent}Sorted list: [${result}]`);
  return result;

  /**
   * Calculate the insertion groups for the Ford-Johnson algorithm
   * Groups have sizes: 2, 2, 6, 10, 22, 42, ...
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
   * Reorder elements according to the Ford-Johnson insertion sequence
   * @param {Array} elements - Elements to reorder with their original indexes
   * @param {Array} groups - Group sizes for partitioning
   * @returns {Array} - Reordered elements
   */
  function reorderForInsertion(elements, groups) {
    const result = [];
    let startIndex = 0;
    
    // Process each group
    for (const groupSize of groups) {
      // Get elements for this group
      const group = elements.slice(startIndex, startIndex + groupSize);
      console.log(`${indent}Group to reorder: [${group}]`);
      
      // Add group elements to result
      result.push(...group.reverse());
      startIndex += groupSize;
    }
    
    return result;
  }

  /**
   * Get insertion index through binary search
   * @param {Array} arr - The sorted array
   * @param {*} element - The element to insert
   * @returns {Integer} left - index to insert at
   */
  async function getInsertionIndex(arr, element) {
    let left = 0;
    let right = arr.length - 1;
    
    // Find insertion point using binary search
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      console.log(`Left: ${left}, Mid: ${mid}, Right: ${right}`);
      console.log(`${indent}Comparison ${completedComparisons+1}: ${arr[mid]} vs ${element}`);
      // <<<COMPARE PAIRS BELOW>>>
      const selectedLeft = await requestUserComparison(arr[mid], element);
    
      // Process the user's choice
      const chosen = selectedLeft ? arr[mid] : element;
      const rejected = selectedLeft ? element : arr[mid];

      if (selectedLeft) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
  
      // Record the preference
      recordPreference(chosen, rejected);
      // <<<COMPARE PAIRS ABOVE>>>
    }
    return left;
  }

  // Record a user preference
  function recordPreference(chosen, rejected) {
    completedComparisons++;
    decisionHistory.push({
      comparison: completedComparisons,
      chosen: chosen,
      rejected: rejected
    });
    console.log(`${indent}Comparison #${completedComparisons}: Chose ${chosen} > ${rejected}`);
  }
}

 /*************** END
* main merge-insertion sort function 
 ***************/
/**
 * Request user comparison between two songs
 * @param {string} songA - First song to compare
 * @param {string} songB - Second song to compare
 * @returns {Promise<boolean>} - Promise that resolves to true if left was selected, false otherwise
 */
function requestUserComparison(songA, songB) {
  return new Promise(resolve => {
    // Create comparison object with the resolver included
    const comparison = {
      songA: songA,
      songB: songB,
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
  //updateEstimates(selectedLeft, comparison.leftIndexFromRight, comparison.rightIndexFromRight);
  
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

/*
n = 5;
testCase = [...Array(n+1).keys()];
testCase.shift();
testCase = [1,2,0,4,5];
result = startSorting(testCase, shuffle=false);
console.log(`Number of comparisons: ${completedComparisons}`);
*/

/*
for (const n of testCase) {
	console.log(`n=${n}: insertion groups: ${calculateInsertionGroups(n)}`);
}
*/