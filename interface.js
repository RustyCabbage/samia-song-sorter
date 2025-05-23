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
  cleanPrefsToggle: document.getElementById("cleanPrefsToggle"),

  resultsInterface: document.getElementById("resultsInterface"),
  resultList: document.getElementById("resultList"),
  decisionHistoryBody: document.getElementById("decisionHistoryBody"),
  listName: document.getElementById("listName"),
  copyButton: document.getElementById("copyButton"),
  copyHistoryButton: document.getElementById("copyHistoryButton"),
  copyStatus: document.getElementById("copyStatus"),
  resultsCleanPrefsToggle: document.getElementById("resultsCleanPrefsToggle"),
  restartButton: document.getElementById("restartButton"),

  importModal: document.getElementById("importModal"),
  importTextarea: document.getElementById("importTextarea"),
  closeModal: document.getElementById("closeModal"),
  cancelImport: document.getElementById("cancelImport"),
  confirmImport: document.getElementById("confirmImport"),

  // Get all tooltips at once
  tooltips: document.querySelectorAll('.tooltip')
};

// State management with proxy for automatic UI sync
const createState = () => {
  const stateData = {
    currentSongList: null,
    shouldShuffle: false,
    shouldMergeInsert: false,
    cleanPrefs: false,
    themeCache: {},
    currentThemeId: null
  };

  return new Proxy(stateData, {
    set(target, prop, value) {
      const oldValue = target[prop];
      target[prop] = value;

      // Handle UI updates based on state changes
      if (oldValue !== value) {
        if (prop === 'cleanPrefs') {
          DOM.cleanPrefsToggle.checked = value;
          DOM.resultsCleanPrefsToggle.checked = value;
        } else if (prop === 'currentSongList') {
          applySongCount();
          applyTheme();
        }
      }

      return true;
    }
  });
};

const state = createState();

// Initialize the application
function initializeApp() {
  state.currentSongList = songListRepo.getList("bloodless");
  state.shouldShuffle = DOM.shuffleToggle.checked;
  state.shouldMergeInsert = DOM.mergeTypeToggle.checked;
  state.cleanPrefs = DOM.cleanPrefsToggle.checked;

  showInterface("selection");
  populateListSelector();
  setupEventListeners();
  requestAnimationFrame(() => positionAllTooltips());

  if (window.ClipboardManager) {
    ClipboardManager.initialize();
  } else {
    console.error("ClipboardManager not loaded");
  }
}

function applyTheme() {
  const themeId = state.currentSongList.id;
  if (state.currentThemeId === themeId) return;

  state.currentThemeId = themeId;

  if (!state.themeCache[themeId]) {
    const {backgroundColor, textColor, buttonColor, buttonHoverColor, buttonTextColor} = state.currentSongList._theme;

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
  Object.entries(state.themeCache[themeId]).forEach(([prop, val]) => root.setProperty(prop, val));
}

function applySongCount() {
  if (!state.currentSongList) return;
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


function handleWindowResize() {
  // Throttle resize operations
  if (state.resizeTimer) clearTimeout(state.resizeTimer);
  state.resizeTimer = setTimeout(() => {
    const visibleTooltip = document.querySelector('.tooltip:hover');
    if (visibleTooltip) {
      const tooltipText = visibleTooltip.querySelector('.tooltip-text');
      if (tooltipText) positionTooltip(visibleTooltip, tooltipText);
    }
  }, 100);
}

// Position all tooltips
function positionAllTooltips() {
  DOM.tooltips.forEach(tooltip => {
    const tooltipText = tooltip.querySelector('.tooltip-text');
    if (tooltipText) positionTooltip(tooltip, tooltipText);
  });
}

// Simplified tooltip positioning logic
function positionTooltip(tooltip, tooltipText) {
  tooltipText.classList.remove('position-left', 'position-right');

  const rect = tooltip.getBoundingClientRect();
  const viewportWidth = window.innerWidth - 50;

  // Simpler logic: just check if tooltip is in left or right third of screen
  if (rect.left > viewportWidth * 0.7) {
    tooltipText.classList.add('position-right');
  } else if (rect.left < viewportWidth * 0.3) {
    tooltipText.classList.add('position-left');
  }
}

// Consolidated event handlers with event delegation
function setupEventListeners() {
  if (window.matchMedia("(hover: hover)").matches) {
    document.addEventListener('mouseenter', positionAllTooltips, true);
  }
  // tooltip event listeners
  DOM.tooltips.forEach(tooltip => {
    tooltip.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
    })
  });
  window.addEventListener('resize', handleWindowResize);
  // Event delegation for all interfaces
  document.addEventListener('click', handleClickEvents);
  document.addEventListener('change', handleChangeEvents);
}

function handleClickEvents(e) {
  const target = e.target;
  const id = target.id;

  // Selection interface events
  if (DOM.selectionInterface.contains(target)) {
    if (id === 'startButton') {
      startSortingProcess();
    }
  }

  // Sorting interface events
  else if (DOM.sortingInterface.contains(target)) {
    if (id === 'btnA') {
      songSorterFactory.handleOption(true);
      DOM.btnA.blur();
    } else if (id === 'btnB') {
      songSorterFactory.handleOption(false);
      DOM.btnB.blur();
    } else if (id === 'copyDecisionsButton') {
      ClipboardManager.copyToClipboard('decisions', state.currentSongList);
    } else if (id === 'importDecisionsButton') {
      ClipboardManager.openImportModal();
    }
  }

  // Results interface events
  else if (DOM.resultsInterface.contains(target)) {
    if (id === 'copyButton') {
      ClipboardManager.copyToClipboard('ranking', state.currentSongList);
    } else if (id === 'copyHistoryButton') {
      ClipboardManager.copyToClipboard('history', state.currentSongList);
    } else if (id === 'restartButton') {
      resetInterface();
    }
  }
}

function handleChangeEvents(e) {
  const target = e.target;
  const id = target.id;

  // Selection interface changes
  if (DOM.selectionInterface.contains(target)) {
    if (id === 'listSelector') {
      state.currentSongList = songListRepo.getList(target.value);
    } else if (id === 'shuffleToggle') {
      state.shouldShuffle = target.checked;
    } else if (id === 'mergeTypeToggle') {
      state.shouldMergeInsert = target.checked;
    }
  }

  // Sorting interface changes
  else if (DOM.sortingInterface.contains(target)) {
    if (id === 'cleanPrefsToggle') {
      state.cleanPrefs = target.checked;
    }
  }

  // Results interface changes
  else if (DOM.resultsInterface.contains(target)) {
    if (id === 'resultsCleanPrefsToggle') {
      state.cleanPrefs = target.checked;
    }
  }
}

function showInterface(type) {
  DOM.selectionInterface.hidden = type !== "selection";
  DOM.sortingInterface.hidden = type !== "sorting";
  DOM.resultsInterface.hidden = type !== "results";

  requestAnimationFrame(positionAllTooltips);
}

function startSortingProcess() {
  showInterface("sorting");
  console.log(`Starting sorting with ${state.shouldMergeInsert ? 'merge-insertion' : 'merge'} algorithm`);
  songSorterFactory.startSorting(state.currentSongList.songs, state.shouldShuffle, state.shouldMergeInsert);
}

function showResult(finalSorted) {
  DOM.listName.textContent = state.currentSongList.name;

  // Clear previous content
  DOM.resultList.innerHTML = '';
  DOM.decisionHistoryBody.innerHTML = '';

  // Create fragments for better performance
  const resultsFragment = document.createDocumentFragment();
  const historyFragment = document.createDocumentFragment();

  finalSorted.forEach(song => {
    const li = document.createElement("li");
    li.textContent = song;
    resultsFragment.appendChild(li);
  });

  decisionHistory.forEach(decision => {
    if (decision.type !== 'infer') {
      const row = createHistoryRow(decision);
      historyFragment.appendChild(row);
    }
  });

  // Append fragments in single operations
  DOM.resultList.appendChild(resultsFragment);
  DOM.decisionHistoryBody.appendChild(historyFragment);

  showInterface("results");
}

function createHistoryRow(decision) {
  const row = document.createElement("tr");

  // Create cells
  const cells = [
    {text: decision.comparison, class: ""},
    {text: decision.chosen, class: "chosen"},
    {text: decision.rejected, class: "rejected"}
  ];

  // Build and append cells in one loop
  cells.forEach(cell => {
    const td = document.createElement("td");
    td.textContent = cell.text;
    if (cell.class) td.className = cell.class;
    row.appendChild(td);
  });

  return row;
}

function resetInterface() {
  showInterface("selection");
}

document.addEventListener("DOMContentLoaded", initializeApp);

window.getDecisionHistory = function () {
  return decisionHistory || [];
};