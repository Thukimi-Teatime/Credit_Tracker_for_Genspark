// ========================================
// Main Entry Point
// ========================================

(function () {
    const State = window.GensparkTracker.State;
    const Config = window.GensparkTracker.Config;
    const Logger = window.GensparkTracker.Utils.Logger;
    const Storage = window.GensparkTracker.Utils.Storage;
    const Calculator = window.GensparkTracker.Modules.Calculator;
    const UIEchembedded = window.GensparkTracker.UI.Embedded;
    const UISidebar = window.GensparkTracker.UI.Sidebar;

    // Helper: Check if element is truly visible (not just in DOM)
    const isVisible = (el) => {
        if (!el) return false;
        return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    };

    // Dropdown Observer
    const dropdownObserver = new MutationObserver((mutations) => {
        const dropdown = document.querySelector('.n-popover.n-popover-shared');

        if (dropdown) {
            // TARGETED: Only proceed if this popover contains credit info
            if (!dropdown.querySelector('.credit-left-item')) {
                return;
            }

            const style = window.getComputedStyle(dropdown);
            const isDropdownVisible = style.display !== 'none';

            if (isDropdownVisible && !State.isPopupOpen) {
                // Popup opened
                State.isPopupOpen = true;
                State.hasProcessedCurrentPopup = false;
                State.isClosing = false;
                State.detectionAttemptCount = 0;
                State.detectedValues = [];
                State.detectedStrategies = [];

                // Measurement start
                State.detectionStartTime = performance.now();
                State.lastAttemptTime = 0;
                State.attemptTimestamps = [];
                Logger.debugLog('[Credit Tracker for Genspark] 📊 Detection started');

                Logger.debugLog('[Credit Tracker for Genspark] Popup opened (via dropdown)');

                // Tracker display
                const existingTracker = document.getElementById('genspark-embedded-tracker');
                if (!existingTracker) {
                    const created = UIEchembedded.createEmbeddedTracker();
                    if (created) {
                        UIEchembedded.updateEmbeddedTracker();
                    }
                } else {
                    UIEchembedded.updateEmbeddedTracker();
                }

            } else if (!isDropdownVisible && State.isPopupOpen) {
                // Popup started closing
                State.isPopupOpen = false;
                State.isClosing = true;
                Logger.debugLog('[Credit Tracker for Genspark] Popup closing (via dropdown)');

                // Wait for element removal (recursive check)
                const waitForElementRemoval = (attemptCount = 0) => {
                    const maxAttempts = 20;

                    const container = document.querySelector('.credit-left-item');

                    if (!container) {
                        // Element completely removed
                        State.hasProcessedCurrentPopup = false;
                        State.isClosing = false;
                        State.detectedValues = [];
                        State.detectedStrategies = [];
                        State.lastCloseTime = Date.now();

                        // Measurement end (aborted)
                        if (State.detectionStartTime > 0) {
                            const totalTime = performance.now() - State.detectionStartTime;
                            Logger.debugLog(`[Credit Tracker for Genspark] 📊 Detection aborted (popup closed) - Total: ${totalTime.toFixed(1)}ms`);
                            State.detectionStartTime = 0;
                        }

                        if (State.isPopupOpen || State.isClosing) {
                            Logger.debugLog('[Credit Tracker for Genspark] Popup closed (complete)');
                        }
                        State.hasProcessedCurrentPopup = false;
                        State.isClosing = false;
                    } else if (attemptCount < maxAttempts) {
                        setTimeout(() => waitForElementRemoval(attemptCount + 1), 100);
                    } else {
                        Logger.debugWarn('[Credit Tracker for Genspark] Element removal timeout - forcing reset');
                        State.hasProcessedCurrentPopup = false;
                        State.isClosing = false;
                        State.detectedStrategies = [];
                        State.detectionAttemptCount = 0;
                        State.detectedValues = [];
                        State.detectedStrategies = [];
                        State.lastCloseTime = Date.now();
                        State.detectionStartTime = 0;
                    }
                };

                waitForElementRemoval();
            }
        }
    });

    dropdownObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
    });

    // Main Logic Observer (debounced)
    let observerTimeout = null;

    const observer = new MutationObserver(() => {
        if (observerTimeout) {
            clearTimeout(observerTimeout);
        }

        observerTimeout = setTimeout(() => {
            if (State.isProcessing) return;
            if (State.isClosing) return;

            const container = document.querySelector('.credit-left-item');
            const containerVisible = isVisible(container);

            if (container && containerVisible) {
                // Popup is open and visible

                if (!State.isPopupOpen) {
                    const now = Date.now();
                    const timeSinceLastClose = now - State.lastCloseTime;

                    if (timeSinceLastClose > 1000 || State.lastCloseTime === 0) {
                        State.isPopupOpen = true;
                        State.detectedStrategies = [];
                        State.hasProcessedCurrentPopup = false;
                        State.detectionAttemptCount = 0;
                        State.detectedValues = [];
                        State.detectedStrategies = [];

                        // Measurement start (fallback)
                        State.detectionStartTime = performance.now();
                        State.lastAttemptTime = 0;
                        State.attemptTimestamps = [];
                        Logger.debugLog('[Credit Tracker for Genspark] 📊 Detection started (fallback)');

                        Logger.debugLog('[Credit Tracker for Genspark] Popup opened (fallback detection)');
                    } else {
                        Logger.debugLog('[Credit Tracker for Genspark] Ignoring false positive detection (too soon after close)');
                        return;
                    }
                }

                if (State.hasProcessedCurrentPopup) {
                    return;
                }

                // Max attempts check
                if (State.detectionAttemptCount >= Config.MAX_DETECTION_ATTEMPTS) {
                    Logger.debugLog('[Credit Tracker for Genspark] Max detection attempts reached');
                    State.hasProcessedCurrentPopup = true;

                    // Measurement end (max attempts)
                    if (State.detectionStartTime > 0) {
                        const totalTime = performance.now() - State.detectionStartTime;
                        Logger.debugLog(`[Credit Tracker for Genspark] 📊 Detection ended (max attempts) - Total: ${totalTime.toFixed(1)}ms`);
                        Logger.printDetectionSummary();
                        State.detectionStartTime = 0;
                    }

                    return;
                }

                // Attempt timestamp
                const attemptStartTime = performance.now();
                const timeSinceLastAttempt = State.lastAttemptTime > 0
                    ? (attemptStartTime - State.lastAttemptTime).toFixed(1)
                    : '0.0';

                const result = Calculator.getCreditValue();

                // Duration record
                const attemptDuration = (performance.now() - attemptStartTime).toFixed(2);

                if (result === null) {
                    State.detectionAttemptCount++;
                    Logger.debugLog(`[Credit Tracker for Genspark] Detection attempt ${State.detectionAttemptCount}/${Config.MAX_DETECTION_ATTEMPTS}: null (no value found) [took ${attemptDuration}ms, interval ${timeSinceLastAttempt}ms]`);

                    State.lastAttemptTime = attemptStartTime;
                    State.attemptTimestamps.push({
                        attempt: State.detectionAttemptCount,
                        value: null,
                        duration: parseFloat(attemptDuration),
                        interval: parseFloat(timeSinceLastAttempt)
                    });

                    // Retry
                    setTimeout(() => {
                        const dummy = document.createElement('span');
                        dummy.style.display = 'none';
                        document.body.appendChild(dummy);
                        document.body.removeChild(dummy);
                    }, Config.DETECTION_INTERVAL);

                    return;
                }

                // Value detected
                State.detectionAttemptCount++;
                State.detectedValues.push(result.value);
                State.detectedStrategies.push(result.strategy);
                Logger.debugLog(`[Credit Tracker for Genspark] Detection attempt ${State.detectionAttemptCount}/${Config.MAX_DETECTION_ATTEMPTS}: ${result.value} (Stage ${result.strategy}) [took ${attemptDuration}ms, interval ${timeSinceLastAttempt}ms]`);

                State.lastAttemptTime = attemptStartTime;
                State.attemptTimestamps.push({
                    attempt: State.detectionAttemptCount,
                    value: result.value,
                    duration: parseFloat(attemptDuration),
                    interval: parseFloat(timeSinceLastAttempt)
                });

                // Check stability
                const stableValue = Calculator.checkValueStability();

                if (stableValue !== null) {
                    Logger.debugLog(`[Credit Tracker for Genspark] ✓ Stable value confirmed: ${stableValue} (adopted after ${State.detectionAttemptCount} attempts)`);

                    // Measurement end (value confirmed)
                    if (State.detectionStartTime > 0) {
                        const totalTime = performance.now() - State.detectionStartTime;
                        Logger.debugLog(`[Credit Tracker for Genspark] 📊 Detection completed - Total: ${totalTime.toFixed(1)}ms`);
                        Logger.printDetectionSummary();
                        State.detectionStartTime = 0;
                    }

                    // Log successful stage
                    const confirmedStageIndex = State.detectedValues.lastIndexOf(stableValue);
                    if (confirmedStageIndex !== -1 && confirmedStageIndex < State.detectedStrategies.length) {
                        const usedStage = State.detectedStrategies[confirmedStageIndex];
                        Logger.logSuccess(usedStage, stableValue);
                    }

                    Storage.processCreditValue(stableValue);
                    State.hasProcessedCurrentPopup = true;
                } else {
                    // Not stable yet
                    Logger.debugLog(`[Credit Tracker for Genspark] Value not stable yet, continuing detection...`);

                    // Trigger next detection
                    if (State.detectionAttemptCount < Config.MAX_DETECTION_ATTEMPTS) {
                        setTimeout(() => {
                            const dummy = document.createElement('span');
                            dummy.style.display = 'none';
                            document.body.appendChild(dummy);
                            document.body.removeChild(dummy);
                        }, Config.DETECTION_INTERVAL);
                    }
                }

            } else {
                // Popup is closed or hidden
                if (State.isPopupOpen && !State.isClosing) {
                    State.detectedStrategies = [];
                    State.isPopupOpen = false;
                    State.hasProcessedCurrentPopup = false;
                    State.detectionAttemptCount = 0;
                    State.detectedValues = [];
                    State.detectedStrategies = [];
                    State.lastCloseTime = Date.now();

                    // Measurement end (fallback close)
                    if (State.detectionStartTime > 0) {
                        const totalTime = performance.now() - State.detectionStartTime;
                        Logger.debugLog(`[Credit Tracker for Genspark] 📊 Detection ended (popup closed) - Total: ${totalTime.toFixed(1)}ms`);
                        State.detectionStartTime = 0;
                    }

                    Logger.debugLog('[Credit Tracker for Genspark] Popup closed (fallback detection)');
                }
            }

        }, Config.DEBOUNCE_DELAY);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Init Sidebar
    setTimeout(() => UISidebar.tryAddSidebarWithRetry(), 1000);

    // Init Storage Check
    setTimeout(() => Storage.checkStorageUsage(), 5000);
    setInterval(() => Storage.checkStorageUsage(), 3600000);

    // Message Listener
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        // ... any other future message handlers
    });

    // Storage Change Listener for Synchronized Updates
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') return;

        // Relevant keys that should trigger a UI refresh
        const relevantKeys = [
            'latest', 'history', 'renewalDay', 'planStartCredit', 'purchasedCredits',
            'numericDisplayEnabled', 'monthlyPrice', 'decimalPlaces',
            'showDailyStart', 'showCurrentBalance', 'showConsumedToday', 'showSinceLastCheck',
            'showActualPace', 'showTargetPace', 'showDaysAhead', 'showDaysInfo', 'showStatus'
        ];

        const hasRelevantChange = Object.keys(changes).some(key => relevantKeys.includes(key));

        if (hasRelevantChange) {
            Logger.debugLog('[Credit Tracker for Genspark] Storage changed, updating displays');

            // Update sidebar
            if (UISidebar && typeof UISidebar.updateSidebarBalance === 'function') {
                UISidebar.updateSidebarBalance();
            }

            // Update embedded tracker (with glow if latest count changed)
            if (UIEchembedded && typeof UIEchembedded.updateEmbeddedTracker === 'function') {
                const triggerGlow = !!changes.latest;
                UIEchembedded.updateEmbeddedTracker(triggerGlow);
            }
        }
    });

})();
