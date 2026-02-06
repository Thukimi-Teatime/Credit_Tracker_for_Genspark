// ========================================
// Logging Module
// ========================================

(function () {
    const State = window.GensparkTracker.State;

    // Initialize debug mode from storage
    chrome.storage.local.get({ debugMode: false }, (data) => {
        State.isDebugMode = data.debugMode;
        console.log(`[Credit Tracker for Genspark] Debug mode: ${State.isDebugMode ? 'ON' : 'OFF'}`);
    });

    const Logger = {
        // Debug log helper (with timestamp)
        debugLog: function (...args) {
            if (State.isDebugMode) {
                const elapsed = State.detectionStartTime > 0
                    ? (performance.now() - State.detectionStartTime).toFixed(1)
                    : '0.0';
                console.log(`[+${elapsed}ms]`, ...args);
            }
        },

        debugWarn: function (...args) {
            if (State.isDebugMode) {
                const elapsed = State.detectionStartTime > 0
                    ? (performance.now() - State.detectionStartTime).toFixed(1)
                    : '0.0';
                console.warn(`[+${elapsed}ms]`, ...args);
            }
        },

        logSuccess: function (stageNumber, value) {
            this.debugLog(`[Credit Tracker for Genspark] Stage ${stageNumber} succeeded. Credit: ${value}`);

            // Record successful stage (for statistics)
            chrome.storage.local.get({ stageStats: {}, successHistory: [] }, (data) => {
                if (chrome.runtime.lastError) {
                    this.debugWarn('[Credit Tracker for Genspark] Failed to log success:', chrome.runtime.lastError);
                    return;
                }

                const stats = data.stageStats || {};
                const key = `stage_${stageNumber}`;
                stats[key] = (stats[key] || 0) + 1;
                stats.lastSuccess = {
                    stage: stageNumber,
                    time: new Date().toISOString(),
                    value: value
                };

                const successHistory = data.successHistory || [];
                successHistory.push({
                    stage: stageNumber,
                    time: new Date().toISOString(),
                    value: value
                });

                if (successHistory.length > 100) successHistory.shift();

                chrome.storage.local.set({
                    stageStats: stats,
                    successHistory: successHistory
                });
            });
        },

        logError: function (stageNumber, error) {
            this.debugWarn(`[Credit Tracker for Genspark] Stage ${stageNumber} failed:`, error.message);
        },

        logFailure: function () {
            console.error('[Credit Tracker for Genspark] All stages failed to get credit value');

            // Collect detailed info on failure
            const debugInfo = {
                time: new Date().toISOString(),
                url: window.location.href,
                userAgent: navigator.userAgent,

                // Check existence of each selector
                selectors: {
                    'credit-left-item': !!document.querySelector('.credit-left-item'),
                    'credit-left': !!document.querySelector('.item.credit-left'),
                    'n-popover': !!document.querySelector('.n-popover.n-popover-shared'),
                },

                // HTML of related elements (more detail)
                creditLeftItemHTML: document.querySelector('.credit-left-item')?.outerHTML || 'NOT FOUND',
                creditLeftHTML: document.querySelector('.item.credit-left')?.outerHTML?.substring(0, 2000) || 'NOT FOUND',

                // List of class names on the page (for pattern analysis)
                allClasses: Array.from(document.querySelectorAll('[class*="credit"], [class*="balance"]'))
                    .map(el => el.className)
                    .slice(0, 20), // Max 20
            };

            chrome.storage.local.get({ failureLogs: [] }, (data) => {
                if (chrome.runtime.lastError) {
                    this.debugWarn('[Credit Tracker for Genspark] Failed to log failure:', chrome.runtime.lastError);
                    return;
                }

                const logs = data.failureLogs;
                logs.push(debugInfo);

                // Keep latest 20 entries (increased)
                if (logs.length > 20) logs.shift();

                chrome.storage.local.set({ failureLogs: logs });
            });
        },

        logSidebarSuccess: function (stageNumber) {
            this.debugLog(`[Credit Tracker for Genspark] Sidebar Stage ${stageNumber} stats saved.`);

            // Record successful sidebar stage (for statistics)
            chrome.storage.local.get({ sidebarStageStats: {} }, (data) => {
                const stats = data.sidebarStageStats || {};
                const key = `stage_${stageNumber}`;
                stats[key] = (stats[key] || 0) + 1;
                stats.lastSuccess = {
                    stage: stageNumber,
                    time: new Date().toISOString()
                };

                chrome.storage.local.set({ sidebarStageStats: stats });
            });
        },

        logSidebarFailure: function () {
            const debugInfo = {
                time: new Date().toISOString(),
                url: window.location.href,
                type: 'sidebar_display_failure',

                // Check existence of each stage target
                selectors: {
                    'stage1_footer': !!document.querySelector('.sidebar-footer'),
                    'stage2_sidebar': !!document.querySelector('.sidebar, [class*="sidebar"]'),
                    'stage3_nav': !!document.querySelector('nav, [role="navigation"]'),
                    'footer': !!document.querySelector('footer'),
                },

                // Class names for troubleshooting
                sidebarClasses: Array.from(document.querySelectorAll('[class*="sidebar"]'))
                    .map(el => el.className)
                    .slice(0, 10),
            };

            chrome.storage.local.get({ sidebarFailureLogs: [] }, (data) => {
                if (chrome.runtime.lastError) {
                    this.debugWarn('[Credit Tracker for Genspark] Failed to log sidebar failure:', chrome.runtime.lastError);
                    return;
                }

                const logs = data.sidebarFailureLogs;
                logs.push(debugInfo);

                if (logs.length > 20) logs.shift();
                chrome.storage.local.set({ sidebarFailureLogs: logs });
            });
        },

        printDetectionSummary: function () {
            if (!State.isDebugMode || State.attemptTimestamps.length === 0) return;

            console.group('[Credit Tracker for Genspark] 📊 Detection Summary');

            // Basic info
            console.log(`Total attempts: ${State.attemptTimestamps.length}`);
            console.log(`Detected values: [${State.detectedValues.join(', ')}]`);
            console.log(`Used Stages: [${State.detectedStrategies.join(', ')}]`);

            // Processing time statistics
            const durations = State.attemptTimestamps.map(a => a.duration);
            const intervals = State.attemptTimestamps.map(a => a.interval).filter(i => i > 0);

            const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
            const maxDuration = Math.max(...durations);
            const minDuration = Math.min(...durations);

            console.log(`\nProcessing time per attempt:`);
            console.log(`  Average: ${avgDuration.toFixed(2)}ms`);
            console.log(`  Min: ${minDuration.toFixed(2)}ms`);
            console.log(`  Max: ${maxDuration.toFixed(2)}ms`);

            if (intervals.length > 0) {
                const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
                const maxInterval = Math.max(...intervals);
                const minInterval = Math.min(...intervals);

                console.log(`\nInterval between attempts:`);
                console.log(`  Average: ${avgInterval.toFixed(1)}ms`);
                console.log(`  Min: ${minInterval.toFixed(1)}ms`);
                console.log(`  Max: ${maxInterval.toFixed(1)}ms`);
            }

            // Detailed table
            console.log(`\nDetailed breakdown:`);
            console.table(State.attemptTimestamps.map(a => ({
                'Attempt': a.attempt,
                'Value': a.value !== null ? a.value : 'null',
                'Duration (ms)': a.duration.toFixed(2),
                'Interval (ms)': a.interval.toFixed(1)
            })));

            console.groupEnd();
        }
    };

    // Expose to global namespace
    window.GensparkTracker.Utils.Logger = Logger;

})();
