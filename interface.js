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
  importDecisionsButton: document.getElementById("importDecisionsButton"),

  resultsInterface: document.getElementById("resultsInterface"),
  resultList: document.getElementById("resultList"),
  decisionHistoryBody: document.getElementById("decisionHistoryBody"),
  listName: document.getElementById("listName"),
  copyButton: document.getElementById("copyButton"),
  copyHistoryButton: document.getElementById("copyHistoryButton"),
  copyStatus: document.getElementById("copyStatus"),
  restartButton: document.getElementById("restartButton"),

  importModal: document.getElementById("importModal"),
  importTextarea: document.getElementById("importTextarea"),
  closeModal: document.getElementById("closeModal"),
  cancelImport: document.getElementById("cancelImport"),
  confirmImport: document.getElementById("confirmImport")
};

// State management
const state = {
  currentSongList: null, shouldShuffle: true, shouldMergeInsert: true, cleanPrefs: false, themeCache: {} // Cache for theme CSS calculations
};

// Initialize the application
function initializeApp() {
  state.currentSongList = songListRepo.getList("bloodless");

  applyTheme();
  applySongCount();

  showInterface("selection");

  populateListSelector();

  setupEventListeners();

  // Initialize tooltips
  setupTooltips();

  if (window.ClipboardManager) {
    ClipboardManager.initialize();
  } else {
    console.error("ClipboardManager not loaded");
  }
}

// Apply theme to the document
function applyTheme() {
  const themeId = state.currentSongList.id;

  // Only calculate and apply theme if it changed
  if (state.currentThemeId !== themeId) {
    state.currentThemeId = themeId;

    if (!state.themeCache[themeId]) {
      const {
        backgroundColor, textColor, buttonColor, buttonHoverColor, buttonTextColor
      } = state.currentSongList._theme;

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

function applySongCount() {
  DOM.songCount.textContent = `${state.currentSongList.songCount} songs`;
}

function populateListSelector() {
  const lists = songListRepo.getAllLists();

  const fragment = document.createDocumentFragment();

  lists.forEach(list => {
    const option = document.createElement("option");
    option.value = list.id;
    option.textContent = list.name;
    fragment.appendChild(option);
  });

  DOM.listSelector.appendChild(fragment);
}

// Setup tooltips to ensure they don't overflow viewport
function setupTooltips() {
  const tooltips = document.querySelectorAll('.tooltip');

  tooltips.forEach(tooltip => {
    const tooltipText = tooltip.querySelector('.tooltip-text');
    if (!tooltipText) return;

    // Pre-position tooltips on load to prevent scrollbar flicker
    positionTooltip(tooltip, tooltipText);

    // Also position on hover to handle dynamic layout changes
    tooltip.addEventListener('mouseenter', () => {
      positionTooltip(tooltip, tooltipText);
    });

    // And reposition on window resize
    window.addEventListener('resize', () => {
      if (tooltip.matches(':hover')) {
        positionTooltip(tooltip, tooltipText);
      }
    });
  });
}

function repositionAllTooltips() {
  const tooltips = document.querySelectorAll('.tooltip');

  tooltips.forEach(tooltip => {
    const tooltipText = tooltip.querySelector('.tooltip-text');
    if (tooltipText) {
      positionTooltip(tooltip, tooltipText);
    }
  });
}

// Position a tooltip based on its position in the viewport
function positionTooltip(tooltip, tooltipText) {
  // Reset any previously set position classes
  tooltipText.classList.remove('position-left', 'position-right');

  // Calculate tooltip position relative to viewport
  const tooltipRect = tooltip.getBoundingClientRect();
  const viewportWidth = window.innerWidth;

  // Calculate which third of the screen the tooltip is in
  const positionRatio = tooltipRect.left / viewportWidth;

  if (positionRatio > 0.7) {
    // Tooltip is in the right third of the screen
    tooltipText.classList.add('position-right');
  } else if (positionRatio < 0.3) {
    // Tooltip is in the left third of the screen
    tooltipText.classList.add('position-left');
  }
  // If tooltip is in the middle third, use the default centered position
}

function setupEventListeners() {
  DOM.selectionInterface.addEventListener('click', (e) => {
    if (e.target.id === 'startButton') {
      startSortingProcess();
    }
  });

  DOM.selectionInterface.addEventListener('change', (e) => {
    const target = e.target;

    switch (target.id) {
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

    switch (target.id) {
      case 'btnA':
        handleOption(true);
        DOM.btnA.blur();
        break;
      case 'btnB':
        handleOption(false);
        DOM.btnB.blur();
        break;
      case 'copyDecisionsButton':
        ClipboardManager.copyToClipboard('decisions', state.currentSongList);
        break;
      case 'importDecisionsButton':
        ClipboardManager.openImportModal();
        break;
    }
  });

  DOM.sortingInterface.addEventListener('change', (e) => {
    const target = e.target;

    switch (target.id) {
      case 'cleanPrefsToggle':
        state.cleanPrefs = target.checked;
        break;
      case 'shuffleToggle':
        state.shouldShuffle = target.checked;
        break;
      case 'mergeTypeToggle':
        state.shouldMergeInsert = target.checked;
        break;
    }
  });

  DOM.resultsInterface.addEventListener('click', (e) => {
    const target = e.target;

    switch (target.id) {
      case 'copyButton':
        ClipboardManager.copyToClipboard('ranking', state.currentSongList);
        break;
      case 'copyHistoryButton':
        ClipboardManager.copyToClipboard('history', state.currentSongList);
        break;
      case 'restartButton':
        resetInterface();
        break;
    }
  });
}

function showInterface(type) {
  DOM.selectionInterface.hidden = type !== "selection";
  DOM.sortingInterface.hidden = type !== "sorting";
  DOM.resultsInterface.hidden = type !== "results";

  requestAnimationFrame(repositionAllTooltips);
}

function startSortingProcess() {
  showInterface("sorting");

  console.log(`Starting sorting with ${state.shouldMergeInsert ? 'merge-insertion' : 'merge'} algorithm`);
  startSorting(state.currentSongList.songs, state.shouldShuffle, state.shouldMergeInsert);
}

function showResult(finalSorted) {
  DOM.listName.textContent = state.currentSongList.name;

  DOM.resultList.innerHTML = '';
  DOM.decisionHistoryBody.innerHTML = '';

  const resultsFragment = document.createDocumentFragment();
  const historyFragment = document.createDocumentFragment();

  finalSorted.forEach((song) => {
    const li = document.createElement("li");
    li.textContent = song;
    resultsFragment.appendChild(li);
  });

  decisionHistory.forEach((decision) => {
    if (decision.type !== 'infer') {
      const row = createHistoryRow(decision);
      historyFragment.appendChild(row);
    }
  });

  DOM.resultList.appendChild(resultsFragment);
  DOM.decisionHistoryBody.appendChild(historyFragment);

  showInterface("results");
}

function createHistoryRow(decision) {
  const row = document.createElement("tr");

  const comparisonCell = document.createElement("td");
  comparisonCell.textContent = decision.comparison;

  const chosenCell = document.createElement("td");
  chosenCell.textContent = decision.chosen;
  chosenCell.className = "chosen";

  const rejectedCell = document.createElement("td");
  rejectedCell.textContent = decision.rejected;
  rejectedCell.className = "rejected";

  row.append(comparisonCell, chosenCell, rejectedCell);

  return row;
}

function resetInterface() {
  showInterface("selection");
}

document.addEventListener("DOMContentLoaded", initializeApp);

window.getDecisionHistory = function () {
  return decisionHistory || [];
};