// Clipboard and Import functionality module
const ClipboardManager = (() => {
  let notificationTimeout = null;

  const LINE_REGEX = /^(?:X|\d)+\.\s+.+\s+>\s+.+$/;
  const EXTRACT_REGEX = /^(?:X|\d)+\.\s+(?:"([^"]+)"|([^>]+))\s+>\s+(?:"([^"]+)"|(.+))$/;

  function setupEventListeners() {
    const handlers = {
      click: {
        closeModal: closeImportModal,
        cancelImport: closeImportModal,
        confirmImport: processImportedDecisions
      }
    };

    // Batch event listener setup
    Object.entries(handlers.click).forEach(([id, handler]) => {
      DOM[id]?.addEventListener('click', handler);
    });

    // Modal-specific listeners
    DOM.importModal.addEventListener('click', e => e.target === DOM.importModal && closeImportModal());
    DOM.importModal.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeImportModal();
      else if (e.key === 'Enter' && e.ctrlKey) processImportedDecisions();
    });
  }

  function copyToClipboard(type, currentSongList) {
    const copyTypes = {
      ranking: () => {
        const songs = Array.from(DOM.resultList.children, (el, i) => `${i + 1}. ${el.textContent}`);
        return [`My ${currentSongList.name} Song Ranking:\n\n${songs.join('\n')}`, "Ranking copied to clipboard!"];
      },
      decisions: () => formatDecisions(currentSongList, true),
      history: () => formatDecisions(currentSongList, false)
    };

    const [textToCopy, successMessage] = copyTypes[type]();

    navigator.clipboard.writeText(textToCopy)
      .then(() => showNotification(successMessage, true))
      .catch(err => {
        console.error('Failed to copy text:', err);
        showNotification("Copy failed. Please try again.", false);
      });
  }

  function formatDecisions(currentSongList, isPartial) {
    const headerText = `${isPartial ? 'Partial ' : ''}${currentSongList.name} Decision History`;
    const hist = state.useCleanPrefs ?
      topologicalSortPreferences(computeTransitiveReduction(getDecisionHistory())) :
      getDecisionHistory();

    const filteredHist = hist.filter(d => d.type !== 'infer');
    const decisionsText = filteredHist.map((d, i) => `${i + 1}. ${d.chosen} > ${d.rejected}`);

    return [
      `My ${headerText}:\n\n${decisionsText.join('\n')}`,
      `${filteredHist.length} ${isPartial ? 'Preferences' : 'History entries'} copied to clipboard!`
    ];
  }

  function showNotification(message, isSuccess = true, timeoutDuration = 3000, isSticky = false) {
    if (DOM.copyStatus.classList.contains('sticky') && !isSticky) return;

    const isCurrentlyVisible = DOM.copyStatus.classList.contains('visible');

    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
      notificationTimeout = null;
    }

    DOM.copyStatus.textContent = message;
    DOM.copyStatus.classList.toggle('success', isSuccess);
    DOM.copyStatus.classList.toggle('error', !isSuccess);
    DOM.copyStatus.classList.toggle('sticky', isSticky);

    if (!isCurrentlyVisible) {
      requestAnimationFrame(() => DOM.copyStatus.classList.add('visible'));
    }

    notificationTimeout = setTimeout(() => {
      DOM.copyStatus.classList.remove('visible', 'sticky');
    }, timeoutDuration);
  }

  function processImportedDecisions() {
    const text = DOM.importTextarea.value.trim();
    if (!text) {
      showNotification("No decisions to import", false);
      closeImportModal();
      return;
    }

    try {
      const parsedDecisions = parseImportedDecisions(text);
      if (!parsedDecisions.length) {
        showNotification("No valid decisions found", false);
        return;
      }

      importDecisions(parsedDecisions);
      songSorterFactory.checkCurrentComparison?.();
    } catch (error) {
      showNotification(`Error parsing decisions: ${error.message}`, false);
    }

    closeImportModal();
  }

  function parseImportedDecisions(text) {
    return text.split('\n')
      .map(line => line.trim())
      .filter(line => LINE_REGEX.test(line))
      .map(line => {
        const match = line.match(EXTRACT_REGEX);
        if (!match) return null;

        const chosen = (match[1] || match[2])?.trim();
        const rejected = (match[3] || match[4])?.trim();

        return chosen && rejected ? { comparison: 'X', chosen, rejected, type: 'import' } : null;
      })
      .filter(Boolean);
  }

  function importDecisions(decisions) {
    const currentHistory = getDecisionHistory();
    const currentSongList = state.currentSongList;

    // Use Maps for O(1) lookups instead of Sets with string concatenation
    const existingDecisions = new Map();
    const conflictingDecisions = new Map();

    currentHistory.forEach(decision => {
      existingDecisions.set(`${decision.chosen}|${decision.rejected}`, true);
      conflictingDecisions.set(`${decision.rejected}|${decision.chosen}`, true);
    });

    let stats = { addedCount: 0, skippedCount: 0, conflictCount: 0, cleanedCount: 0 };
    let importArray = decisions;

    if (state.useCleanPrefs) {
      const transitiveClosure = computeTransitiveClosure(decisions);
      const filteredClosure = transitiveClosure.filter(d =>
        currentSongList.songs.includes(d.chosen) && currentSongList.songs.includes(d.rejected)
      );
      importArray = computeTransitiveReduction(filteredClosure, true);
      stats.cleanedCount = decisions.length - importArray.length;
      console.log(`Transitive processing: ${transitiveClosure.length} → ${filteredClosure.length} → ${importArray.length}`);
    }

    for (const decision of importArray) {
      if (!currentSongList.songs.includes(decision.chosen) || !currentSongList.songs.includes(decision.rejected)) {
        stats.cleanedCount++;
        continue;
      }

      const key = `${decision.chosen}|${decision.rejected}`;

      if (existingDecisions.has(key)) {
        stats.skippedCount++;
        continue;
      }

      if (conflictingDecisions.has(key)) {
        stats.conflictCount++;
        continue;
      }

      songSorterFactory.addImportedDecision(decision);
      existingDecisions.set(key, true);
      conflictingDecisions.set(`${decision.rejected}|${decision.chosen}`, true);
      stats.addedCount++;
    }

    const message = `Imported ${decisions.length} decisions: ${stats.addedCount} added, ${stats.skippedCount} skipped, ${stats.conflictCount} conflicts, ${stats.cleanedCount} cleaned`;
    showNotification(message, true, 5000, true);
    console.log(message);

    return stats;
  }

  function openImportModal() {
    DOM.importModal.hidden = false;
    requestAnimationFrame(() => {
      DOM.importTextarea.value = '';
      DOM.importTextarea.focus();
    });
  }

  function closeImportModal() {
    DOM.importModal.hidden = true;
    DOM.importTextarea.value = '';
  }

  return {
    initialize: setupEventListeners,
    copyToClipboard,
    openImportModal,
    showNotification
  };
})();

window.ClipboardManager = ClipboardManager;