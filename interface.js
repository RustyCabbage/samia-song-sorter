// Cache DOM elements for better performance
const DOM = {
  selectionInterface: document.getElementById("selectionInterface"),
  listSelector: document.getElementById("listSelector"),
  songCount: document.getElementById("songCount"),
  startButton: document.getElementById("startButton"),
  shuffleToggle: document.getElementById("shuffleToggle"),
  shuffleLabel: document.getElementById("shuffleLabel"),

  sortingInterface: document.getElementById("sortingInterface"),
  progress: document.getElementById("progress"),
  comparison: document.getElementById("comparison"),
  btnA: document.getElementById("btnA"),
  btnB: document.getElementById("btnB"),

  resultsInterface: document.getElementById("resultsInterface"),
  resultList: document.getElementById("resultList"),
  decisionHistoryBody: document.getElementById("decisionHistoryBody"),
  listName: document.getElementById("listName"),
  copyButton: document.getElementById("copyButton"),
  copyStatus: document.getElementById("copyStatus"),
  restartButton: document.getElementById("restartButton")
};

let currentSongList = null;
let shouldShuffle = true; // Variable to track shuffle state
let notificationTimeout = null; // Variable to store timeout reference

function initializeApp() {
    // Set default song list
    currentSongList = songListRepo.getList("bloodless");
    DOM.shuffleToggle.checked = true;
    
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

function applyTheme() {
  // Use object destructuring for cleaner code
  const { backgroundColor, textColor, buttonColor, buttonHoverColor, buttonTextColor } = currentSongList._theme;
  
  const root = document.documentElement.style;
  root.setProperty('--background-color', backgroundColor);
  root.setProperty('--text-color', textColor);
  root.setProperty('--button-color', buttonColor);
  root.setProperty('--button-hover-color', buttonHoverColor);
  root.setProperty('--button-text-color', buttonTextColor);  
}

function applySongCount() {
  DOM.songCount.textContent = `${currentSongList.songCount} songs`;
}

function populateListSelector() {
    const selector = DOM.listSelector;
    const lists = songListRepo.getAllLists();
    
    // Use document fragment for better performance
    const fragment = document.createDocumentFragment();
    
    lists.forEach(list => {
      const option = document.createElement("option");
      option.value = list.id;
      option.textContent = list.name;
      fragment.appendChild(option);
    });
    
    selector.appendChild(fragment);
}

function setupEventListeners() {
    // Set up event listener for list selection change
    DOM.listSelector.addEventListener("change", function() {
      currentSongList = songListRepo.getList(this.value);
      applyTheme();
      applySongCount();
    });
    
    // Set up the start button
    DOM.startButton.addEventListener("click", startSortingProcess);
    
    // Set up buttons for comparison
    DOM.btnA.addEventListener("click", () => handleOption(true));
    DOM.btnB.addEventListener("click", () => handleOption(false));
    
    // Add event listener to restart button
    DOM.restartButton.addEventListener("click", resetInterface);
    
    // Set up shuffle toggle event listener
    DOM.shuffleToggle.addEventListener("change", function() {
      shouldShuffle = this.checked;
    });
    
    // Set up copy button
    DOM.copyButton.addEventListener("click", copyResultsToClipboard);
}

// Helper function to show the appropriate interface
function showInterface(type) {
  DOM.selectionInterface.style.display = type === "selection" ? "block" : "none";
  DOM.sortingInterface.style.display = type === "sorting" ? "block" : "none";
  DOM.resultsInterface.style.display = type === "results" ? "block" : "none";
}

function startSortingProcess() {
    showInterface("sorting");
    
    // Start the sorting, passing the shuffle flag
    startSorting(shouldShuffle);
}

function showResult() {
    // Set the list name in the results title
    DOM.listName.textContent = currentSongList.name;
    
    // Clear previous results and use document fragment
    DOM.resultList.innerHTML = '';
    
    const fragment = document.createDocumentFragment();
    
    // Add each song to the result list
    finalSorted.forEach(song => {
      const li = document.createElement("li");
      li.textContent = song;
      fragment.appendChild(li);
    });
    
    DOM.resultList.appendChild(fragment);
    
    // Clear previous decision history
    DOM.decisionHistoryBody.innerHTML = '';
    
    // Use a document fragment for history items
    const historyFragment = document.createDocumentFragment();
    
    // Add each decision to the history table
    decisionHistory.forEach(decision => {
      const row = document.createElement("tr");
      
      const comparisonCell = document.createElement("td");
      comparisonCell.textContent = decision.comparison;
      
      const chosenCell = document.createElement("td");
      chosenCell.textContent = decision.chosen;
      chosenCell.className = "chosen";
      
      const rejectedCell = document.createElement("td");
      rejectedCell.textContent = decision.rejected;
      rejectedCell.className = "rejected";
      
      row.appendChild(comparisonCell);
      row.appendChild(chosenCell);
      row.appendChild(rejectedCell);
      
      historyFragment.appendChild(row);
    });
    
    DOM.decisionHistoryBody.appendChild(historyFragment);
    
    // Show results interface
    showInterface("results");
}

function copyResultsToClipboard() {
  // Get the list name and all ranked songs
  const listName = currentSongList.name;
  const rankedSongs = Array.from(DOM.resultList.children).map((li, index) => 
    `${index + 1}. ${li.textContent}`
  );
  
  // Create the text content to copy
  const textToCopy = `My ${listName} Song Ranking:\n\n${rankedSongs.join('\n')}`;
  
  // Use the Clipboard API to copy the text
  navigator.clipboard.writeText(textToCopy)
    .then(() => {
      // Show success notification
      showNotification("Copied to clipboard!", true);
    })
    .catch(err => {
      // Show error notification
      showNotification("Copy failed. Please try again.", false);
      console.error('Failed to copy text: ', err);
    });
}

// Show a notification banner
function showNotification(message, isSuccess = true) {
  // Clear any existing timeout
  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
  }
  
  // Set text and styling
  DOM.copyStatus.textContent = message;
  DOM.copyStatus.classList.remove('success', 'error');
  DOM.copyStatus.classList.add(isSuccess ? 'success' : 'error');
  
  // Show the banner
  DOM.copyStatus.classList.add('visible');
  
  // Hide after delay
  notificationTimeout = setTimeout(() => {
    DOM.copyStatus.classList.remove('visible');
  }, 3000);
}

// Reset the interface to selection mode
function resetInterface() {
  showInterface("selection");
  // Reset shuffle toggle to default checked state
  DOM.shuffleToggle.checked = true;
  shouldShuffle = true;
}

// Initialize when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", initializeApp);