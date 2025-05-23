// Cache DOM elements with error handling
const DOM = (() => {
  const elements = {
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
    listName: "listName",
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
  const themeId = state.currentSongList?.id;
  if (!themeId || state.currentThemeId === themeId) return;

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

  const root = document.documentElement.style;
  for (const [prop, val] of Object.entries(state.themeCache[themeId])) {
    root.setProperty(prop, val);
  }
}

function applySongCount() {
  if (state.currentSongList) {
    DOM.songCount.textContent = `${state.currentSongList.songCount} songs`;
  }
}

function populateListSelector() {
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

  return { positionAllTooltips, handleResize };
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
    copyDecisionsButton: () => ClipboardManager.copyToClipboard('decisions', state.currentSongList),
    importDecisionsButton: () => ClipboardManager.openImportModal(),
    copyButton: () => ClipboardManager.copyToClipboard('ranking', state.currentSongList),
    copyHistoryButton: () => ClipboardManager.copyToClipboard('history', state.currentSongList),
    restartButton: resetInterface
  },
  change: {
    listSelector: (e) => state.currentSongList = songListRepo.getList(e.target.value),
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
  selection: 'selectionInterface',
  sorting: 'sortingInterface',
  results: 'resultsInterface'
};

function showInterface(type) {
  for (const [name, elementKey] of Object.entries(interfaces)) {
    DOM[elementKey].hidden = name !== type;
  }
  requestAnimationFrame(tooltipManager.positionAllTooltips);
}

function startSortingProcess() {
  showInterface("sorting");
  console.log(`Starting sorting with ${state.shouldMergeInsert ? 'merge-insertion' : 'merge'} algorithm`);
  songSorterFactory.startSorting(state.currentSongList.songs, state.shouldShuffle, state.shouldMergeInsert)
    .then(showResult);
}

function showResult(finalSorted) {
  DOM.listName.textContent = state.currentSongList.name;

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
  const decisions = getDecisionHistory().filter(d => d.type !== 'infer');
  for (const decision of decisions) {
    const row = document.createElement("tr");
    const cells = [
      { text: decision.comparison, className: "" },
      { text: decision.chosen, className: "chosen" },
      { text: decision.rejected, className: "rejected" }
    ];

    for (const { text, className } of cells) {
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
}

// Initialize application
function initializeApp() {
  state.currentSongList = songListRepo.getList("bloodless");
  state.shouldShuffle = DOM.shuffleToggle.checked;
  state.shouldMergeInsert = DOM.mergeTypeToggle.checked;
  state.useCleanPrefs = DOM.cleanPrefsToggle.checked;

  showInterface("selection");
  populateListSelector();
  setupEventListeners();
  requestAnimationFrame(tooltipManager.positionAllTooltips);

  if (window.ClipboardManager) {
    ClipboardManager.initialize();
  } else {
    console.error("ClipboardManager not loaded");
  }
}

document.addEventListener("DOMContentLoaded", initializeApp);
window.getDecisionHistory = () => decisionHistory || [];