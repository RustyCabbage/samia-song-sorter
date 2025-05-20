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
 * GRAPH UTILITY FUNCTIONS
 ******************************************/

/**
 * Infer preferences based on transitivity (A > B and B > C implies A > C)
 * This uses the Floyd-Warshall algorithm to find the transitive closure of the comparisons
 * @param {Array} history - Decision history array to work with
 * @returns {Array} - List of direct decisions + transitive preferences
 */
function computeTransitiveClosure(history = decisionHistory) {
  // A. Gather all distinct nodes and build adjacency in one pass
  const graph = new Map();       // item → Set of items it beats
  const allNodes = new Set();    // to collect every item

  for (const {chosen, rejected} of history) {
    allNodes.add(chosen);
    allNodes.add(rejected);

    if (!graph.has(chosen)) {
      graph.set(chosen, new Set());
    }
    graph.get(chosen).add(rejected);
  }

  // B. Ensure every node is in the graph (even if it has no outgoing edges)
  for (const node of allNodes) {
    if (!graph.has(node)) {
      graph.set(node, new Set());
    }
  }

  // Perform transitive closure
  const nodes = Array.from(allNodes);
  for (const k of nodes) {
    for (const i of nodes) {
      if (graph.get(i).has(k)) {
        for (const j of nodes) {
          if (graph.get(k).has(j)) {
            graph.get(i).add(j);
          }
        }
      }
    }
  }

  // Convert back to preference objects
  const allPreferences = [...history];

  // Add transitive preferences
  for (const [chosen, rejectedSet] of graph.entries()) {
    for (const rejected of rejectedSet) {
      // Check if this is already a direct preference
      const isDirect = history.some(pref => pref.chosen === chosen && pref.rejected === rejected);

      if (!isDirect) {
        allPreferences.push({
          comparison: null, chosen: chosen, rejected: rejected, elapsedTime: null, type: 'infer',
        });
      }
    }
  }
  return allPreferences;
}

/**
 * Compute the transitive reduction of the comparison graph
 * @param {Array} history - Decision history array to work with
 * @param isTransitiveClosure - Whether the input is a transitive closure (i.e., already computed)
 * @returns {Array} - Minimal set of comparisons that preserve the same ordering
 */
function computeTransitiveReduction(history = decisionHistory, isTransitiveClosure = false) {
  // Get the transitive closure first
  let transitiveClosure = (isTransitiveClosure) ? history : computeTransitiveClosure(history);

  // Extract direct edges from original history
  const directGraph = new Map();
  const allNodes = new Set();

  for (const {chosen, rejected} of history) {
    allNodes.add(chosen);
    allNodes.add(rejected);

    if (!directGraph.has(chosen)) {
      directGraph.set(chosen, new Set());
    }
    directGraph.get(chosen).add(rejected);
  }

  // Ensure every node is in the graph
  for (const node of allNodes) {
    if (!directGraph.has(node)) {
      directGraph.set(node, new Set());
    }
  }
  //console.log(visualizeGraph(directGraph));

  // Build the transitive closure graph (Map of node → Set of all nodes it beats)
  const transitiveClosureGraph = new Map();

  for (const {chosen, rejected} of transitiveClosure) {
    if (!transitiveClosureGraph.has(chosen)) {
      transitiveClosureGraph.set(chosen, new Set());
    }
    transitiveClosureGraph.get(chosen).add(rejected);
  }

  // Ensure all nodes are in the transitive closure graph
  const nodes = Array.from(allNodes);
  for (const node of nodes) {
    if (!transitiveClosureGraph.has(node)) {
      transitiveClosureGraph.set(node, new Set());
    }
  }
  //console.log(visualizeGraph(transitiveClosureGraph));

  // Now compute the transitive reduction
  const reductionGraph = new Map();

  // Initialize with direct edges
  for (const node of nodes) {
    reductionGraph.set(node, new Set([...directGraph.get(node)]));
  }

  // Remove redundant edges
  for (const i of nodes) {
    for (const j of Array.from(reductionGraph.get(i))) {
      // For each edge i->j, check if there's an indirect path
      let hasIndirectPath = false;

      for (const k of nodes) {
        // If there's a path i->k->j (without going through the direct i->j edge),
        // then the direct edge i->j is redundant
        if (k !== i && k !== j && transitiveClosureGraph.get(i).has(k) && transitiveClosureGraph.get(k).has(j)) {
          hasIndirectPath = true;
          break;
        }
      }

      if (hasIndirectPath) {
        reductionGraph.get(i).delete(j);
      }
    }
  }
  //console.log(visualizeGraph(reductionGraph));

  // Convert back to preference objects
  const reducedPreferences = [];

  // Add only the edges in the transitive reduction
  for (const [chosen, rejectedSet] of reductionGraph.entries()) {
    for (const rejected of rejectedSet) {
      // Find the original comparison
      const originalComparison = history.find(pref => pref.chosen === chosen && pref.rejected === rejected);
      // Since we're only removing edges from the direct graph,
      // every edge in the reduction must exist in the original history
      reducedPreferences.push(originalComparison);
    }
  }
  return reducedPreferences;
}

/**
 * Topologically sort the preferences returned by the transitive reduction
 * @param {Array} preferences - List of preferences (e.g., from computeTransitiveReduction)
 * @returns {Array} - Topologically sorted list of preferences
 */
function topologicalSortPreferences(preferences) {
  // Build a graph representation where:
  // - Nodes are individual items
  // - Edges represent preferences (chosen → rejected)
  const graph = new Map(); // Map of item → Set of items it beats
  const inDegree = new Map(); // Map of item → number of items that beat it
  const allNodes = new Set(); // All unique items

  // Initialize the graph and collect all nodes
  for (const pref of preferences) {
    const {chosen, rejected} = pref;
    allNodes.add(chosen);
    allNodes.add(rejected);

    if (!graph.has(chosen)) {
      graph.set(chosen, new Set());
    }
    graph.get(chosen).add(rejected);

    // Initialize in-degree counts
    if (!inDegree.has(chosen)) {
      inDegree.set(chosen, 0);
    }
    if (!inDegree.has(rejected)) {
      inDegree.set(rejected, 0);
    }
  }
  // Calculate in-degrees for all nodes
  for (const [node, edges] of graph.entries()) {
    for (const target of edges) {
      inDegree.set(target, inDegree.get(target) + 1);
    }
  }
  // Queue for nodes with no incoming edges (in-degree = 0)
  const queue = [];
  for (const node of allNodes) {
    if (inDegree.get(node) === 0) {
      queue.push(node);
    }
  }
  // Perform topological sort on the items
  const sortedItems = [];
  while (queue.length > 0) {
    const node = queue.shift();
    sortedItems.push(node);

    // For each neighbor, decrement in-degree and enqueue if in-degree becomes 0
    if (graph.has(node)) {
      for (const neighbor of graph.get(node)) {
        inDegree.set(neighbor, inDegree.get(neighbor) - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }
  }
  // If the number of visited nodes doesn't match the total nodes,
  // there's a cycle in the graph (which shouldn't happen with valid preferences)
  if (sortedItems.length !== allNodes.size) {
    console.warn("Warning: Preference graph contains cycles!");
  }
  // Now, sort the preferences based on the topological order of items
  // For each preference, we'll assign a priority based on the positions of chosen and rejected items
  const sortedPreferences = [...preferences];
  sortedPreferences.sort((a, b) => {
    const posA_chosen = sortedItems.indexOf(a.chosen);
    const posB_chosen = sortedItems.indexOf(b.chosen);

    // If the chosen items are different, sort by their position
    if (posA_chosen !== posB_chosen) {
      return posA_chosen - posB_chosen;
    }

    // If the chosen items are the same, sort by the position of the rejected items
    const posA_rejected = sortedItems.indexOf(a.rejected);
    const posB_rejected = sortedItems.indexOf(b.rejected);
    return posA_rejected - posB_rejected;
  });

  return sortedPreferences;
}

/**
 * Topologically sort the items based on the reduced comparison graph
 * @param {Array} preferences - Array of preference objects (from computeTransitiveReduction)
 * @returns {Array} - Array of items in topological order (best to worst)
 */
function topologicalSortItems(preferences) {
  // Build directed graph from preferences
  const graph = new Map();
  const allNodes = new Set();

  // Add all nodes and edges to the graph
  for (const {chosen, rejected} of preferences) {
    allNodes.add(chosen);
    allNodes.add(rejected);

    if (!graph.has(chosen)) {
      graph.set(chosen, new Set());
    }
    graph.get(chosen).add(rejected);
  }
  // Ensure all nodes are in the graph (even with no outgoing edges)
  for (const node of allNodes) {
    if (!graph.has(node)) {
      graph.set(node, new Set());
    }
  }
  // Calculate in-degree for each node (how many edges point to it)
  const inDegree = new Map();
  for (const node of allNodes) {
    inDegree.set(node, 0);
  }

  for (const [node, edges] of graph.entries()) {
    for (const target of edges) {
      inDegree.set(target, inDegree.get(target) + 1);
    }
  }
  // Queue of nodes with no incoming edges (in-degree of 0)
  const queue = [];
  for (const [node, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(node);
    }
  }
  // Result array for topologically sorted nodes
  const result = [];

  // Process the queue
  while (queue.length > 0) {
    const node = queue.shift();
    result.push(node);

    // For each neighbor, reduce in-degree and check if it becomes 0
    for (const neighbor of graph.get(node)) {
      inDegree.set(neighbor, inDegree.get(neighbor) - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    }
  }
  // If we didn't visit all nodes, there's a cycle
  if (result.length !== allNodes.size) {
    console.warn("Graph contains a cycle, topological sort is incomplete");
  }
  return result;
}

/**
 * Helper function to visualize the graph structure (useful for debugging)
 * @param {Map} graph - Graph represented as adjacency list
 * @returns {String} - Text representation of the graph
 */
function visualizeGraph(graph) {
  let result = '';
  for (const [node, edges] of graph.entries()) {
    result += `${node} -> ${Array.from(edges).join(', ')}\n`;
  }
  return result;
}