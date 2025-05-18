// Clipboard and Import functionality module

// Use a closure to prevent leaking variables to global scope
const ClipboardManager = (function () {
  let notificationTimeout = null;

  // Set up event listeners specifically for clipboard functionality
  function setupEventListeners() {
    // Modal event listeners - using event delegation where possible
    DOM.closeModal.addEventListener('click', closeImportModal);
    DOM.cancelImport.addEventListener('click', closeImportModal);
    DOM.confirmImport.addEventListener('click', processImportedDecisions);

    // Close modal when clicking outside it
    DOM.importModal.addEventListener('click', (e) => {
      if (e.target === DOM.importModal) {
        closeImportModal();
      }
    });

    DOM.importModal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeImportModal();
      } else if (e.key === 'Enter' && e.ctrlKey) {
        processImportedDecisions();
      }
    });
  }

  function copyToClipboard(type, currentSongList) {
    const listName = currentSongList.name;
    let textToCopy;
    let successMessage;

    switch (type) {
      case 'ranking':
        // Use direct DOM iteration without Array.from for better performance
        const rankedSongs = [];
        const children = DOM.resultList.children;
        for (let i = 0; i < children.length; i++) {
          rankedSongs.push(`${i + 1}. ${children[i].textContent}`);
        }
        textToCopy = `My ${listName} Song Ranking:\n\n${rankedSongs.join('\n')}`;
        successMessage = "Ranking copied to clipboard!";
        break;

      case 'decisions':
      case 'history':
        // Determine if we're using the full history or only user decisions
        const isPartial = type === 'decisions';
        const headerText = isPartial ? `Partial ${listName} Decision History` : `${listName} Decision History`;

        // it's not always helpful to get a clean decision history since transitive relationships may affect out-of-scope decisions if comparing across lists.
        //const hist = isPartial ? cleanDecisionHistory(getDecisionHistory()) : getDecisionHistory();
        const hist = getDecisionHistory();

        // Build the decision text based on the decisionHistory array
        const decisionsText = hist
          .filter(d => d.type !== 'infer')
          .map((d, i) => `${i + 1}. ${d.chosen} > ${d.rejected}`);

        textToCopy = `My ${headerText}:\n\n${decisionsText.join('\n')}`;
        successMessage = `${isPartial ? "Preferences" : "History"} copied to clipboard!`;
        break;
    }

    navigator.clipboard.writeText(textToCopy)
      .then(() => showNotification(successMessage, true))
      .catch(err => {
        console.error('Failed to copy text:', err);
        showNotification("Copy failed. Please try again.", false);
      });
  }

  // Show a notification banner with optimized DOM manipulation
  function showNotification(message, isSuccess = true, timeoutDuration = 3000) {
    // Clear any existing timeout
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
      notificationTimeout = null;
    }

    // Batch DOM operations for better performance
    DOM.copyStatus.textContent = message;

    // Use classList.toggle for better performance
    DOM.copyStatus.classList.toggle('success', isSuccess);
    DOM.copyStatus.classList.toggle('error', !isSuccess);

    // Use requestAnimationFrame for smooth animations
    requestAnimationFrame(() => {
      DOM.copyStatus.classList.add('visible');

      // Hide after delay
      notificationTimeout = setTimeout(() => {
        DOM.copyStatus.classList.remove('visible');
      }, timeoutDuration);
    });
  }

  function processImportedDecisions() {
    const text = DOM.importTextarea.value.trim();

    if (!text) {
      showNotification("No decisions to import", false);
      closeImportModal();
      return;
    }

    try {
      const parsedDecisions = parseImportedDecisions(text);

      if (!parsedDecisions.length) {
        showNotification("No valid decisions found", false);
        return;
      }

      // Add the decisions to the decision history
      const {addedCount, skippedCount, conflictCount, outOfScopeCount} = importDecisions(parsedDecisions);

      // Check if the current comparison can now be decided automatically
      if (typeof SongSorter.checkCurrentComparison === 'function') {
        SongSorter.checkCurrentComparison();
      }

      // Show success message
      showNotification(`Imported ${parsedDecisions.length} decisions: ${addedCount} added, ${skippedCount} skipped, ${conflictCount} conflicts, ${outOfScopeCount} out of scope`, true, 5000);
    } catch (error) {
      showNotification("Error parsing decisions: " + error.message, false);
    }

    // Close the modal
    closeImportModal();
  }

  // Parse imported decisions from text with regex optimization
  function parseImportedDecisions(text) {
    // Pre-compile the regex for better performance
    const lineRegex = /^(X|\d)+\.\s+.+\s+>\s+.+$/;
    const extractRegex = /^(?:X|\d)+\.\s+(?:"([^"]+)"|([^>]+))\s+>\s+(?:"([^"]+)"|(.+))$/;

    const lines = text.split('\n');
    const decisions = [];

    // Pre-allocate maximum possible size for better memory usage
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip early if not matching the basic pattern
      if (!lineRegex.test(line)) continue;

      // Extract the song names using regex
      const match = line.match(extractRegex);

      if (match) {
        // If the song names are in quotes, use those, otherwise use the unquoted versions
        const chosen = match[1] || match[2].trim();
        const rejected = match[3] || match[4].trim();

        if (chosen && rejected) {
          decisions.push({
            comparison: 'X', chosen, rejected, type: 'import'
          });
        }
      }
    }
    return decisions;
  }

  // Import decisions with optimized data structure usage
  function importDecisions(decisions) {
    // Get the current state and decision history
    const currentHistory = getDecisionHistory();
    const currentSongList = state.currentSongList;

    // Use Sets for faster lookups
    const existingDecisions = new Set();
    const conflictingDecisions = new Set();

    /* Cleaning decisions is not necessarily desirable
    const cleanDecisions = cleanDecisionHistory(decisions);
    let inferCount = decisions.length - cleanDecisions.length;
    console.log(`Cleaned ${inferCount} inferences`);
     */

    currentHistory.forEach(decision => {
      const key = `${decision.chosen}|${decision.rejected}`;
      existingDecisions.add(key);

      // Also track potential conflicts (reversed decisions)
      const reverseKey = `${decision.rejected}|${decision.chosen}`;
      conflictingDecisions.add(reverseKey);
    });

    let addedCount = 0;
    let skippedCount = 0;
    let conflictCount = 0;
    let outOfScopeCount = 0;

    // Process each imported decision
    for (const decision of decisions) {
      // Check if songs are in the current list
      if (!currentSongList.songs.includes(decision.chosen) || !currentSongList.songs.includes(decision.rejected)) {
        outOfScopeCount++;
        continue;
      }

      const key = `${decision.chosen}|${decision.rejected}`;

      // Skip if we already have this exact decision
      if (existingDecisions.has(key)) {
        skippedCount++;
        continue;
      }

      // Skip if we have a conflicting decision
      if (conflictingDecisions.has(key)) {
        conflictCount++;
        continue;
      }

      // Add the decision to the history using the SongSorter API
      SongSorter.addImportedDecision(decision);

      // Mark as added for future checks
      existingDecisions.add(key);
      conflictingDecisions.add(`${decision.rejected}|${decision.chosen}`);
      addedCount++;
    }

    // Return the stat object directly
    return {
      addedCount, skippedCount, conflictCount, outOfScopeCount
    };
  }

  /**
   * Clean the decision history by removing redundant decisions
   * A decision is redundant if it can be inferred from other decisions
   * through transitivity (A > B and B > C implies A > C)
   * <<<Unused for now because it's not necessarily desirable behavior and also it's a bit slow>>>
   * @param {Array} originalHistory - The original decision history to clean
   * @returns {Array} - Cleaned decision history with only essential decisions
   */
  function cleanDecisionHistory(originalHistory = getDecisionHistory()) {
    // Create a deep copy of the history to avoid modifying the original
    let history = JSON.parse(JSON.stringify(originalHistory));
    let loop = true;

    while (loop) {
      loop = false;
      // Create a new array to hold the essential decisions
      const forwardHistory = [];

      // First pass: Forward iteration (keep earlier decisions, remove later redundant ones)
      for (let i = 0; i < history.length; i++) {
        const decision = history[i];

        // Skip decisions that are already marked as inferred
        if (decision.type === 'infer') {
          continue;
        }

        // Create a temporary history of all decisions up to but not including this one
        const tempHistory = [...forwardHistory];

        // Check if this decision can be inferred from previous decisions
        const knownPref = getKnownPreference(decision.chosen, decision.rejected, tempHistory);

        // If we can't infer this decision from previous ones, it's essential
        if (knownPref.selectedLeft === null) {
          forwardHistory.push(decision);
        }
      }

      // Second pass: Backward iteration (check if earlier decisions are made redundant by later ones)
      const backwardHistory = [];

      // Process the cleaned history in reverse order
      for (let i = forwardHistory.length - 1; i >= 0; i--) {
        const decision = forwardHistory[i];

        // Create a history excluding this decision but including all later ones
        const laterDecisions = [...backwardHistory];

        // Check if this decision can be inferred from later essential decisions
        const knownPref = getKnownPreference(decision.chosen, decision.rejected, laterDecisions);

        // If we can't infer this decision from later ones, it's truly essential
        if (knownPref.selectedLeft === null) {
          // Add it to the beginning of the array to maintain original order
          backwardHistory.unshift(decision);
        }
      }

      if (backwardHistory.length !== history.length) {
        loop = true;
        history = shuffleArray(backwardHistory);
      }
    }

    // Sort the final history to match the original comparison order, except imports which are alphabetical
    history.sort((a, b) => {
      const isAX = a.comparison === "X";
      const isBX = b.comparison === "X";

      if (isAX && isBX) {
        // If both are "X", sort by chosen, then rejected
        if (a.chosen !== b.chosen) {
          return a.chosen.localeCompare(b.chosen);
        }
        return a.rejected.localeCompare(b.rejected);
      }

      if (isAX) return 1; // "X" should come after numbers
      if (isBX) return -1;

      // Otherwise sort numerically by comparison
      return a.comparison - b.comparison;
    });

    return history;
  }

  // Modal management functions
  function openImportModal() {
    DOM.importModal.hidden = false;

    // Use requestAnimationFrame for better timing of focus
    requestAnimationFrame(() => {
      DOM.importTextarea.value = '';
      DOM.importTextarea.focus();
    });
  }

  function closeImportModal() {
    DOM.importModal.hidden = true;
    DOM.importTextarea.value = '';
  }

  // Public API
  return {
    initialize: setupEventListeners, // Directly expose setupEventListeners as initialize
    copyToClipboard, openImportModal
  };
})();

// Export the module
window.ClipboardManager = ClipboardManager;
