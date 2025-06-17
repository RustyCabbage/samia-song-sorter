/******************************************
 * GRAPH UTILITY FUNCTIONS (OPTIMIZED)
 ******************************************/

/**
 * Infer preferences based on transitivity (A > B and B > C implies A > C)
 * Uses optimized Floyd-Warshall algorithm with flat matrix representation
 * @param {Array} history - Decision history array to work with
 * @returns {Array} - List of direct decisions and transitive preferences
 */
export function computeTransitiveClosure(history) {
  // Note: This function originally had a default parameter referencing 'decisionHistory'
  // which appears to be a global variable that should be passed in explicitly
  if (!history) {
    throw new Error('History parameter is required');
  }

  const allNodes = new Set();
  for (const {chosen, rejected} of history) {
    allNodes.add(chosen);
    allNodes.add(rejected);
  }

  const nodes = Array.from(allNodes);
  const nodeCount = nodes.length;
  const nodeToIndex = new Map();
  nodes.forEach((node, i) => nodeToIndex.set(node, i));

  const matrix = new Uint8Array(nodeCount * nodeCount);

  for (const {chosen, rejected} of history) {
    const i = nodeToIndex.get(chosen);
    const j = nodeToIndex.get(rejected);
    matrix[i * nodeCount + j] = 1;
  }

  // Floyd-Warshall for transitive closure
  for (let k = 0; k < nodeCount; k++) {
    for (let i = 0; i < nodeCount; i++) {
      if (matrix[i * nodeCount + k]) {
        for (let j = 0; j < nodeCount; j++) {
          if (matrix[k * nodeCount + j]) {
            matrix[i * nodeCount + j] = 1;
          }
        }
      }
    }
  }

  const allPreferences = [...history];

  for (let i = 0; i < nodeCount; i++) {
    for (let j = 0; j < nodeCount; j++) {
      if (matrix[i * nodeCount + j]) {
        const chosen = nodes[i];
        const rejected = nodes[j];

        const isDirect = history.some(pref =>
          pref.chosen === chosen && pref.rejected === rejected
        );

        if (!isDirect) {
          allPreferences.push({
            comparison: null,
            chosen: chosen,
            rejected: rejected,
            elapsedTime: null,
            type: 'infer'
          });
        }
      }
    }
  }

  return allPreferences;
}

/**
 * Compute the transitive reduction of the comparison graph
 * @param {Array} history - Decision history array to work with
 * @param {boolean} isTransitiveClosure - Whether the input is a transitive closure (i.e., already computed)
 * @returns {Array} - Minimal set of comparisons that preserve the same ordering
 */
export function computeTransitiveReduction(history, isTransitiveClosure = false) {
  // Note: Original had default parameter referencing 'decisionHistory'
  if (!history) {
    throw new Error('History parameter is required');
  }

  let transitiveClosure = (isTransitiveClosure) ? history : computeTransitiveClosure(history);

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

  for (const node of allNodes) {
    if (!directGraph.has(node)) {
      directGraph.set(node, new Set());
    }
  }

  const transitiveClosureGraph = new Map();

  for (const {chosen, rejected} of transitiveClosure) {
    if (!transitiveClosureGraph.has(chosen)) {
      transitiveClosureGraph.set(chosen, new Set());
    }
    transitiveClosureGraph.get(chosen).add(rejected);
  }

  const nodes = Array.from(allNodes);
  for (const node of nodes) {
    if (!transitiveClosureGraph.has(node)) {
      transitiveClosureGraph.set(node, new Set());
    }
  }

  const reductionGraph = new Map();

  for (const node of nodes) {
    reductionGraph.set(node, new Set([...directGraph.get(node)]));
  }

  for (const i of nodes) {
    for (const j of Array.from(reductionGraph.get(i))) {
      let hasIndirectPath = false;

      for (const k of nodes) {
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

  const reducedPreferences = [];

  for (const [chosen, rejectedSet] of reductionGraph.entries()) {
    for (const rejected of rejectedSet) {
      const originalComparison = history.find(pref => pref.chosen === chosen && pref.rejected === rejected);
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
export function topologicalSortPreferences(preferences) {
  const graph = new Map();
  const inDegree = new Map();
  const allNodes = new Set();

  for (const pref of preferences) {
    const {chosen, rejected} = pref;
    allNodes.add(chosen);
    allNodes.add(rejected);

    if (!graph.has(chosen)) {
      graph.set(chosen, new Set());
    }
    graph.get(chosen).add(rejected);

    if (!inDegree.has(chosen)) {
      inDegree.set(chosen, 0);
    }
    if (!inDegree.has(rejected)) {
      inDegree.set(rejected, 0);
    }
  }

  for (const [node, edges] of graph.entries()) {
    for (const target of edges) {
      inDegree.set(target, inDegree.get(target) + 1);
    }
  }

  const queue = [];
  for (const node of allNodes) {
    if (inDegree.get(node) === 0) {
      queue.push(node);
    }
  }

  const sortedItems = [];
  while (queue.length > 0) {
    const node = queue.shift();
    sortedItems.push(node);

    if (graph.has(node)) {
      for (const neighbor of graph.get(node)) {
        inDegree.set(neighbor, inDegree.get(neighbor) - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }
  }

  if (sortedItems.length !== allNodes.size) {
    console.warn("Warning: Preference graph contains cycles!");
  }

  const sortedPreferences = [...preferences];
  sortedPreferences.sort((a, b) => {
    const posA_chosen = sortedItems.indexOf(a.chosen);
    const posB_chosen = sortedItems.indexOf(b.chosen);

    if (posA_chosen !== posB_chosen) {
      return posA_chosen - posB_chosen;
    }

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
export function topologicalSortItems(preferences) {
  const graph = new Map();
  const allNodes = new Set();

  for (const {chosen, rejected} of preferences) {
    allNodes.add(chosen);
    allNodes.add(rejected);

    if (!graph.has(chosen)) {
      graph.set(chosen, new Set());
    }
    graph.get(chosen).add(rejected);
  }

  for (const node of allNodes) {
    if (!graph.has(node)) {
      graph.set(node, new Set());
    }
  }

  const inDegree = new Map();
  for (const node of allNodes) {
    inDegree.set(node, 0);
  }

  for (const [node, edges] of graph.entries()) {
    for (const target of edges) {
      inDegree.set(target, inDegree.get(target) + 1);
    }
  }

  const queue = [];
  for (const [node, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(node);
    }
  }

  const result = [];

  while (queue.length > 0) {
    const node = queue.shift();
    result.push(node);

    for (const neighbor of graph.get(node)) {
      inDegree.set(neighbor, inDegree.get(neighbor) - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (result.length !== allNodes.size) {
    console.warn("Graph contains a cycle, topological sort is incomplete");
  }
  return result;
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
export function visualizeGraph(graph) {
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

// Create a convenient object grouping all graph utilities for easier importing
export const GraphUtils = {
  computeTransitiveClosure,
  computeTransitiveReduction,
  topologicalSortPreferences,
  topologicalSortItems,
  visualizeGraph
};

// Default export for the most commonly used utilities
export default {
  GraphUtils
};