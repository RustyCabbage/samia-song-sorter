// Cache DOM elements for better performance
const DOM = {
  selectionInterface: document.getElementById("selectionInterface"),
  sortingInterface: document.getElementById("sortingInterface"),
  resultsInterface: document.getElementById("resultsInterface"),
  listSelector: document.getElementById("listSelector"),
  songCount: document.getElementById("songCount"),
  startButton: document.getElementById("startButton"),
  btnA: document.getElementById("btnA"),
  btnB: document.getElementById("btnB"),
  progress: document.getElementById("progress"),
  comparison: document.getElementById("comparison"),
  resultList: document.getElementById("resultList"),
  decisionHistoryBody: document.getElementById("decisionHistoryBody"),
  listName: document.getElementById("listName"),
  restartButton: document.getElementById("restartButton")
};

let currentSongList = null;

function initializeApp() {
    // Set default song list
    currentSongList = songListRepo.getList("bloodless");
    
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
    DOM.btnA.addEventListener("click", handleOptionA);
    DOM.btnB.addEventListener("click", handleOptionB);
    
    // Add event listener to restart button
    DOM.restartButton.addEventListener("click", resetInterface);
}

// Helper function to show the appropriate interface
function showInterface(type) {
  DOM.selectionInterface.style.display = type === "selection" ? "block" : "none";
  DOM.sortingInterface.style.display = type === "sorting" ? "block" : "none";
  DOM.resultsInterface.style.display = type === "results" ? "block" : "none";
}

function startSortingProcess() {
    showInterface("sorting");
    
    // Start the sorting
    startSorting();
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

// Reset the interface to selection mode
function resetInterface() {
  showInterface("selection");
}

// Initialize when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", initializeApp);