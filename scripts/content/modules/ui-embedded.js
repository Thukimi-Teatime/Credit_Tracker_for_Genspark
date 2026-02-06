// ========================================
// UI Embedded Module
// ========================================

(function () {
  const UICommon = window.GensparkTracker.UI.Common;

  const Embedded = {
    // Create embedded tracker next to credit display
    createEmbeddedTracker: function () {
      const creditLeftContainer = document.querySelector('.item.credit-left');

      if (!creditLeftContainer) {
        return false;
      }

      if (document.getElementById('genspark-embedded-tracker')) {
        return true;
      }

      const trackerDiv = document.createElement('div');
      trackerDiv.id = 'genspark-embedded-tracker';
      trackerDiv.style.cssText = `
        margin-top: 12px;
        padding: 16px;
        background: linear-gradient(135deg, #4c1d95 0%, #3b0764 100%);
        border-radius: 8px;
        border: 1px solid #6b21a8;
        font-size: 12px;
        font-family: sans-serif;
        box-shadow: 0 2px 8px rgba(59, 7, 100, 0.4);
      `;

      trackerDiv.innerHTML = `
        <div style="margin-bottom: 10px; font-weight: bold; color: #ffffff; font-size: 14px; border-bottom: 2px solid #7c3aed; padding-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
          <span>Credit Tracker</span>
          <button id="genspark-tracker-settings-btn" title="Open Settings" style="background: none; border: none; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; opacity: 0.7; border-radius: 4px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
        </div>
        <div id="embedded-tracker-content">Loading...</div>
      `;

      const creditLeftItem = creditLeftContainer.querySelector('.credit-left-item');
      if (creditLeftItem) {
        creditLeftItem.insertAdjacentElement('afterend', trackerDiv);

        // Add settings button listener
        setTimeout(() => {
          const settingsBtn = document.getElementById('genspark-tracker-settings-btn');
          if (settingsBtn) {
            settingsBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();
              this.openSettingsOverlay();
            }, true);
          }
        }, 0);

        return true;
      } else {
        return false;
      }
    },

    // Trigger glow animation
    triggerGlow: function () {
      const values = document.querySelectorAll('#genspark-embedded-tracker .embedded-tracker-value');
      if (values.length === 0) return;

      values.forEach(el => {
        el.style.animation = 'none';
        el.offsetHeight; // force reflow
        el.style.animation = 'text-glow-pulse 1s ease-out';
      });

      // Clean up animation property after it finishes
      setTimeout(() => {
        values.forEach(el => {
          if (el) el.style.animation = '';
        });
      }, 1000);
    },

    // Open settings as an iframe overlay
    openSettingsOverlay: function () {
      if (document.getElementById('genspark-settings-overlay')) return;

      const overlay = document.createElement('div');
      overlay.id = 'genspark-settings-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        z-index: 100000;
        display: flex;
        justify-content: center;
        align-items: center;
        animation: fade-in-overlay 0.3s ease-out forwards;
      `;

      const panel = document.createElement('div');
      panel.id = 'genspark-settings-panel';
      panel.style.cssText = `
        width: 660px;
        height: 620px;
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        position: relative;
        overflow: hidden;
        animation: scale-up-settings 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        display: flex;
        flex-direction: column;
      `;

      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '&times;';
      closeBtn.style.cssText = `
        position: absolute;
        top: 10px;
        right: 15px;
        font-size: 28px;
        background: none;
        border: none;
        color: #64748b;
        cursor: pointer;
        z-index: 100001;
        line-height: 1;
        padding: 5px;
        transition: color 0.2s;
      `;
      closeBtn.onmouseover = () => { closeBtn.style.color = '#1e293b'; };
      closeBtn.onmouseout = () => { closeBtn.style.color = '#64748b'; };
      closeBtn.onclick = () => this.closeSettingsOverlay();

      const iframe = document.createElement('iframe');
      iframe.src = chrome.runtime.getURL('popup.html');
      iframe.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
        background: white;
      `;

      panel.appendChild(closeBtn);
      panel.appendChild(iframe);
      overlay.appendChild(panel);

      overlay.onclick = (e) => {
        if (e.target === overlay) this.closeSettingsOverlay();
      };

      document.body.appendChild(overlay);
    },

    // Close settings overlay with animation
    closeSettingsOverlay: function () {
      const overlay = document.getElementById('genspark-settings-overlay');
      const panel = document.getElementById('genspark-settings-panel');
      if (!overlay || !panel) return;

      if (overlay.classList.contains('closing')) return;
      overlay.classList.add('closing');

      overlay.style.animation = 'fade-out-overlay 0.2s ease-in forwards';
      panel.style.animation = 'scale-down-settings 0.2s ease-in forwards';

      setTimeout(() => {
        if (overlay) overlay.remove();
      }, 200);
    },

    // Update embedded tracker content
    updateEmbeddedTracker: function (triggerGlowAfter = false) {
      const contentDiv = document.getElementById('embedded-tracker-content');
      if (!contentDiv) {
        return;
      }

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
        if (chrome.runtime.lastError) {
          console.error('[Credit Tracker for Genspark] Failed to update embedded tracker:', chrome.runtime.lastError);
          contentDiv.innerHTML = '<div style="color:#fca5a5;">Failed to load data.</div>';
          return;
        }

        const history = res.history;
        const latest = res.latest;
        const renewalDay = res.renewalDay;
        const previousBalance = res.previousBalance;
        const basePlanCredit = res.planStartCredit || 10000;
        const purchasedCredits = res.purchasedCredits || 0;
        const planStartCredit = basePlanCredit + purchasedCredits;

        // Numeric Display Settings
        const numericDisplayEnabled = res.numericDisplayEnabled;
        const monthlyPrice = parseFloat(res.monthlyPrice) || 0;
        const decimalPlaces = (res.decimalPlaces !== undefined && res.decimalPlaces !== null)
          ? parseInt(res.decimalPlaces, 10)
          : 0;
        const conversionRate = basePlanCredit > 0 ? monthlyPrice / basePlanCredit : 0;

        if (!history || history.length === 0 || !latest) {
          contentDiv.innerHTML = '<div style="color:#d8b4fe;">No data available yet.</div>';
          return;
        }

        const today = new Date();
        const formatDate = (date) => {
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          return `${y}/${m}/${d}`;
        };
        const todayStr = formatDate(today);

        const todayLogs = history.filter(item => {
          const logDate = new Date(item.time);
          return formatDate(logDate) === todayStr;
        });

        const firstCountToday = todayLogs.length > 0 ? todayLogs[0].count : latest.count;
        const currentCount = latest.count;
        const consumed = firstCountToday - currentCount;

        let sinceLastCheck = 0;
        if (previousBalance !== null && previousBalance >= currentCount) {
          sinceLastCheck = previousBalance - currentCount;
        }

        const MC = window.GensparkTracker.Modules.MetricsCalculator;

        // Calculate plan start date
        const planStart = MC.getPlanStartDate(renewalDay);

        // Calculate elapsed days
        const daysElapsed = MC.getDaysElapsed(planStart);

        // Calculate Actual Pace
        const actualPace = MC.calculateActualPace(planStartCredit, currentCount, daysElapsed);

        // Calculate Target Pace and days left
        const daysLeft = MC.getDaysLeft(renewalDay);
        const targetPace = MC.calculateTargetPace(planStartCredit, renewalDay);

        // Status judgement
        const statusData = MC.getPaceStatus(actualPace, targetPace);
        const statusText = statusData.status.replace(/🟢|🟡|🔴/g, '').trim().replace('\n', '<br>');
        const statusColor = statusData.color;


        // HTML generation for each item
        const dailyStartHTML = res.showDailyStart ? `
      <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #c4b5fd;">
        <span>Daily Start:</span>
        <span class="embedded-tracker-value" style="font-weight: bold;">${UICommon.formatValue(firstCountToday, numericDisplayEnabled, conversionRate, decimalPlaces)}</span>
      </div>
        ` : '';

        const currentBalanceHTML = res.showCurrentBalance ? `
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #c4b5fd;">
        <span>Current Credit:</span>
        <span class="embedded-tracker-value" style="font-weight: bold;">${UICommon.formatValue(currentCount, numericDisplayEnabled, conversionRate, decimalPlaces)}</span>
      </div>
        ` : '';

        const consumedTodayHTML = res.showConsumedToday ? `
      <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #fca5a5;">
        <span>Consumed Today:</span>
        <span class="embedded-tracker-value" style="font-weight: bold;">-${UICommon.formatValue(consumed, numericDisplayEnabled, conversionRate, decimalPlaces)}</span>
      </div>
        ` : '';

        const sinceLastCheckHTML = res.showSinceLastCheck ? `
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #fdba74;">
        <span>Since Last Check:</span>
        <span class="embedded-tracker-value" style="font-weight: bold;">-${UICommon.formatValue(sinceLastCheck, numericDisplayEnabled, conversionRate, decimalPlaces)}</span>
      </div>
        ` : '';

        // Normal mode: Actual Pace, Target Pace, Days Info, Status
        const actualPaceHTML = res.showActualPace ? `
      <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #67e8f9;">
        <span>Actual Pace:</span>
        <span class="embedded-tracker-value" style="font-weight: bold;">${UICommon.formatValue(actualPace, numericDisplayEnabled, conversionRate, decimalPlaces)} /day</span>
      </div>
        ` : '';

        const targetPaceHTML = res.showTargetPace ? `
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: #a5b4fc;">
        <span>Target Pace:</span>
        <span class="embedded-tracker-value" style="font-weight: bold;">${UICommon.formatValue(targetPace, numericDisplayEnabled, conversionRate, decimalPlaces)} /day</span>
      </div>
        ` : '';

        // Days Ahead/Behind calculation
        let daysAheadHTML = '';
        if (res.showDaysAhead) {
          if (targetPace === 0) {
            daysAheadHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: #6b7280;">
        <span>Days Ahead/Behind:</span>
        <span class="embedded-tracker-value" style="font-weight: bold;">N/A</span>
      </div>
        `;
          } else {
            // Calculate ideal balance for today
            const idealBalanceToday = planStartCredit - (targetPace * daysElapsed);
            // Calculate credit difference
            const creditDifference = currentCount - idealBalanceToday;
            // Convert to days
            const daysDifference = creditDifference / targetPace;

            const formattedDays = Math.abs(daysDifference).toFixed(decimalPlaces);

            let displayText, displayColor;
            if (daysDifference >= 0) {
              displayText = `+${formattedDays} day`;
              displayColor = '#007bff'; // Blue: Ahead
            } else {
              displayText = `-${formattedDays} day`;
              displayColor = '#dc3545'; // Red: Behind
            }

            daysAheadHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: ${displayColor};">
        <span>Days Ahead/Behind:</span>
        <span class="embedded-tracker-value" style="font-weight: bold;">${displayText}</span>
      </div>
        `;
          }
        }

        const daysInfoHTML = res.showDaysInfo ? `
      <div style="font-size: 10px; color: #c4b5fd; text-align: right; margin-top: 2px;">
        (${daysElapsed} days elapsed / ${daysLeft} days left)
      </div>
        ` : '';

        const statusHTML = res.showStatus ? `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 8px; color: ${statusColor}; font-weight: bold;">
        <span style="white-space: nowrap; margin-right: 8px;">Status:</span>
        <span class="embedded-tracker-value" style="text-align: right; line-height: 1.3;">${statusText}</span>
      </div>
        ` : '';

        const bottomSectionHTML = actualPaceHTML + targetPaceHTML + daysAheadHTML + daysInfoHTML + statusHTML;

        // Divider display judgment
        const showTopSection = res.showDailyStart || res.showCurrentBalance ||
          res.showConsumedToday || res.showSinceLastCheck;
        const showBottomSection = bottomSectionHTML.trim().length > 0;

        const dividerHTML = (showTopSection && showBottomSection) ? `
      <div style="border-top: 1px solid #7c3aed; margin: 10px 0;"></div>
        ` : '';

        // Final HTML assembly
        const html = `
      ${dailyStartHTML}
      ${currentBalanceHTML}
      ${consumedTodayHTML}
      ${sinceLastCheckHTML}
      ${dividerHTML}
      ${bottomSectionHTML}
    `;

        contentDiv.innerHTML = html;

        // Trigger glow after DOM is updated
        if (triggerGlowAfter) {
          this.triggerGlow();
        }
      });
    }
  };

  window.GensparkTracker.UI.Embedded = Embedded;

  // Add animation styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes text-glow-pulse {
      0% { text-shadow: 0 0 0 rgba(16, 185, 129, 0); }
      50% { text-shadow: 0 0 15px rgba(255, 255, 255, 0.9), 0 0 10px rgba(16, 185, 129, 0.8); color: #ffffff !important; }
      100% { text-shadow: 0 0 0 rgba(16, 185, 129, 0); }
    }
    @keyframes fade-in-overlay { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fade-out-overlay { from { opacity: 1; } to { opacity: 0; } }
    @keyframes scale-up-settings {
      from { opacity: 0; transform: scale(0.95) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes scale-down-settings {
      from { opacity: 1; transform: scale(1) translateY(0); }
      to { opacity: 0; transform: scale(0.95) translateY(10px); }
    }
    #genspark-tracker-settings-btn:hover {
      opacity: 1 !important;
      background: rgba(255, 255, 255, 0.15);
      transform: scale(1.1);
    }
  `;
  document.head.appendChild(style);

})();
