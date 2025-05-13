// Cache DOM elements for better performance
const DOM = {
  selectionInterface: document.getElementById("selectionInterface"),
  listSelector: document.getElementById("listSelector"),
  songCount: document.getElementById("songCount"),
  startButton: document.getElementById("startButton"),
  shuffleToggle: document.getElementById("shuffleToggle"),
  mergeTypeToggle: document.getElementById("mergeTypeToggle"),

  sortingInterface: document.getElementById("sortingInterface"),
  progress: document.getElementById("progress"),
  comparison: document.getElementById("comparison"),
  btnA: document.getElementById("btnA"),
  btnB: document.getElementById("btnB"),
  copyDecisionsButton: document.getElementById("copyDecisionsButton"),

  resultsInterface: document.getElementById("resultsInterface"),
  resultList: document.getElementById("resultList"),
  decisionHistoryBody: document.getElementById("decisionHistoryBody"),
  listName: document.getElementById("listName"),
  copyButton: document.getElementById("copyButton"),
  copyHistoryButton: document.getElementById("copyHistoryButton"),
  copyStatus: document.getElementById("copyStatus"),
  restartButton: document.getElementById("restartButton")
};

// State management
const state = {
  currentSongList: null,
  shouldShuffle: true,
  shouldMergeInsert: true,
  notificationTimeout: null,
  themeCache: {} // Cache for theme CSS calculations
};

// Initialize the application
function initializeApp() {
  // Set default song list
  state.currentSongList = songListRepo.getList("bloodless");
  
  // Apply theme and song count
  applyTheme();
  applySongCount();

  // Hide the sorting and results interface initially, show only the selection UI
  showInterface("selection");

  // Populate the list selector dropdown
  populateListSelector();
  
  // Set up event listeners
  setupEventListeners();
}

// Apply theme to the document
function applyTheme() {
  const themeId = state.currentSongList.id;
  
  // Only calculate and apply theme if it changed
  if (state.currentThemeId !== themeId) {
    state.currentThemeId = themeId;
    
    if (!state.themeCache[themeId]) {
      const { backgroundColor, textColor, buttonColor, buttonHoverColor, buttonTextColor } = state.currentSongList._theme;
      
      state.themeCache[themeId] = {
        '--background-color': backgroundColor,
        '--text-color': textColor,
        '--button-color': buttonColor,
        '--button-hover-color': buttonHoverColor,
        '--button-text-color': buttonTextColor
      };
    }
    
    // Apply cached theme settings
    const root = document.documentElement.style;
    const theme = state.themeCache[themeId];
    
    for (const [property, value] of Object.entries(theme)) {
      root.setProperty(property, value);
    }
  }
}

// Update song count display
function applySongCount() {
  DOM.songCount.textContent = `${state.currentSongList.songCount} songs`;
}

// Populate the list selector dropdown
function populateListSelector() {
  const lists = songListRepo.getAllLists();
  
  // Use document fragment for better performance
  const fragment = document.createDocumentFragment();
  
  lists.forEach(list => {
    const option = document.createElement("option");
    option.value = list.id;
    option.textContent = list.name;
    fragment.appendChild(option);
  });
  
  DOM.listSelector.appendChild(fragment);
}

// Set up all event listeners
function setupEventListeners() {
  DOM.selectionInterface.addEventListener('click', (e) => {
    // Handle button click
    if (e.target.id === 'startButton') {
      startSortingProcess();
    }
  });

  // Handle changes to form controls in the selection interface
  DOM.selectionInterface.addEventListener('change', (e) => {
    const target = e.target;
    
    switch(target.id) {
      case 'listSelector':
        state.currentSongList = songListRepo.getList(target.value);
        applyTheme();
        applySongCount();
        break;
      case 'shuffleToggle':
        state.shouldShuffle = target.checked;
        break;
      case 'mergeTypeToggle':
        state.shouldMergeInsert = target.checked;
        break;
    }
  });
    
  DOM.sortingInterface.addEventListener('click', (e) => {
    const target = e.target;
    
    switch(target.id) {
      case 'btnA':
        handleOption(true);
        DOM.btnA.blur();
        break;
      case 'btnB':
        handleOption(false);
        DOM.btnB.blur();
        break;
      case 'copyDecisionsButton':
        copyToClipboard('decisions');
        break;
    }
  });
  
  // Refactored results interface event handler with switch statement
  DOM.resultsInterface.addEventListener('click', (e) => {
    const target = e.target;
    
    switch(target.id) {
      case 'copyButton':
        copyToClipboard('ranking');
        break;
      case 'copyHistoryButton':
        copyToClipboard('history');
        break;
      case 'restartButton':
        resetInterface(state);
        break;
    }
  });
}

// Helper function to show the appropriate interface
function showInterface(type) {
  DOM.selectionInterface.hidden = type !== "selection";
  DOM.sortingInterface.hidden = type !== "sorting";
  DOM.resultsInterface.hidden = type !== "results";
}

// Start the sorting process
function startSortingProcess() {
  showInterface("sorting");
  
  // Start the sorting using the unified function
  console.log(`Starting sorting with ${state.shouldMergeInsert ? 'merge-insertion' : 'merge'} algorithm`);
  startSorting(state.currentSongList.songs, state.shouldShuffle, state.shouldMergeInsert);
}

// Render and display results
function showResult(finalSorted) {
  // Set the list name in the results title
  DOM.listName.textContent = state.currentSongList.name;
  
  // Clear previous results
  DOM.resultList.innerHTML = '';
  DOM.decisionHistoryBody.innerHTML = '';
  
  // Create fragments for better performance
  const resultsFragment = document.createDocumentFragment();
  const historyFragment = document.createDocumentFragment();
  
  // Add each song to the result list
  finalSorted.forEach((song, index) => {
    const li = document.createElement("li");
    li.textContent = song;
    resultsFragment.appendChild(li);
  });
  
  // Add each decision to the history table
  decisionHistory.forEach((decision, index) => {
    const row = createHistoryRow(decision, index + 1);
    historyFragment.appendChild(row);
  });
  
  // Append fragments to DOM
  DOM.resultList.appendChild(resultsFragment);
  DOM.decisionHistoryBody.appendChild(historyFragment);
  
  // Show results interface
  showInterface("results");
}

// Create a history row element
function createHistoryRow(decision, index) {
  const row = document.createElement("tr");
  
  const comparisonCell = document.createElement("td");
  comparisonCell.textContent = index;
  
  const chosenCell = document.createElement("td");
  chosenCell.textContent = decision.chosen;
  chosenCell.className = "chosen";
  
  const rejectedCell = document.createElement("td");
  rejectedCell.textContent = decision.rejected;
  rejectedCell.className = "rejected";
  
  row.append(comparisonCell, chosenCell, rejectedCell);
  
  return row;
}

// Universal copy function
function copyToClipboard(type) {
  const listName = state.currentSongList.name;
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
      return `${cells[0].textContent}. "${cells[1].textContent}" > "${cells[2].textContent}"`;
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
function showNotification(message, isSuccess = true) {
  // Clear any existing timeout
  if (state.notificationTimeout) {
    clearTimeout(state.notificationTimeout);
  }
  
  // Set text and styling
  DOM.copyStatus.textContent = message;
  DOM.copyStatus.classList.remove('success', 'error');
  DOM.copyStatus.classList.add(isSuccess ? 'success' : 'error');
  
  // Show the banner
  DOM.copyStatus.classList.add('visible');
  
  // Hide after delay
  state.notificationTimeout = setTimeout(() => {
    DOM.copyStatus.classList.remove('visible');
  }, 3000);
}

// Reset the interface to selection mode
function resetInterface(state) {
  showInterface("selection");
}

// Initialize when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", initializeApp);