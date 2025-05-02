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
    
    // Start the sorting
    startSorting();
}

function showResult() {
    // Create the final ranking list
    let resultHTML = `<h2>Your <i>${currentSongList.name}</i> Ranking:</h2><ol>` +
      finalSorted.map(song => `<li>${song}</li>`).join('') +
      "</ol>";
    
    // Update the result div with the ranking content
    document.getElementById("result").innerHTML = resultHTML;
      
    // Create the decision history section
    let decisionHistoryHTML = "<h2>Your Decision History:</h2>";
    decisionHistoryHTML += "<div class='decision-table'>";
    decisionHistoryHTML += "<table>" +
      "<thead><tr>" +
      "<th>#</th>" +
      "<th>Chosen</th>" +
      "<th>Rejected</th>" +
      "</tr></thead><tbody>";
      
    decisionHistory.forEach(decision => {
      decisionHistoryHTML += `<tr>
        <td>${decision.comparison}</td>
        <td class="chosen">${decision.chosen}</td>
        <td class="rejected">${decision.rejected}</td>
      </tr>`;
    });
    
    decisionHistoryHTML += "</tbody></table></div>";
 
    // Update the decision history div
    document.getElementById("decisionHistory").innerHTML = decisionHistoryHTML;   
    
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
}

// Initialize when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", initializeApp);