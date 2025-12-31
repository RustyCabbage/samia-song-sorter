// ES6 Module: interface.js
import {songListRepo} from './SongListFactory.js';
import {songSorterFactory} from './sorter/SongSorterFactory.js';
import notificationManager from './NotificationManager.js';
import {faviconManager} from './FaviconManager.js';

// Cache DOM elements with error handling
const DOM = (() => {
  const elements = {
    appTitle: "appTitle",
    artistSelector: "artistSelector",
    // Selection interface
    selectionInterface: "selectionInterface",
    listSelector: "listSelector",
    songCount: "songCount",
    startButton: "startButton",
    shuffleToggle: "shuffleToggle",
    mergeTypeToggle: "mergeTypeToggle",

    // Sorting interface
    sortingInterface: "sortingInterface",
    progress: "progress",
    comparison: "comparison",
    btnA: "btnA",
    btnB: "btnB",
    copyDecisionsButton: "copyDecisionsButton",
    importDecisionsButton: "importDecisionsButton",
    cleanPrefsToggle: "cleanPrefsToggle",

    // Results interface
    resultsInterface: "resultsInterface",
    resultList: "resultList",
    decisionHistoryBody: "decisionHistoryBody",
    copyButton: "copyButton",
    copyHistoryButton: "copyHistoryButton",
    copyStatus: "copyStatus",
    resultsCleanPrefsToggle: "resultsCleanPrefsToggle",
    restartButton: "restartButton",

    // Import modal
    importModal: "importModal",
    importTextarea: "importTextarea",
    closeModal: "closeModal",
    cancelImport: "cancelImport",
    confirmImport: "confirmImport"
  };

  const dom = {};
  for (const [key, id] of Object.entries(elements)) {
    dom[key] = document.getElementById(id);
  }

  // Add tooltips separately
  dom.tooltips = document.querySelectorAll('.tooltip');
  return dom;
})();

const state = (() => {
  const stateData = {
    currentSongList: null,
    currentArtist: null,
    shouldShuffle: false,
    shouldMergeInsert: false,
    useCleanPrefs: false,
    themeCache: {},
    currentThemeId: null,
    resizeTimer: null
  };

  const uiUpdaters = {
    useCleanPrefs: (value) => {
      DOM.cleanPrefsToggle.checked = value;
      DOM.resultsCleanPrefsToggle.checked = value;
    },
    currentSongList: () => {
      applySongCount();
      applyTheme();
    },
    currentArtist: (artist) => {
      if (artist) {
        populateSongListSelectorByArtist(artist);
      }
    }
  };

  return new Proxy(stateData, {
    set(target, prop, value) {
      if (target[prop] !== value) {
        target[prop] = value;
        uiUpdaters[prop]?.(value);
      }
      return true;
    }
  });
})();

// Theme management with caching
function applyTheme() {
  let songListId = state.currentSongList?.id;
  if (state.currentThemeId === songListId) return;
  if (!songListId) songListId = "bloodless";

  state.currentThemeId = songListId;

  if (!state.themeCache[songListId]) {
    const {backgroundColor, textColor, buttonColor, buttonHoverColor, buttonTextColor} = state.currentSongList._theme;
    state.themeCache[songListId] = {
      '--background-color': backgroundColor,
      '--text-color': textColor,
      '--button-color': buttonColor,
      '--button-hover-color': buttonHoverColor,
      '--button-text-color': buttonTextColor
    };
  }

  const root = document.documentElement.style;
  for (const [prop, val] of Object.entries(state.themeCache[songListId])) {
    root.setProperty(prop, val);
  }
  faviconManager.setFavicon(state.themeCache[songListId]['--background-color'], state.themeCache[songListId]['--button-color']);
}

function applySongCount() {
  if (state.currentSongList) {
    DOM.songCount.textContent = `${state.currentSongList.songCount} songs`;
  } else {
    DOM.songCount.textContent = '';
  }
}

function updateListName(name) {
  document.querySelectorAll('.list-name').forEach(el => {
    el.textContent = name;
  });
}

function updateTitles(interfaceType) {
  const defaultTitle = "Yet Another Song Sorter";

  if (interfaceType === "selection") {
    // Reset to default titles for selection interface
    document.title = defaultTitle;
    DOM.appTitle.textContent = defaultTitle;
  } else if ((interfaceType === "sorting" || interfaceType === "results") && state.currentArtist) {
    // Update titles with artist name for sorting and results interfaces
    const artistTitle = `${state.currentArtist} Song Sorter`;
    document.title = artistTitle;
    DOM.appTitle.textContent = artistTitle;
    updateListName(state.currentSongList.name);
  }
}

function populateArtistListSelector() {
  const fragment = document.createDocumentFragment();
  for (const artist of songListRepo.getAllArtists()) {
    const option = document.createElement("option");
    option.value = artist;
    option.textContent = artist;
    fragment.appendChild(option);
  }
  DOM.artistSelector.appendChild(fragment);
}

function populateSongListSelectorByArtist(artist) {
  // Clear existing options completely
  DOM.listSelector.innerHTML = '';

  const fragment = document.createDocumentFragment();

  // Add artist-specific lists
  for (const list of songListRepo.getListsByArtist(artist)) {
    const option = document.createElement("option");
    option.value = list.id;
    option.textContent = list.name;
    fragment.appendChild(option);
  }

  DOM.listSelector.appendChild(fragment);

  // Clear current song list when artist changes
  state.currentSongList = null;
}

function populateSongListSelector() {
  const fragment = document.createDocumentFragment();
  for (const list of songListRepo.getAllLists()) {
    const option = document.createElement("option");
    option.value = list.id;
    option.textContent = list.name;
    fragment.appendChild(option);
  }
  DOM.listSelector.appendChild(fragment);
}

// Optimized tooltip positioning
const tooltipManager = (() => {
  const VIEWPORT_MARGIN = 50;
  const LEFT_THRESHOLD = 0.3;
  const RIGHT_THRESHOLD = 0.7;

  function positionTooltip(tooltip, tooltipText) {
    tooltipText.classList.remove('position-left', 'position-right');

    const rect = tooltip.getBoundingClientRect();
    const leftPercent = rect.left / (window.innerWidth - VIEWPORT_MARGIN);

    if (leftPercent > RIGHT_THRESHOLD) {
      tooltipText.classList.add('position-right');
    } else if (leftPercent < LEFT_THRESHOLD) {
      tooltipText.classList.add('position-left');
    }
  }

  function positionAllTooltips() {
    for (const tooltip of DOM.tooltips) {
      const tooltipText = tooltip.querySelector('.tooltip-text');
      if (tooltipText) positionTooltip(tooltip, tooltipText);
    }
  }

  function handleResize() {
    clearTimeout(state.resizeTimer);
    state.resizeTimer = setTimeout(() => {
      const activeTooltip = document.querySelector('.tooltip:hover .tooltip-text');
      if (activeTooltip) {
        positionTooltip(activeTooltip.parentElement, activeTooltip);
      }
    }, 100);
  }

  return {positionAllTooltips, handleResize};
})();

// Event handlers map for delegation
const eventHandlers = {
  click: {
    startButton: startSortingProcess,
    btnA: () => {
      songSorterFactory.handleOption(true);
      DOM.btnA.blur();
    },
    btnB: () => {
      songSorterFactory.handleOption(false);
      DOM.btnB.blur();
    },
    restartButton: resetInterface
  },
  change: {
    artistSelector: (e) => {
      const selectedArtist = e.target.value;
      state.currentArtist = selectedArtist;
      state.currentSongList = songListRepo.getList(songListRepo.getListsByArtist(selectedArtist)[0].id);
    },
    listSelector: (e) => {
      const selectedListId = e.target.value;
      if (selectedListId) {
        state.currentSongList = songListRepo.getList(selectedListId);
      } else {
        state.currentSongList = null;
      }
    },
    shuffleToggle: (e) => state.shouldShuffle = e.target.checked,
    mergeTypeToggle: (e) => state.shouldMergeInsert = e.target.checked,
    cleanPrefsToggle: (e) => state.useCleanPrefs = e.target.checked,
    resultsCleanPrefsToggle: (e) => state.useCleanPrefs = e.target.checked
  }
};

// Event setup
function setupEventListeners() {
  // Event delegation
  document.addEventListener('click', e => eventHandlers.click[e.target.id]?.(e));
  document.addEventListener('change', e => eventHandlers.change[e.target.id]?.(e));

  // Tooltip handling for hover-capable devices
  if (window.matchMedia("(hover: hover)").matches) {
    document.addEventListener('mouseenter', tooltipManager.positionAllTooltips, true);
  }

  // Prevent tooltip clicks from bubbling
  for (const tooltip of DOM.tooltips) {
    tooltip.addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
    });
  }

  window.addEventListener('resize', tooltipManager.handleResize);
}

// Interface management
const interfaces = {
  selection: 'selectionInterface', sorting: 'sortingInterface', results: 'resultsInterface'
};

function showInterface(type) {
  for (const [name, elementKey] of Object.entries(interfaces)) {
    DOM[elementKey].hidden = name !== type;
  }

  // Update titles based on interface type
  updateTitles(type);

  requestAnimationFrame(tooltipManager.positionAllTooltips);
}

function startSortingProcess() {
  if (!state.currentSongList) {
    alert('Please select an artist and song list first.');
    return;
  }

  showInterface("sorting");
  console.log(`Starting sorting with ${state.shouldMergeInsert ? 'merge-insertion' : 'merge'} algorithm`);
  songSorterFactory.startSorting(state.currentSongList.songs, state.shouldShuffle, state.shouldMergeInsert)
    .then(showResult);
}

function showResult(finalSorted) {
  // Create fragments for batch DOM updates
  const resultsFragment = document.createDocumentFragment();
  const historyFragment = document.createDocumentFragment();

  // Populate results
  for (const song of finalSorted) {
    const li = document.createElement("li");
    li.textContent = song;
    resultsFragment.appendChild(li);
  }

  // Populate history (filter once, iterate once)
  const decisions = songSorterFactory.getDecisionHistory().filter(d => d.type !== 'infer');
  for (const decision of decisions) {
    const row = document.createElement("tr");
    const cells = [
      { text: decision.comparison, className: "number" },
      { text: decision.chosen, className: "chosen" },
      { text: decision.rejected, className: "rejected" }
    ];

    for (const {text, className} of cells) {
      const td = document.createElement("td");
      td.textContent = text;
      td.className = className;
      row.appendChild(td);
    }
    historyFragment.appendChild(row);
  }

  DOM.resultList.replaceChildren(resultsFragment);
  DOM.decisionHistoryBody.replaceChildren(historyFragment);

  showInterface("results");
}

function resetInterface() {
  showInterface("selection");
  faviconManager.reset();
}

// Initialize application
function initializeApp() {
  state.shouldShuffle = DOM.shuffleToggle.checked;
  state.shouldMergeInsert = DOM.mergeTypeToggle.checked;
  state.useCleanPrefs = DOM.cleanPrefsToggle.checked;

  showInterface("selection");
  populateArtistListSelector();

  // Set default to first artist
  const firstArtist = songListRepo.getAllArtists()[0];
  if (firstArtist) {
    DOM.artistSelector.value = firstArtist;
    state.currentArtist = firstArtist;
    // Set default song list to first available for the artist
    const firstList = songListRepo.getListsByArtist(firstArtist)[0];
    if (firstList) {
      DOM.listSelector.value = firstList.id;
      state.currentSongList = songListRepo.getList(firstList.id);
    }
  }

  setupEventListeners();
  requestAnimationFrame(tooltipManager.positionAllTooltips);

  // Initialize ImportExportManager after interface is set up
  import('./ImportExportManager.js').then(({importExportManager}) => {
    importExportManager.initialize();
  });
  notificationManager.initialize(DOM.copyStatus);
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initializeApp);

// Export the main interface functions that might be needed by other modules
export {
  DOM, state, initializeApp, showInterface, resetInterface
};