let currentSongList = null;

function initializeApp() {
    // Set default song list
    currentSongList = songListRepo.getList("bloodless");
    
    // Apply theme and song count through function calls
    currentSongList.applyTheme();
    currentSongList.applySongCount();
  
    // Hide the sorting and results interface initially, show only the selection UI
    document.getElementById("selectionInterface").style.display = "block"; 
    document.getElementById("sortingInterface").style.display = "none"; 
    document.getElementById("resultsInterface").style.display = "none";
    //document.getElementById("restartButton").style.display = "none";
  
    // Populate the list selector dropdown
    populateListSelector();
    
    // Set up event listeners
    setupEventListeners();
}

function populateListSelector() {
    const selector = document.getElementById("listSelector");
    const lists = songListRepo.getAllLists();
    
    lists.forEach(list => {
      const option = document.createElement("option");
      option.value = list.id;
      option.textContent = list.name;
      selector.appendChild(option);
    });
}

function setupEventListeners() {
    // Set up event listener for list selection change
    document.getElementById("listSelector").addEventListener("change", function() {
      currentSongList = songListRepo.getList(this.value);
      currentSongList.applyTheme();
      currentSongList.applySongCount();
    });
    
    // Set up the start button
    document.getElementById("startButton").addEventListener("click", startSortingProcess);
    
    // Set up buttons for comparison
    document.getElementById("btnA").addEventListener("click", handleOptionA);
    document.getElementById("btnB").addEventListener("click", handleOptionB);
    
    // Add event listener to restart button
    document.getElementById("restartButton").addEventListener("click", resetInterface);
}

function startSortingProcess() {
    // Hide the selection interface and show sorting interface
    document.getElementById("selectionInterface").style.display = "none";
    document.getElementById("sortingInterface").style.display = "block";
    document.getElementById("resultsInterface").style.display = "none";
    //document.getElementById("restartButton").style.display = "none";
    
    // Start the sorting
    startSorting();
}

function showResult() {
    // Set the list name in the results title
    document.getElementById("listName").textContent = currentSongList.name;
    
    // Clear previous results
    const resultList = document.getElementById("resultList");
    resultList.innerHTML = '';
    
    // Add each song to the result list
    finalSorted.forEach(song => {
      const li = document.createElement("li");
      li.textContent = song;
      resultList.appendChild(li);
    });
    
    // Clear previous decision history
    const decisionHistoryBody = document.getElementById("decisionHistoryBody");
    decisionHistoryBody.innerHTML = '';
    
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
      
      decisionHistoryBody.appendChild(row);
    });
    
    // Show results and restart button
    document.getElementById("selectionInterface").style.display = "none";
    document.getElementById("sortingInterface").style.display = "none";
    document.getElementById("resultsInterface").style.display = "block";
    //document.getElementById("restartButton").style.display = "block";
}

// Reset the interface to selection mode
function resetInterface() {
  // Show selection interface, hide others
  document.getElementById("selectionInterface").style.display = "block";
  document.getElementById("sortingInterface").style.display = "none";
  document.getElementById("resultsInterface").style.display = "none";   
  //document.getElementById("restartButton").style.display = "none";
}

// Initialize when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", initializeApp);