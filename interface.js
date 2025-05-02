let currentSongList = null;

function initializeApp() {
    // Set default song list
    currentSongList = songListRepo.getList("bloodless");
    currentSongList.applyTheme();
    currentSongList.applySongCount();
  
    // Hide the sorting UI initially, show only the selection UI
    document.getElementById("selectionInterface").style.display = "block"; 
    document.getElementById("sortingInterface").style.display = "none"; 
  
    // Populate the list selector dropdown
    const selector = document.getElementById("listSelector");
    const lists = songListRepo.getAllLists();
    
    lists.forEach(list => {
      const option = document.createElement("option");
      option.value = list.id;
      option.textContent = list.name;
      selector.appendChild(option);
    });

    // Set up event listener for list selection change
    document.getElementById("listSelector").addEventListener("change", function() {
      currentSongList = songListRepo.getList(this.value);
      currentSongList.applyTheme();
      currentSongList.applySongCount();
    });
    
    // Set up the start button
    document.getElementById("startButton").addEventListener("click", function() {    
      // Hide the selection interface and show sorting interface
      document.getElementById("selectionInterface").style.display = "none";
      document.getElementById("sortingInterface").style.display = "block";
      
      // Start the sorting
      startSorting();
    });
    
    // Set up buttons for comparison
    document.getElementById("btnA").addEventListener("click", handleOptionA);
    document.getElementById("btnB").addEventListener("click", handleOptionB);
  }

  // Reset the interface to selection mode
function resetInterface() {
    // Hide result and show selection interface
    document.getElementById("result").innerHTML = '';
    document.getElementById("sortingInterface").style.display = "none";
    document.getElementById("selectionInterface").style.display = "block";
    
    // Show buttons again if they were hidden
    document.getElementById("choices").style.display = "flex";
    
    // Reset progress displays if they exist
    if (document.getElementById("progress")) {
      document.getElementById("progress").style.display = "block";
      document.getElementById("progress").textContent = '';
    }
    if (document.getElementById("comparison")) {
      document.getElementById("comparison").style.display = "block";
      document.getElementById("comparison").textContent = '';
    }
}

function showResult() {
    const resultDiv = document.getElementById("result");
    
    // Create the final ranking list
    let resultHTML = `<h2>Your <i>${currentSongList.name}</i> Ranking:</h2><ol>` +
      finalSorted.map(song => `<li>${song}</li>`).join('') +
      "</ol>";
      
    // Create the decision history section
    resultHTML += "<h2>Your Decision History:</h2>";
    resultHTML += "<div class='decision-table'>";
    resultHTML += "<table>" +
      "<thead><tr>" +
      "<th>#</th>" +
      "<th>Chosen</th>" +
      "<th>Rejected</th>" +
      "</tr></thead><tbody>";
      
    decisionHistory.forEach(decision => {
      resultHTML += `<tr>
        <td>${decision.comparison}</td>
        <td class="chosen">${decision.chosen}</td>
        <td class="rejected">${decision.rejected}</td>
      </tr>`;
    });
    
    resultHTML += "</tbody></table></div>";
    
    // Add a restart button
    resultHTML += '<div class="restart-container"><button id="restartButton" class="restart-button">Rank Another List</button></div>';
    
    // Update the result div with all content
    resultDiv.innerHTML = resultHTML;
    
    // Hide comparison elements
    document.getElementById("sortingInterface").style.display = "none";
    document.getElementById("choices").style.display = "none";
    if (document.getElementById("progress")) {
      document.getElementById("progress").style.display = "none";
    }
    if (document.getElementById("comparison")) {
      document.getElementById("comparison").style.display = "none";
    }
    
    // Add event listener to restart button
    document.getElementById("restartButton").addEventListener("click", resetInterface);
  }
  
  // Initialize when the DOM is fully loaded
  document.addEventListener("DOMContentLoaded", initializeApp);