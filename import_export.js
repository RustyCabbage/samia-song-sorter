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
        // Filter and map in a single pass for better performance
        const decisionsText = [];
        for (let i = 0, idx = 1; i < decisionHistory.length; i++) {
          const decision = decisionHistory[i];
          if (decision.type !== 'infer') {
            decisionsText.push(`${idx++}. ${decision.chosen} > ${decision.rejected}`);
          }
        }
        textToCopy = `My Partial ${listName} Decision History:\n\n${decisionsText.join('\n')}`;
        successMessage = "Decisions copied to clipboard!";
        break;

      case 'history':
        // Pre-allocate array size for better memory efficiency
        const rows = DOM.decisionHistoryBody.querySelectorAll('tr');
        const historyText = new Array(rows.length);
        for (let i = 0; i < rows.length; i++) {
          const cells = rows[i].querySelectorAll('td');
          historyText[i] = `${cells[0].textContent}. ${cells[1].textContent} > ${cells[2].textContent}`;
        }
        textToCopy = `My ${listName} Decision History:\n\n${historyText.join('\n')}`;
        successMessage = "History copied to clipboard!";
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
      showNotification(
        `Imported ${parsedDecisions.length} decisions: ${addedCount} added, ${skippedCount} skipped, ${conflictCount} conflicts, ${outOfScopeCount} out of scope`,
        true, 5000
      );
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
            chosen,
            rejected,
            type: 'import'
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
      // Check if songs are in current list
      if (!currentSongList.songs.includes(decision.chosen) ||
        !currentSongList.songs.includes(decision.rejected)) {
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

    // Return stats object directly
    return {
      addedCount,
      skippedCount,
      conflictCount,
      outOfScopeCount
    };
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
    copyToClipboard,
    openImportModal
  };
})();

// Export the module
window.ClipboardManager = ClipboardManager;