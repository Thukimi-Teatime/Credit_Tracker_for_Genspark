document.addEventListener('DOMContentLoaded', () => {
  const UICommon = window.GensparkTracker.UI.Common;
  const embeddedPreviewDiv = document.getElementById('embedded-tracker-preview');
  const logDiv = document.getElementById('log');
  const renewalDayInput = document.getElementById('renewalDay');
  const todayDisplay = document.getElementById('todayDate');
  const datePrefix = document.getElementById('datePrefix');
  const setDailyStartBtn = document.getElementById('setDailyStartBtn');
  const dailyStartInput = document.getElementById('dailyStartInput');
  const debugModeToggle = document.getElementById('debugModeToggle');
  const planStartCreditInput = document.getElementById('planStartCredit');
  const purchasedCreditsInput = document.getElementById('purchasedCredits');
  const viewDiagnosticsBtn = document.getElementById('viewDiagnosticsBtn');

  // Numeric Display Settings
  const numericSettingsMenu = document.getElementById('numericSettingsMenu');
  const numericDisplayToggle = document.getElementById('numericDisplayToggle');
  const monthlyPriceInput = document.getElementById('monthlyPrice');
  const decimalPlacesSelect = document.getElementById('decimalPlaces');
  const previewRate = document.getElementById('previewRate');
  const previewValue = document.getElementById('previewValue');

  // Display Settings
  const displaySettingsMenu = document.getElementById('displaySettingsMenu');
  const displayCheckboxes = {
    showDailyStart: document.getElementById('showDailyStart'),
    showCurrentBalance: document.getElementById('showCurrentBalance'),
    showConsumedToday: document.getElementById('showConsumedToday'),
    showSinceLastCheck: document.getElementById('showSinceLastCheck'),
    showActualPace: document.getElementById('showActualPace'),
    showTargetPace: document.getElementById('showTargetPace'),
    showDaysAhead: document.getElementById('showDaysAhead'),
    showDaysInfo: document.getElementById('showDaysInfo'),
    showStatus: document.getElementById('showStatus')
  };

  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}/${m}/${d}`;
  };

  const updateDatePrefix = (renewalDay) => {
    const now = new Date();
    todayDisplay.innerText = formatDate(now);

    let displayDate = new Date(now.getFullYear(), now.getMonth(), renewalDay);
    if (now.getDate() >= renewalDay) {
      displayDate.setMonth(displayDate.getMonth() + 1);
    }

    const y = displayDate.getFullYear();
    const m = String(displayDate.getMonth() + 1).padStart(2, '0');
    datePrefix.innerText = `${y}/${m}/`;
  };



  const renderEmbeddedPreview = () => {
    chrome.storage.local.get({
      history: [],
      latest: null,
      renewalDay: 1,
      previousBalance: null,
      planStartCredit: 10000,
      showDailyStart: true,
      showCurrentBalance: true,
      showConsumedToday: true,
      showSinceLastCheck: true,
      showActualPace: true,
      showTargetPace: true,
      showDaysAhead: true,
      showDaysInfo: true,
      showStatus: true,
      numericDisplayEnabled: false,
      monthlyPrice: 0,
      decimalPlaces: 0,
      purchasedCredits: 0
    }, (res) => {
      if (!embeddedPreviewDiv) return;

      const history = res.history;
      const latest = res.latest;
      const renewalDay = res.renewalDay;
      const previousBalance = res.previousBalance;
      const baseStartCredit = res.planStartCredit || 10000;
      const totalStartCredit = baseStartCredit + (res.purchasedCredits || 0);
      const numericDisplayEnabled = res.numericDisplayEnabled;
      const monthlyPrice = parseFloat(res.monthlyPrice) || 0;
      const decimalPlaces = (res.decimalPlaces !== undefined && res.decimalPlaces !== null)
        ? parseInt(res.decimalPlaces, 10)
        : 0;
      const conversionRate = baseStartCredit > 0 ? monthlyPrice / baseStartCredit : 0;

      if (!history || history.length === 0 || !latest) {
        embeddedPreviewDiv.innerHTML = '<div style="color:#d8b4fe;">No data available yet.</div>';
        return;
      }

      const today = new Date();
      const todayStr = formatDate(today);
      const todayLogs = history.filter(item => formatDate(new Date(item.time)) === todayStr);

      const firstCountToday = todayLogs.length > 0 ? todayLogs[0].count : latest.count;
      const currentCount = latest.count;
      const consumed = firstCountToday - currentCount;

      let sinceLastCheck = 0;
      if (previousBalance !== null && previousBalance >= currentCount) {
        sinceLastCheck = previousBalance - currentCount;
      }

      const MC = window.GensparkTracker.Modules.MetricsCalculator;

      const now = new Date();
      const planStart = MC.getPlanStartDate(renewalDay);
      const daysElapsed = MC.getDaysElapsed(planStart);

      const consumedTotal = totalStartCredit - currentCount;
      const actualPace = MC.calculateActualPace(totalStartCredit, currentCount, daysElapsed);

      const daysLeft = MC.getDaysLeft(renewalDay);
      const targetPace = MC.calculateTargetPace(totalStartCredit, renewalDay);

      const statusData = MC.getPaceStatus(actualPace, targetPace);
      const statusText = statusData.status.replace(/🟢|🟡|🔴/g, '').trim().replace('\n', '<br>'); // Remove emojis for embedded view if preferred, or keep them. The original had HTML line breaks.
      const statusColor = statusData.color;

      const dailyStartHTML = res.showDailyStart ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #c4b5fd;">
          <span>Daily Start:</span>
          <span style="font-weight: bold;">${UICommon.formatValue(firstCountToday, numericDisplayEnabled, conversionRate, decimalPlaces)}</span>
        </div>` : '';

      const currentBalanceHTML = res.showCurrentBalance ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #c4b5fd;">
          <span>Current Credit:</span>
          <span style="font-weight: bold;">${UICommon.formatValue(currentCount, numericDisplayEnabled, conversionRate, decimalPlaces)}</span>
        </div>` : '';

      const consumedTodayHTML = res.showConsumedToday ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #fca5a5;">
          <span>Consumed Today:</span>
          <span style="font-weight: bold;">-${UICommon.formatValue(consumed, numericDisplayEnabled, conversionRate, decimalPlaces)}</span>
        </div>` : '';

      const sinceLastCheckHTML = res.showSinceLastCheck ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #fdba74;">
          <span>Since Last Check:</span>
          <span style="font-weight: bold;">-${UICommon.formatValue(sinceLastCheck, numericDisplayEnabled, conversionRate, decimalPlaces)}</span>
        </div>` : '';

      const actualPaceHTML = res.showActualPace ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #67e8f9;">
          <span>Actual Pace:</span>
          <span style="font-weight: bold;">${UICommon.formatValue(actualPace, numericDisplayEnabled, conversionRate, decimalPlaces)} /day</span>
        </div>` : '';

      const targetPaceHTML = res.showTargetPace ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: #a5b4fc;">
          <span>Target Pace:</span>
          <span style="font-weight: bold;">${UICommon.formatValue(targetPace, numericDisplayEnabled, conversionRate, decimalPlaces)} /day</span>
        </div>` : '';

      let daysAheadHTML = '';
      if (res.showDaysAhead) {
        if (targetPace === 0) {
          daysAheadHTML = `<div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: #6b7280;"><span>Days Ahead/Behind:</span><span style="font-weight: bold;">N/A</span></div>`;
        } else {
          const idealBalanceToday = totalStartCredit - (targetPace * daysElapsed);
          const creditDifference = currentCount - idealBalanceToday;
          const daysDifference = creditDifference / targetPace;
          const formattedDays = Math.abs(daysDifference).toFixed(decimalPlaces);
          const displayText = daysDifference >= 0 ? `+${formattedDays} day` : `-${formattedDays} day`;
          const displayColor = daysDifference >= 0 ? '#007bff' : '#dc3545';
          daysAheadHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: ${displayColor};">
              <span>Days Ahead/Behind:</span>
              <span style="font-weight: bold;">${displayText}</span>
            </div>`;
        }
      }

      const daysInfoHTML = res.showDaysInfo ? `<div style="font-size: 10px; color: #c4b5fd; text-align: right; margin-top: 2px;">(${daysElapsed} days elapsed / ${daysLeft} days left)</div>` : '';
      const statusHTML = res.showStatus ? `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 8px; color: ${statusColor}; font-weight: bold;">
          <span style="white-space: nowrap; margin-right: 8px;">Status:</span>
          <span style="text-align: right; line-height: 1.3;">${statusText}</span>
        </div>` : '';

      const bottomSectionHTML = actualPaceHTML + targetPaceHTML + daysAheadHTML + daysInfoHTML + statusHTML;
      const showTopSection = res.showDailyStart || res.showCurrentBalance || res.showConsumedToday || res.showSinceLastCheck;
      const dividerHTML = (showTopSection && bottomSectionHTML.trim().length > 0) ? '<div style="border-top: 1px solid #7c3aed; margin: 10px 0;"></div>' : '';

      embeddedPreviewDiv.innerHTML = `${dailyStartHTML}${currentBalanceHTML}${consumedTodayHTML}${sinceLastCheckHTML}${dividerHTML}${bottomSectionHTML}`;
    });
  };

  chrome.storage.local.get({
    history: [],
    latest: null,
    renewalDay: 1,
    debugMode: false,
    planStartCredit: 10000,
    showDailyStart: true,
    showCurrentBalance: true,
    showConsumedToday: true,
    showSinceLastCheck: true,
    showActualPace: true,
    showTargetPace: true,
    showDaysAhead: true,
    showDaysInfo: true,
    showStatus: true,
    numericDisplayEnabled: false,
    monthlyPrice: 0,
    decimalPlaces: 0,
    purchasedCredits: 0
  }, (data) => {
    if (chrome.runtime.lastError) {
      console.error('[Credit Tracker for Genspark] Failed to load settings:', chrome.runtime.lastError);
      logDiv.innerHTML = '<div style="padding:10px; color:#d93025; font-size:12px;">Failed to load data. Please reload the extension.</div>';
      return;
    }

    renewalDayInput.value = data.renewalDay;
    debugModeToggle.checked = data.debugMode;

    // Initialize diagnostic button visibility
    const diagnosticSection = document.querySelector('.diagnostic-section');
    if (diagnosticSection) {
      diagnosticSection.style.display = data.debugMode ? 'block' : 'none';
    }

    planStartCreditInput.value = data.planStartCredit;
    purchasedCreditsInput.value = data.purchasedCredits;

    // Restore Display Settings checkbox state
    Object.keys(displayCheckboxes).forEach(key => {
      displayCheckboxes[key].checked = data[key];
    });

    // Restore Numeric Display Settings state
    numericDisplayToggle.checked = data.numericDisplayEnabled;
    monthlyPriceInput.value = data.monthlyPrice;
    decimalPlacesSelect.value = data.decimalPlaces;





    updateDatePrefix(data.renewalDay);

    const saveSettings = () => {
      const renewalDay = parseInt(renewalDayInput.value) || 1;
      const planStartCredit = parseInt(planStartCreditInput.value) || 10000;
      const purchasedCredits = parseInt(purchasedCreditsInput.value) || 0;

      chrome.storage.local.set({
        renewalDay,
        planStartCredit,
        purchasedCredits
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('[Credit Tracker for Genspark] Failed to save settings:', chrome.runtime.lastError);
          alert('Failed to save settings. Storage may be full.');
          return;
        }

        updateDatePrefix(renewalDay);
        renderUI();
        renderEmbeddedPreview(); // Ensure preview matches new total
      });
    };

    // Monitor Display Settings checkbox changes

    // ========================================
    // Display Presets
    // ========================================
    const presets = {
      all: {
        showDailyStart: true,
        showCurrentBalance: true,
        showConsumedToday: true,
        showSinceLastCheck: true,
        showActualPace: true,
        showTargetPace: true,
        showDaysAhead: true,
        showDaysInfo: true,
        showStatus: true
      },
      pace: {
        showDailyStart: true,
        showCurrentBalance: false,
        showConsumedToday: true,
        showSinceLastCheck: true,
        showActualPace: true,
        showTargetPace: true,
        showDaysAhead: false,
        showDaysInfo: false,
        showStatus: true
      },
      day: {
        showDailyStart: true,
        showCurrentBalance: false,
        showConsumedToday: true,
        showSinceLastCheck: true,
        showActualPace: false,
        showTargetPace: false,
        showDaysAhead: true,
        showDaysInfo: true,
        showStatus: false
      }
    };

    const applyPreset = (presetKey) => {
      const config = presets[presetKey];
      if (!config) return;

      chrome.storage.local.set(config, () => {
        if (chrome.runtime.lastError) {
          console.error('[Credit Tracker for Genspark] Failed to apply preset:', chrome.runtime.lastError);
          return;
        }

        // Update checkboxes in UI
        Object.keys(displayCheckboxes).forEach(key => {
          if (config[key] !== undefined) {
            displayCheckboxes[key].checked = config[key];
          }
        });

        // Update active button state
        document.querySelectorAll('.preset-button').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.getElementById(`preset${presetKey.charAt(0).toUpperCase() + presetKey.slice(1)}`);
        if (activeBtn) activeBtn.classList.add('active');


        // Update preview
        renderEmbeddedPreview();
      });
    };

    document.getElementById('presetAll').addEventListener('click', () => applyPreset('all'));
    document.getElementById('presetPace').addEventListener('click', () => applyPreset('pace'));
    document.getElementById('presetDay').addEventListener('click', () => applyPreset('day'));

    // Monitor Display Settings checkbox changes
    Object.keys(displayCheckboxes).forEach(key => {
      displayCheckboxes[key].addEventListener('change', () => {
        // ... (existing change logic)
        // Remove active class from buttons when manual change occurs
        document.querySelectorAll('.preset-button').forEach(btn => btn.classList.remove('active'));

        const settings = {};
        Object.keys(displayCheckboxes).forEach(k => {
          settings[k] = displayCheckboxes[k].checked;
        });

        chrome.storage.local.set(settings, () => {
          if (chrome.runtime.lastError) {
            console.error('[Credit Tracker for Genspark] Failed to save display settings:', chrome.runtime.lastError);
            return;
          }


          // Update preview
          renderEmbeddedPreview();
        });
      });
    });


    // ========================================
    // Numeric Display Settings
    // ========================================

    // Function to update preview
    function updateNumericPreview() {
      chrome.storage.local.get({
        planStartCredit: 10000,
        monthlyPrice: 0,
        decimalPlaces: 0
      }, (data) => {
        const { planStartCredit, monthlyPrice, decimalPlaces } = data;
        const conversionRate = planStartCredit > 0 ? monthlyPrice / planStartCredit : 0;
        const exampleValue = 100 * conversionRate;

        // Ensure conversion to number (handle 0 correctly)
        const decimalPlacesNum = (decimalPlaces !== undefined && decimalPlaces !== null)
          ? parseInt(decimalPlaces, 10)
          : 0;

        previewRate.textContent = conversionRate.toFixed(6);
        previewValue.textContent = exampleValue.toFixed(decimalPlacesNum);
      });
    }

    // Numeric Display Settings logic consolidated below...


    const updateDiagnosticVisibility = (isEnabled) => {
      const diagnosticSection = document.querySelector('.diagnostic-section');
      if (diagnosticSection) {
        diagnosticSection.style.display = isEnabled ? 'block' : 'none';
      }
    };

    debugModeToggle.addEventListener('change', () => {
      const debugMode = debugModeToggle.checked;
      updateDiagnosticVisibility(debugMode);

      chrome.storage.local.set({ debugMode }, () => {
        if (chrome.runtime.lastError) {
          console.error('[Credit Tracker for Genspark] Failed to save debug mode:', chrome.runtime.lastError);
          return;
        }
        console.log(`[Credit Tracker for Genspark] Debug mode ${debugMode ? 'enabled' : 'disabled'}`);
        if (debugMode) {
          console.log('[Credit Tracker for Genspark] Reload the page to see debug logs');
        }
      });
    });

    // View Diagnostics button
    viewDiagnosticsBtn.addEventListener('click', () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL('diagnostic.html')
      });
    });

    // Numeric Display Settings logic consolidated below...

    // Numeric Display Settings - Calculate and Update Preview
    function updateNumericPreview() {
      const monthlyPrice = parseFloat(monthlyPriceInput.value) || 0;
      const baseCredit = parseInt(planStartCreditInput.value) || 10000;

      // Get decimalPlaces (explicit handling)
      const value = decimalPlacesSelect.value;
      const decimalPlaces = (value !== undefined && value !== null && value !== '')
        ? parseInt(value, 10)
        : 0;

      let conversionRate = 0;
      if (baseCredit > 0) {
        conversionRate = monthlyPrice / baseCredit;
      }

      const previewAmount = (100 * conversionRate).toFixed(decimalPlaces);

      previewRate.textContent = conversionRate.toFixed(6);
      previewValue.textContent = previewAmount;
    }



    // Numeric Display Settings - Event Listeners
    numericDisplayToggle.addEventListener('change', () => {
      const numericDisplayEnabled = numericDisplayToggle.checked;
      chrome.storage.local.set({ numericDisplayEnabled }, () => {
        if (chrome.runtime.lastError) {
          console.error('[Credit Tracker for Genspark] Failed to save numericDisplayEnabled:', chrome.runtime.lastError);
          return;
        }
        console.log('[Credit Tracker for Genspark] Saved numericDisplayEnabled:', numericDisplayEnabled);


        // Update preview
        renderEmbeddedPreview();
      });
    });

    monthlyPriceInput.addEventListener('input', () => {
      const monthlyPrice = parseFloat(monthlyPriceInput.value) || 0;
      chrome.storage.local.set({ monthlyPrice }, () => {
        if (chrome.runtime.lastError) {
          console.error('[Credit Tracker for Genspark] Failed to save monthlyPrice:', chrome.runtime.lastError);
          return;
        }
        console.log('[Credit Tracker for Genspark] Saved monthlyPrice:', monthlyPrice);

        // Update preview
        updateNumericPreview();


        // Update preview
        renderEmbeddedPreview();
      });
    });

    // Change decimal places
    decimalPlacesSelect.addEventListener('change', () => {
      const value = decimalPlacesSelect.value;
      const decimalPlaces = (value !== undefined && value !== null && value !== '')
        ? parseInt(value, 10)
        : 0;

      if (isNaN(decimalPlaces) || decimalPlaces < 0 || decimalPlaces > 4) return;

      chrome.storage.local.set({ decimalPlaces }, () => {
        if (chrome.runtime.lastError) return;
        updateNumericPreview();
        renderEmbeddedPreview();

      });
    });

    planStartCreditInput.addEventListener('change', () => {
      updateNumericPreview();
      renderEmbeddedPreview();
      saveSettings(); // Ensure core settings are also saved
    });

    purchasedCreditsInput.addEventListener('input', () => {
      updateNumericPreview();
      renderEmbeddedPreview();
    });

    purchasedCreditsInput.addEventListener('change', () => {
      saveSettings();
    });

    // Initialize Numeric Display Settings
    chrome.storage.local.get({
      numericDisplayEnabled: false,
      monthlyPrice: 0,
      decimalPlaces: 0
    }, (data) => {
      numericDisplayToggle.checked = data.numericDisplayEnabled;
      monthlyPriceInput.value = data.monthlyPrice;
      decimalPlacesSelect.value = (data.decimalPlaces !== undefined && data.decimalPlaces !== null)
        ? data.decimalPlaces
        : 0;
      updateNumericPreview();
    });

    const renderUI = () => {
      chrome.storage.local.get({
        history: [],
        latest: null,
        renewalDay: 1,
        planStartCredit: 10000,
        numericDisplayEnabled: false,
        monthlyPrice: 0,
        decimalPlaces: 0,
        purchasedCredits: 0
      }, (res) => {
        if (chrome.runtime.lastError) {
          console.error('[Credit Tracker for Genspark] Failed to render UI:', chrome.runtime.lastError);
          logDiv.innerHTML = '<div style="padding:10px; color:#d93025; font-size:12px;">Failed to load data.</div>';
          return;
        }

        const history = res.history;
        const latest = res.latest;
        const renewalDay = res.renewalDay;
        const baseStartCredit = res.planStartCredit || 10000;
        const totalStartCredit = baseStartCredit + (res.purchasedCredits || 0);

        if (!history || history.length === 0) {
          logDiv.innerHTML = '<div style="padding:10px; color:#999; font-size:12px;">No history recorded yet.</div>';
          setDailyStartBtn.disabled = true;
          return;
        }

        const today = new Date();
        const todayStr = formatDate(today);
        const todayLogs = history.filter(item => {
          const logDate = new Date(item.time);
          return formatDate(logDate) === todayStr;
        });

        let html = '';
        if (latest) {
          const firstCountToday = todayLogs.length > 0 ? todayLogs[0].count : latest.count;
          const currentCount = latest.count;
          const consumed = firstCountToday - currentCount;

          const MC = window.GensparkTracker.Modules.MetricsCalculator;

          const planStartDate = MC.getPlanStartDate(renewalDay);
          const daysElapsed = MC.getDaysElapsed(planStartDate);
          const actualPace = MC.calculateActualPace(totalStartCredit, currentCount, daysElapsed);
          const targetPace = MC.calculateTargetPace(totalStartCredit, renewalDay);
          const paceStatus = MC.getPaceStatus(actualPace, targetPace);

          // Calculate Days Ahead/Behind and Days Left
          const daysLeft = MC.getDaysLeft(renewalDay);

          let daysAheadHTML = '';
          if (targetPace > 0) {
            const idealBalanceToday = totalStartCredit - (targetPace * daysElapsed);
            const daysDifference = (currentCount - idealBalanceToday) / targetPace;
            const formattedDays = Math.abs(daysDifference).toFixed(res.decimalPlaces || 0);
            const displayText = daysDifference >= 0 ? `+${formattedDays} day` : `-${formattedDays} day`;
            const displayColor = daysDifference >= 0 ? '#1a73e8' : '#d93025';
            daysAheadHTML = `
              <div class="status-row" style="color:${displayColor}; align-items: flex-start; margin-bottom: 8px;">
                <span class="status-label">Days Ahead/Behind:</span>
                <div style="text-align: right;">
                  <span class="status-value">${displayText}</span>
                  <div style="font-size: 10px; color: #999; margin-top: 2px;">
                    (${daysElapsed} days elapsed / ${daysLeft} days left)
                  </div>
                </div>
              </div>`;
          } else {
            daysAheadHTML = `
              <div class="status-row" style="color:#5f6368; align-items: flex-start; margin-bottom: 8px;">
                <span class="status-label">Days Ahead/Behind:</span>
                <div style="text-align: right;">
                  <span class="status-value">N/A</span>
                  <div style="font-size: 10px; color: #999; margin-top: 2px;">
                    (${daysElapsed} days elapsed / ${daysLeft} days left)
                  </div>
                </div>
              </div>`;
          }

          html = `
    <div class="status-row">
      <span class="status-label">Daily Start:</span>
      <span class="status-value">${firstCountToday}</span>
    </div>
    <div class="status-row">
      <span class="status-label">Current Credit:</span>
      <span class="status-value">${currentCount}</span>
    </div>
    <div class="status-row" style="color:#d93025;">
      <span class="status-label">Consumed Today:</span>
      <span class="status-value">-${consumed}</span>
    </div>
    <div class="divider"></div>
    <div class="status-row" style="color:#1a73e8;">
      <span class="status-label">Actual Pace:</span>
      <span class="status-value">${actualPace} /day</span>
    </div>
    <div class="status-row" style="color:#5f6368;">
      <span class="status-label">Target Pace:</span>
      <span class="status-value">${targetPace} /day</span>
    </div>
    ${daysAheadHTML}
    <div class="status-row" style="color:${paceStatus.color}; font-weight:bold; margin-top:4px;">
      <span class="status-label">Status:</span>
      <span class="status-value">${paceStatus.status}</span>
    </div>
`;
          setDailyStartBtn.disabled = false;
        } else {
          setDailyStartBtn.disabled = true;
          html = '<div style="padding:10px; color:#999; font-size:12px;">No current data available.</div>';
        }
        logDiv.innerHTML = html;

        // Update Numeric Display preview
        updateNumericPreview();
        // Update Embedded preview
        renderEmbeddedPreview();
      });
    };

    setDailyStartBtn.addEventListener('click', () => {
      setDailyStartBtn.disabled = true;
      const originalText = setDailyStartBtn.textContent;
      setDailyStartBtn.textContent = 'Setting...';

      chrome.storage.local.get({ history: [], latest: null }, (data) => {
        const resetButton = () => {
          setDailyStartBtn.disabled = false;
          setDailyStartBtn.textContent = originalText;
          setDailyStartBtn.style.background = '#4285f4';
        };

        if (chrome.runtime.lastError) {
          alert('Failed to load data: ' + chrome.runtime.lastError.message);
          resetButton();
          return;
        }

        // Get input form value
        const inputValue = dailyStartInput.value.trim();
        let dailyStartValue;

        if (inputValue === '') {
          // If input is empty: use current balance
          if (!data.latest || data.latest.count === undefined) {
            alert('No current credit data available. Please enter a value manually.');
            resetButton();
            return;
          }
          dailyStartValue = data.latest.count;
        } else {
          // If input exists: use input value
          dailyStartValue = parseInt(inputValue, 10);

          // Validation
          if (isNaN(dailyStartValue) || dailyStartValue < 0 || dailyStartValue > 1000000) {
            alert('Please enter a valid value between 0 and 1,000,000.');
            resetButton();
            return;
          }
        }

        const currentCount = dailyStartValue;
        const now = new Date();
        const todayStr = formatDate(now);
        const fullTimeStr = now.toLocaleString();

        let history = data.history;
        let updatedHistory = [...history];

        updatedHistory = updatedHistory.filter(item => {
          const logDate = new Date(item.time);
          return formatDate(logDate) !== todayStr;
        });

        updatedHistory.unshift({ time: fullTimeStr, count: currentCount });

        if (updatedHistory.length > 50) updatedHistory.pop();

        chrome.storage.local.set({ history: updatedHistory }, () => {
          if (chrome.runtime.lastError) {
            alert('Failed to save: ' + chrome.runtime.lastError.message);
            resetButton();
            return;
          }

          console.log(`[Credit Tracker for Genspark] Daily Start set to ${currentCount}`);

          setDailyStartBtn.textContent = '✓ Done!';
          setDailyStartBtn.style.background = '#34a853';

          // Clear input form
          dailyStartInput.value = '';

          renderUI();

          setTimeout(() => {
            resetButton();
          }, 1500);
        });
      });
    });

    renderUI();
    renewalDayInput.addEventListener('change', saveSettings);
    planStartCreditInput.addEventListener('change', saveSettings);
    purchasedCreditsInput.addEventListener('change', saveSettings);
  });
});
