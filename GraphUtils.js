/******************************************
 * GRAPH UTILITY FUNCTIONS
 ******************************************/

/**
 * Infer preferences based on transitivity (A > B and B > C implies A > C)
 * Uses optimized Floyd-Warshall algorithm with flat matrix representation
 * @param {Array} history - Decision history array to work with
 * @returns {Array} - List of direct decisions and transitive preferences
 */
export function computeTransitiveClosure(history) {
  if (!history?.length) {
    return history || [];
  }

  const allNodes = new Set();
  const directEdgeSet = new Set();

  for (const {chosen, rejected} of history) {
    allNodes.add(chosen);
    allNodes.add(rejected);
    directEdgeSet.add(`${chosen}|${rejected}`);
  }

  const nodes = Array.from(allNodes);
  const nodeCount = nodes.length;

  //console.log(`Transitive Closure Nodes (${nodeCount}): ` + [...allNodes].map((value, index) => `${index+1}: ${value}`).join(", "));
  //console.log(`Direct Edges: ` + [...directEdgeSet].map((value, index) => `${index+1}: ${value}`).join(", "));

  if (nodeCount <= 1) return [...history];

  const nodeToIndex = new Map();
  nodes.forEach((node, i) => nodeToIndex.set(node, i));

  const matrix = new Uint8Array(nodeCount * nodeCount);

  // Initialize matrix with direct edges
  for (const {chosen, rejected} of history) {
    const i = nodeToIndex.get(chosen);
    const j = nodeToIndex.get(rejected);
    matrix[i * nodeCount + j] = 1;
  }

  // Floyd-Warshall for transitive closure with early termination optimization
  for (let k = 0; k < nodeCount; k++) {
    const kOffset = k * nodeCount;
    for (let i = 0; i < nodeCount; i++) {
      const iOffset = i * nodeCount;
      if (matrix[iOffset + k]) {
        for (let j = 0; j < nodeCount; j++) {
          if (matrix[kOffset + j]) {
            matrix[iOffset + j] = 1;
          }
        }
      }
    }
  }

  const allPreferences = [...history];

  // Extract transitive preferences
  for (let i = 0; i < nodeCount; i++) {
    const iOffset = i * nodeCount;
    const chosen = nodes[i];

    for (let j = 0; j < nodeCount; j++) {
      if (matrix[iOffset + j]) {
        const rejected = nodes[j];
        const edgeKey = `${chosen}|${rejected}`;

        if (!directEdgeSet.has(edgeKey)) {
          allPreferences.push({
            comparison: null,
            chosen,
            rejected,
            elapsedTime: null,
            type: 'infer'
          });
        }
      }
    }
  }
  //console.log(`Transitive Closure size: ${allPreferences.length}`);
  return allPreferences;
}


/**
 * Compute the transitive reduction of the comparison graph
 * @param {Array} history - Decision history array to work with
 * @param {boolean} isTransitiveClosure - Whether the input is a transitive closure
 * @returns {Array} - Minimal set of comparisons that preserve the same ordering
 */
export function computeTransitiveReduction(history, isTransitiveClosure = false) {
  if (!history?.length) {
    return history || [];
  }

  const transitiveClosure = isTransitiveClosure ? history : computeTransitiveClosure(history);

  const directGraph = new Map();
  const transitiveClosureGraph = new Map();
  const allNodes = new Set();

  for (const {chosen, rejected} of history) {
    allNodes.add(chosen);
    allNodes.add(rejected);

    if (!directGraph.has(chosen)) {
      directGraph.set(chosen, new Set());
    }
    directGraph.get(chosen).add(rejected);
  }
  console.log(`Num Nodes (Songs) in History:  ${allNodes.size}`);
  console.log(`Transitive Closure size ${isTransitiveClosure ? '(Precomputed)' : ''}: ${transitiveClosure.length}`)

  // Build transitive closure graph
  for (const {chosen, rejected} of transitiveClosure) {
    if (!transitiveClosureGraph.has(chosen)) {
      transitiveClosureGraph.set(chosen, new Set());
    }
    transitiveClosureGraph.get(chosen).add(rejected);
  }

  const nodes = Array.from(allNodes);
  for (const node of nodes) {
    if (!directGraph.has(node)) {
      directGraph.set(node, new Set());
    }
    if (!transitiveClosureGraph.has(node)) {
      transitiveClosureGraph.set(node, new Set());
    }
  }

  // Create reduction graph by removing redundant edges
  const reductionGraph = new Map();
  for (const node of nodes) {
    reductionGraph.set(node, new Set(directGraph.get(node)));
  }

  // Remove edges that can be inferred transitively
  for (const i of nodes) {

    const transitiveSet = transitiveClosureGraph.get(i);
    const reductionSet = reductionGraph.get(i);
    const directEdges = Array.from(reductionSet);

    for (const j of directEdges) {
      // Check if there's an indirect path i -> k -> j
      let hasIndirectPath = false;

      for (const k of nodes) {
        if (k !== i && k !== j &&
          transitiveSet.has(k) &&
          transitiveClosureGraph.get(k).has(j)) {
          hasIndirectPath = true;
          break;
        }
      }

      if (hasIndirectPath) {
        reductionSet.delete(j);
      }
    }
  }

  const reducedPreferences = [];
  const reductionNodes = new Set();
  for (const [chosen, rejectedSet] of reductionGraph.entries()) {
    reductionNodes.add(chosen);
    reductionNodes.add(rejectedSet);
    for (const rejected of rejectedSet) {
      // Find original comparison (could be optimized with a Map if needed frequently)
      const originalComparison = history.find(pref =>
        pref.chosen === chosen && pref.rejected === rejected
      );
      if (originalComparison) {
        reducedPreferences.push(originalComparison);
      }
    }
  }
  console.log(`Transitive Reduction size: ${reducedPreferences.length}`);
  return reducedPreferences;
}

/**
 * Topologically sort the preferences returned by the transitive reduction
 * @param {Array} preferences - List of preferences
 * @returns {Array} - Topologically sorted list of preferences
 */
export function topologicalSortPreferences(preferences) {
  if (!preferences?.length) return preferences || [];

  const graph = new Map();
  const inDegree = new Map();
  const allNodes = new Set();

  // Single pass initialization
  for (const {chosen, rejected} of preferences) {
    allNodes.add(chosen);
    allNodes.add(rejected);

    if (!graph.has(chosen)) {
      graph.set(chosen, new Set());
    }
    graph.get(chosen).add(rejected);

    // Initialize in-degrees
    if (!inDegree.has(chosen)) inDegree.set(chosen, 0);
    if (!inDegree.has(rejected)) inDegree.set(rejected, 0);
  }

  // Calculate in-degrees
  for (const edges of graph.values()) {
    for (const target of edges) {
      inDegree.set(target, inDegree.get(target) + 1);
    }
  }

  // Collect zero in-degree nodes
  const queue = Array.from(allNodes).filter(node => inDegree.get(node) === 0);
  const sortedItems = [];

  while (queue.length > 0) {
    const node = queue.shift();
    sortedItems.push(node);

    const edges = graph.get(node);
    if (edges) {
      for (const neighbor of edges) {
        const newDegree = inDegree.get(neighbor) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }
  }

  if (sortedItems.length !== allNodes.size) {
    console.warn("Warning: Preference graph contains cycles!");
  }

  // Create position lookup for efficient sorting
  const positionMap = new Map();
  sortedItems.forEach((item, index) => positionMap.set(item, index));

  // Sort preferences using position map
  const sortedPreferences = [...preferences];
  sortedPreferences.sort((a, b) => {
    const posA_chosen = positionMap.get(a.chosen);
    const posB_chosen = positionMap.get(b.chosen);

    if (posA_chosen !== posB_chosen) {
      return posA_chosen - posB_chosen;
    }

    return positionMap.get(a.rejected) - positionMap.get(b.rejected);
  });

  return sortedPreferences;
}

export const GraphUtils = {
  computeTransitiveClosure,
  computeTransitiveReduction,
  topologicalSortPreferences,
};

export default GraphUtils;