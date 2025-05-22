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

/******************************************
 * GRAPH UTILITY FUNCTIONS (OPTIMIZED)
 ******************************************/

/**
 * Infer preferences based on transitivity (A > B and B > C implies A > C)
 * This uses an optimized Floyd-Warshall algorithm with a flat matrix representation
 * for improved performance and memory efficiency.
 *
 * OPTIMIZATION DETAILS:
 * - Uses Uint8Array instead of Map<Set> for O(1) constant-time access
 * - Single memory allocation reduces garbage collection pressure
 * - Cache-friendly sequential memory access patterns
 * - Bitwise operations are faster than Set method calls
 *
 * @param {Array} history - Decision history array to work with
 * @returns {Array} - List of direct decisions + transitive preferences
 */
function computeTransitiveClosure(history = decisionHistory) {
  // STEP 1: Extract all unique nodes from the decision history
  // We need to know every item that appears in any comparison to build our matrix
  const allNodes = new Set();

  // Scan through all decisions to collect every unique item name
  for (const {chosen, rejected} of history) {
    allNodes.add(chosen);
    allNodes.add(rejected);
  }

  // Convert Set to Array for indexed access and create bidirectional mapping
  const nodes = Array.from(allNodes);
  const nodeCount = nodes.length;

  // Create a mapping from node name (string) to matrix index (number)
  // This allows us to quickly convert "ItemA" -> 0, "ItemB" -> 1, etc.
  const nodeToIndex = new Map();
  nodes.forEach((nodeName, index) => {
    nodeToIndex.set(nodeName, index);
  });

  // STEP 2: Initialize the adjacency matrix
  // Using Uint8Array for memory efficiency - each cell is just 1 byte (0 or 1)
  // Matrix is stored in row-major order: matrix[i * nodeCount + j] represents edge from node i to node j
  // A value of 1 means "node i beats node j", 0 means no direct relationship
  const adjacencyMatrix = new Uint8Array(nodeCount * nodeCount);

  // Populate the matrix with direct comparisons from decision history
  // Each decision "A chosen over B" becomes matrix[indexA][indexB] = 1
  for (const {chosen, rejected} of history) {
    const chosenIndex = nodeToIndex.get(chosen);
    const rejectedIndex = nodeToIndex.get(rejected);

    // Set the bit indicating that 'chosen' beats 'rejected'
    // Formula: row * width + column gives us the flat array index
    adjacencyMatrix[chosenIndex * nodeCount + rejectedIndex] = 1;
  }

  // STEP 3: Apply Floyd-Warshall algorithm for transitive closure
  // This is the core algorithm that infers indirect relationships
  // If A beats B and B beats C, then A beats C (transitivity)
  //
  // Triple nested loop structure:
  // - k: intermediate node (the "bridge" in A->k->C relationships)
  // - i: source node (the "winner" in the relationship)
  // - j: target node (the "loser" in the relationship)
  //
  // The algorithm checks: if there's a path i->k and k->j, then create i->j
  for (let k = 0; k < nodeCount; k++) {
    // For each potential intermediate node k
    for (let i = 0; i < nodeCount; i++) {
      // Check if there's an edge from i to k
      // Only proceed if node i beats node k (matrix[i][k] == 1)
      if (adjacencyMatrix[i * nodeCount + k] === 1) {

        // Now check all possible target nodes j
        for (let j = 0; j < nodeCount; j++) {
          // Check if there's an edge from k to j
          // If k beats j (matrix[k][j] == 1), then we can infer i beats j
          if (adjacencyMatrix[k * nodeCount + j] === 1) {
            // Create the transitive relationship: i beats j
            // This represents the inference: i > k AND k > j THEREFORE i > j
            adjacencyMatrix[i * nodeCount + j] = 1;
          }
        }
      }
    }
  }

  // STEP 4: Convert the matrix back to preference objects
  // We need to return the same format as the original function for compatibility
  const allPreferences = [...history]; // Start with all original direct comparisons

  // Scan through the matrix to find all relationships (direct + inferred)
  for (let i = 0; i < nodeCount; i++) {
    for (let j = 0; j < nodeCount; j++) {
      // If there's a relationship from node i to node j
      if (adjacencyMatrix[i * nodeCount + j] === 1) {
        const chosenNode = nodes[i];
        const rejectedNode = nodes[j];

        // Check if this relationship already exists in our direct history
        // We don't want to duplicate direct comparisons that were made by the user
        const isDirectComparison = history.some(pref => pref.chosen === chosenNode && pref.rejected === rejectedNode);

        // If this is a NEW relationship (inferred through transitivity), add it
        if (!isDirectComparison) {
          allPreferences.push({
            comparison: null,        // No original comparison object (this was inferred)
            chosen: chosenNode,      // The item that wins in this inferred relationship
            rejected: rejectedNode,  // The item that loses in this inferred relationship
            elapsedTime: null,       // No timing data for inferred relationships
            type: 'infer'           // Mark this as an inferred preference
          });
        }
      }
    }
  }

  return allPreferences;
}

/**
 * Compute the transitive reduction of the comparison graph
 * The transitive reduction finds the minimal set of edges that preserve the same ordering.
 * This is useful for simplifying complex preference graphs while maintaining all relationships.
 *
 * ALGORITHM EXPLANATION:
 * Given a graph with edges A->B, B->C, A->C, the transitive reduction removes A->C
 * because it's redundant (A->C can be inferred from A->B and B->C).
 *
 * @param {Array} history - Decision history array to work with
 * @param {boolean} isTransitiveClosure - Whether the input is already a transitive closure
 * @returns {Array} - Minimal set of comparisons that preserve the same ordering
 */
function computeTransitiveReduction(history = decisionHistory, isTransitiveClosure = false) {
  // STEP 1: Get the complete transitive closure if not already provided
  // We need the full closure to determine which edges are redundant
  let transitiveClosure = isTransitiveClosure ? history : computeTransitiveClosure(history);

  // STEP 2: Build the original direct graph structure
  // This represents only the explicit comparisons made by the user
  const directGraph = new Map();
  const allNodes = new Set();

  // Extract direct edges from the original history (not the closure)
  for (const {chosen, rejected} of history) {
    allNodes.add(chosen);
    allNodes.add(rejected);

    if (!directGraph.has(chosen)) {
      directGraph.set(chosen, new Set());
    }
    directGraph.get(chosen).add(rejected);
  }

  // Ensure every node exists in the graph structure, even if it has no outgoing edges
  for (const node of allNodes) {
    if (!directGraph.has(node)) {
      directGraph.set(node, new Set());
    }
  }

  // STEP 3: Build the transitive closure graph structure
  // This contains ALL relationships (direct + inferred)
  const transitiveClosureGraph = new Map();

  for (const {chosen, rejected} of transitiveClosure) {
    if (!transitiveClosureGraph.has(chosen)) {
      transitiveClosureGraph.set(chosen, new Set());
    }
    transitiveClosureGraph.get(chosen).add(rejected);
  }

  // Ensure all nodes are represented in the transitive closure graph
  const nodes = Array.from(allNodes);
  for (const node of nodes) {
    if (!transitiveClosureGraph.has(node)) {
      transitiveClosureGraph.set(node, new Set());
    }
  }

  // STEP 4: Compute the transitive reduction
  // Start with all direct edges, then remove redundant ones
  const reductionGraph = new Map();

  // Initialize the reduction graph with all direct edges
  for (const node of nodes) {
    reductionGraph.set(node, new Set([...directGraph.get(node)]));
  }

  // STEP 5: Remove redundant edges
  // An edge i->j is redundant if there exists a path i->k->j for some k != i,j
  for (const i of nodes) {
    // Create a copy of the edges to iterate over (avoid modifying while iterating)
    const edgesToCheck = Array.from(reductionGraph.get(i));

    for (const j of edgesToCheck) {
      // For each edge i->j, check if there's an alternative path
      let hasIndirectPath = false;

      // Look for intermediate nodes k such that i->k->j exists
      for (const k of nodes) {
        // Skip if k is the same as source or destination
        if (k !== i && k !== j) {
          // Check if there's a path i->k AND k->j in the transitive closure
          // If both exist, then i->j is redundant
          if (transitiveClosureGraph.get(i).has(k) && transitiveClosureGraph.get(k).has(j)) {
            hasIndirectPath = true;
            break; // Found one indirect path, that's enough
          }
        }
      }

      // If we found an indirect path, remove the direct edge as redundant
      if (hasIndirectPath) {
        reductionGraph.get(i).delete(j);
      }
    }
  }

  // STEP 6: Convert the reduced graph back to preference objects
  const reducedPreferences = [];

  // Only include edges that survived the reduction process
  for (const [chosen, rejectedSet] of reductionGraph.entries()) {
    for (const rejected of rejectedSet) {
      // Find the original comparison object from the history
      // Since we only keep direct edges, every edge in the reduction
      // must correspond to an original user decision
      const originalComparison = history.find(pref => pref.chosen === chosen && pref.rejected === rejected);

      if (originalComparison) {
        reducedPreferences.push(originalComparison);
      }
    }
  }

  return reducedPreferences;
}

/**
 * Topologically sort the preferences returned by the transitive reduction
 * This organizes preferences in a logical order that respects the dependency relationships.
 *
 * ALGORITHM EXPLANATION:
 * Topological sorting arranges nodes so that if there's an edge A->B, then A appears before B.
 * This is useful for presenting preferences in a meaningful sequence.
 *
 * @param {Array} preferences - List of preferences (e.g., from computeTransitiveReduction)
 * @returns {Array} - Topologically sorted list of preferences
 */
function topologicalSortPreferences(preferences) {
  // STEP 1: Build graph representation from preferences
  // We need to track both the graph structure and incoming edge counts
  const graph = new Map();        // item → Set of items it beats
  const inDegree = new Map();     // item → count of items that beat it
  const allNodes = new Set();     // collection of all unique items

  // Initialize data structures by scanning all preferences
  for (const pref of preferences) {
    const {chosen, rejected} = pref;
    allNodes.add(chosen);
    allNodes.add(rejected);

    // Build the adjacency list representation
    if (!graph.has(chosen)) {
      graph.set(chosen, new Set());
    }
    graph.get(chosen).add(rejected);

    // Initialize in-degree counters (will be calculated in next step)
    if (!inDegree.has(chosen)) {
      inDegree.set(chosen, 0);
    }
    if (!inDegree.has(rejected)) {
      inDegree.set(rejected, 0);
    }
  }

  // STEP 2: Calculate in-degrees for all nodes
  // In-degree = number of edges pointing TO this node (how many items beat it)
  for (const [node, edges] of graph.entries()) {
    for (const target of edges) {
      // Each edge from 'node' to 'target' increases target's in-degree by 1
      inDegree.set(target, inDegree.get(target) + 1);
    }
  }

  // STEP 3: Initialize the processing queue with nodes that have no incoming edges
  // Nodes with in-degree 0 are "sources" - they're not beaten by anything
  const queue = [];
  for (const node of allNodes) {
    if (inDegree.get(node) === 0) {
      queue.push(node);
    }
  }

  // STEP 4: Perform topological sort using Kahn's algorithm
  const sortedItems = [];

  while (queue.length > 0) {
    // Remove a node with no incoming edges
    const currentNode = queue.shift();
    sortedItems.push(currentNode);

    // For each neighbor of the current node, reduce its in-degree
    if (graph.has(currentNode)) {
      for (const neighbor of graph.get(currentNode)) {
        // Decrement in-degree (we're "removing" the edge from currentNode)
        inDegree.set(neighbor, inDegree.get(neighbor) - 1);

        // If this neighbor now has no incoming edges, add it to the queue
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }
  }

  // STEP 5: Check for cycles in the graph
  // If we haven't processed all nodes, there must be a cycle
  if (sortedItems.length !== allNodes.size) {
    console.warn("Warning: Preference graph contains cycles! Topological sort incomplete.");
  }

  // STEP 6: Sort the original preferences based on the topological order
  // We want to arrange preferences so they follow the logical item ordering
  const sortedPreferences = [...preferences];

  sortedPreferences.sort((prefA, prefB) => {
    // Get the positions of the chosen items in our topological ordering
    const positionA_chosen = sortedItems.indexOf(prefA.chosen);
    const positionB_chosen = sortedItems.indexOf(prefB.chosen);

    // Primary sort: by position of the chosen item
    if (positionA_chosen !== positionB_chosen) {
      return positionA_chosen - positionB_chosen;
    }

    // Secondary sort: if chosen items are the same, sort by rejected item position
    const positionA_rejected = sortedItems.indexOf(prefA.rejected);
    const positionB_rejected = sortedItems.indexOf(prefB.rejected);
    return positionA_rejected - positionB_rejected;
  });

  return sortedPreferences;
}

/**
 * Topologically sort the items based on the reduced comparison graph
 * This produces a ranked list of items from best to worst based on all comparisons.
 *
 * OUTPUT INTERPRETATION:
 * The returned array represents a complete ranking where:
 * - Earlier items are "better" (beat more other items)
 * - Later items are "worse" (beaten by more other items)
 *
 * @param {Array} preferences - Array of preference objects (from computeTransitiveReduction)
 * @returns {Array} - Array of items in topological order (best to worst)
 */
function topologicalSortItems(preferences) {
  // STEP 1: Build directed graph from preferences
  const graph = new Map();       // item → Set of items it beats
  const allNodes = new Set();    // collection of all unique items

  // Extract graph structure from preference objects
  for (const {chosen, rejected} of preferences) {
    allNodes.add(chosen);
    allNodes.add(rejected);

    // Build adjacency list: chosen item "points to" rejected item
    if (!graph.has(chosen)) {
      graph.set(chosen, new Set());
    }
    graph.get(chosen).add(rejected);
  }

  // Ensure all nodes are represented in the graph, even those with no outgoing edges
  for (const node of allNodes) {
    if (!graph.has(node)) {
      graph.set(node, new Set());
    }
  }

  // STEP 2: Calculate in-degree for each node
  // In-degree = number of items that beat this item
  const inDegree = new Map();

  // Initialize all in-degrees to 0
  for (const node of allNodes) {
    inDegree.set(node, 0);
  }

  // Count incoming edges for each node
  for (const [sourceNode, targetNodes] of graph.entries()) {
    for (const targetNode of targetNodes) {
      // Each edge from source to target increases target's in-degree
      inDegree.set(targetNode, inDegree.get(targetNode) + 1);
    }
  }

  // STEP 3: Initialize processing queue with "source" nodes
  // Source nodes have in-degree 0 (nothing beats them, so they're the "best")
  const processingQueue = [];
  for (const [node, degree] of inDegree.entries()) {
    if (degree === 0) {
      processingQueue.push(node);
    }
  }

  // STEP 4: Process nodes in topological order using Kahn's algorithm
  const topologicallyOrderedItems = [];

  while (processingQueue.length > 0) {
    // Remove a node that currently has no incoming edges
    const currentNode = processingQueue.shift();
    topologicallyOrderedItems.push(currentNode);

    // Process all nodes that this current node beats
    for (const defeatedNode of graph.get(currentNode)) {
      // Decrease the in-degree of the defeated node
      // (we're conceptually "removing" the edge from current to defeated)
      inDegree.set(defeatedNode, inDegree.get(defeatedNode) - 1);

      // If the defeated node now has no incoming edges, it's ready for processing
      if (inDegree.get(defeatedNode) === 0) {
        processingQueue.push(defeatedNode);
      }
    }
  }

  // STEP 5: Validate the result
  // If we didn't process all nodes, there's a cycle in the preference graph
  if (topologicallyOrderedItems.length !== allNodes.size) {
    console.warn("Graph contains a cycle, topological sort is incomplete");
    console.warn(`Processed ${topologicallyOrderedItems.length} of ${allNodes.size} nodes`);
  }

  return topologicallyOrderedItems;
}

/**
 * Helper function to visualize the graph structure (useful for debugging)
 * This creates a human-readable representation of the relationship graph.
 *
 * OUTPUT FORMAT:
 * Each line shows: "ItemName -> list, of, items, it, beats"
 * Empty lines indicate items that don't beat anything.
 *
 * @param {Map} graph - Graph represented as adjacency list (Map of node -> Set of nodes)
 * @returns {String} - Text representation of the graph structure
 */
function visualizeGraph(graph) {
  let graphVisualization = '';

  // Iterate through each node and its outgoing edges
  for (const [sourceNode, targetNodes] of graph.entries()) {
    const targetList = Array.from(targetNodes).join(', ');

    // Show the node and what it connects to
    if (targetList.length > 0) {
      graphVisualization += `${sourceNode} -> ${targetList}\n`;
    } else {
      graphVisualization += `${sourceNode} -> (beats nothing)\n`;
    }
  }

  return graphVisualization;
}