// Clipboard and Import functionality module

// State for managing clipboard operations
const ClipboardState = {
  notificationTimeout: null
};

// DOM elements used by clipboard functions - we'll get these from interface.js
// let DOM = {};

// Initialize the clipboard module
function initializeClipboard(domElements) {
  // Store DOM references
  // DOM = domElements;
  
  // Set up clipboard-related event listeners
  setupClipboardEventListeners();
}

// Set up event listeners specifically for clipboard functionality
function setupClipboardEventListeners() {
  // Modal event listeners
  DOM.closeModal.addEventListener('click', closeImportModal);
  DOM.cancelImport.addEventListener('click', closeImportModal);
  DOM.confirmImport.addEventListener('click', processImportedDecisions);
  
  // Close modal when clicking outside it
  window.addEventListener('click', (e) => {
    if (e.target === DOM.importModal) {
      closeImportModal();
    }
  });
  
  // Add keyboard event listeners for modal
  DOM.importModal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeImportModal();
    } else if (e.key === 'Enter' && e.ctrlKey) {
      processImportedDecisions();
      closeImportModal();
    }
  });
}

// Universal copy function
function copyToClipboard(type, currentSongList) {
  const listName = currentSongList.name;
  let textToCopy;
  let successMessage;
  
  if (type === 'ranking') {
    // Format ranking
    const rankedSongs = Array.from(DOM.resultList.children).map((li, index) => 
      `${index + 1}. ${li.textContent}`
    );
    textToCopy = `My ${listName} Song Ranking:\n\n${rankedSongs.join('\n')}`;
    successMessage = "Ranking copied to clipboard!";
  } else if (type === 'decisions') {
    const decisionsText = decisionHistory.map((decision, index) => 
      `${index + 1}. ${decision.chosen} > ${decision.rejected}`
    );
    textToCopy = `My Partial ${listName} Decision History:\n\n${decisionsText.join('\n')}`;
    successMessage = "Decisions copied to clipboard!"
  } else if (type === 'history') {
    // Format history
    const historyRows = Array.from(DOM.decisionHistoryBody.querySelectorAll('tr'));
    const historyText = historyRows.map(row => {
      const cells = row.querySelectorAll('td');
      return `${cells[0].textContent}. ${cells[1].textContent} > ${cells[2].textContent}`;
    });
    textToCopy = `My ${listName} Decision History:\n\n${historyText.join('\n')}`;
    successMessage = "History copied to clipboard!";
  }
  
  // Use the Clipboard API
  navigator.clipboard.writeText(textToCopy)
    .then(() => showNotification(successMessage, true))
    .catch(err => {
      showNotification("Copy failed. Please try again.", false);
      console.error('Failed to copy text:', err);
    });
}

// Show a notification banner
function showNotification(message, isSuccess = true, timeoutDuration=3000) {
  // Clear any existing timeout
  if (ClipboardState.notificationTimeout) {
    clearTimeout(ClipboardState.notificationTimeout);
  }
  
  // Set text and styling
  DOM.copyStatus.textContent = message;
  DOM.copyStatus.classList.remove('success', 'error');
  DOM.copyStatus.classList.add(isSuccess ? 'success' : 'error');
  
  // Show the banner
  DOM.copyStatus.classList.add('visible');
  
  // Hide after delay
  ClipboardState.notificationTimeout = setTimeout(() => {
    DOM.copyStatus.classList.remove('visible');
  }, timeoutDuration);
}

// Process imported decisions
function processImportedDecisions() {
  const text = DOM.importTextarea.value.trim();
  
  if (!text) {
    showNotification("No decisions to import", false);
    return;
  }
  
  try {
    // Parse the imported decisions
    const parsedDecisions = parseImportedDecisions(text);
    
    if (parsedDecisions.length === 0) {
      showNotification("No valid decisions found", false);
      return;
    }
    
    // Infer decisions
    
    // Add the decisions to the decision history
    const decisionLog = importDecisions(parsedDecisions);
    
    // Close the modal
    closeImportModal();
    
    // Show success message
    showNotification(`Successfully imported ${parsedDecisions.length} decisions: ${decisionLog.addedCount} added, ${decisionLog.skippedCount} skipped, ${decisionLog.conflictCount} conflicts, ${decisionLog.outOfScopeCount} out of scope`, true, 5000);
  } catch (error) {
    showNotification("Error parsing decisions: " + error.message, false);
  }
}

// Parse imported decisions from text
function parseImportedDecisions(text) {
  const decisions = [];
  const lines = text.split('\n');
  
  // Get only the lines with decision data (format: "X. Song A > Song B")
  // "X." indicates a previously imported decision
  const decisionLines = lines.filter(line => line.match(/^(X|\d)+\.\s+.+\s+>\s+.+$/));
  
  for (const line of decisionLines) {
    // Extract the song names using regex
    const match = line.match(/^(?:X|\d)+\.\s+(?:"([^"]+)"|([^>]+))\s+>\s+(?:"([^"]+)"|(.+))$/);
    
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

// Import decisions into the decision history
function importDecisions(decisions) {
  // Get the current decision history from the sorter
  const currentHistory = getDecisionHistory();
  
  // Check for duplicates or conflicts
  const existingDecisions = new Map();
  currentHistory.forEach(decision => {
    const key = `${decision.chosen}-${decision.rejected}`;
    existingDecisions.set(key, true);
    
    // Also check for conflicts (reversed decisions)
    const reverseKey = `${decision.rejected}-${decision.chosen}`;
    existingDecisions.set(reverseKey, false);
  });
  
  let addedCount = 0;
  let skippedCount = 0;
  let conflictCount = 0;
  let outOfScopeCount = 0;
  
  // Process each imported decision
  for (const decision of decisions) {
    if (!state.currentSongList.songs.includes(decision.chosen) || !state.currentSongList.songs.includes(decision.rejected)) {
      outOfScopeCount++;
      continue;
    }
    
    const key = `${decision.chosen}-${decision.rejected}`;
    const reverseKey = `${decision.rejected}-${decision.chosen}`;
    
    // Skip if we already have this exact decision
    if (existingDecisions.get(key) === true) {
      skippedCount++;
      continue;
    }
    
    // Skip if we have a conflicting decision
    if (existingDecisions.get(reverseKey) === true) {
      conflictCount++;
      continue;
    }
    
    // Add the decision to the history using the SongSorter API
    SongSorter.addImportedDecision(decision);
    
    // Mark as added for future checks
    existingDecisions.set(key, true);
    existingDecisions.set(reverseKey, false);
    addedCount++;
  }
  
  // Update the progress display if there are current comparisons in progress
  if (typeof updateProgressDisplay === 'function') {
    updateProgressDisplay();
  }
  
  // Log stats to console
  console.log(`Import summary: ${addedCount} added, ${skippedCount} skipped, ${conflictCount} conflicts, ${outOfScopeCount} out of scope`);
  return decisionLog = {
    addedCount: addedCount,
    skippedCount: skippedCount,
    conflictCount: conflictCount,
    outOfScopeCount: outOfScopeCount
  }
}

// Open import modal
function openImportModal() {
  DOM.importModal.hidden = false; // Simply remove hidden attribute
  DOM.importTextarea.value = '';
  setTimeout(() => DOM.importTextarea.focus(), 100);
}

// Close import modal
function closeImportModal() {
  DOM.importModal.hidden = true; // Simply add hidden attribute
  DOM.importTextarea.value = '';
}

// Expose functions to be used by other modules
const ClipboardManager = {
  initialize: initializeClipboard,
  copyToClipboard,
  openImportModal,
  showNotification
};

// Export the module
window.ClipboardManager = ClipboardManager;