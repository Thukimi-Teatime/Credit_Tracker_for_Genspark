// ========================================
// Storage Module
// ========================================

(function () {
    const State = window.GensparkTracker.State;
    const Config = window.GensparkTracker.Config;
    const Logger = window.GensparkTracker.Utils.Logger;
    const UI = window.GensparkTracker.UI; // Note: UI modules might load later, careful with immediate access

    const Storage = {
        // Credit value processing (duplicate check and save)
        processCreditValue: function (count) {
            if (State.lastProcessedCount === count) {
                return;
            }

            State.isProcessing = true;
            State.lastProcessedCount = count;

            this.saveCredit(count, () => {
                State.isProcessing = false;
            });
        },

        saveCredit: function (currentCount, callback) {
            // Allow saving 0 as well
            chrome.storage.local.get({
                history: [],
                latest: null,
                previousBalance: null
            }, (data) => {
                if (chrome.runtime.lastError) {
                    console.error('[Credit Tracker for Genspark] Storage get failed:', chrome.runtime.lastError);
                    if (callback) callback();
                    return;
                }

                if (data.latest && data.latest.count === currentCount) {
                    if (callback) callback();
                    return;
                }

                let history = data.history;
                const now = new Date();
                const todayStr = now.toLocaleDateString();
                const fullTimeStr = now.toLocaleString();

                let newPreviousBalance = data.latest ? data.latest.count : null;

                const latestData = { time: fullTimeStr, count: currentCount };

                let updatedHistory = [...history];
                let isFirstToday = true;

                if (history.length > 0) {
                    try {
                        const lastEntryTime = history[0].time;
                        const lastEntryDate = lastEntryTime.includes(' ')
                            ? lastEntryTime.split(' ')[0]
                            : lastEntryTime.split('T')[0];

                        if (lastEntryDate === todayStr) {
                            isFirstToday = false;
                        }
                    } catch (error) {
                        // Note: Logger might not be fully initialized if called too early, but usually fine
                        if (Logger) Logger.debugWarn('[Credit Tracker for Genspark] Date parsing error:', error);
                        isFirstToday = true;
                    }
                }

                if (isFirstToday) {
                    updatedHistory.unshift({ time: fullTimeStr, count: currentCount });
                    if (updatedHistory.length > 50) updatedHistory.pop();
                }

                const dataToSave = {
                    history: updatedHistory,
                    latest: latestData,
                    previousBalance: newPreviousBalance
                };

                const estimatedSize = JSON.stringify(dataToSave).length;
                const maxSize = 5 * 1024 * 1024;

                if (estimatedSize > maxSize * 0.9) {
                    if (Logger) Logger.debugWarn('[Credit Tracker for Genspark] Storage nearly full, trimming history');
                    updatedHistory = updatedHistory.slice(0, 30);
                    dataToSave.history = updatedHistory;
                }

                chrome.storage.local.set(dataToSave, () => {
                    if (chrome.runtime.lastError) {
                        console.error('[Credit Tracker for Genspark] Storage save failed:', chrome.runtime.lastError);

                        if (Logger) Logger.debugLog('[Credit Tracker for Genspark] Attempting to save with reduced history...');

                        const reducedData = {
                            history: updatedHistory.slice(0, 10),
                            latest: latestData,
                            previousBalance: newPreviousBalance
                        };

                        chrome.storage.local.set(reducedData, () => {
                            if (chrome.runtime.lastError) {
                                console.error('[Credit Tracker for Genspark] Retry also failed:', chrome.runtime.lastError);
                                chrome.storage.local.set({ latest: latestData }, () => {
                                    if (chrome.runtime.lastError) {
                                        console.error('[Credit Tracker for Genspark] Critical: Cannot save any data');
                                    }
                                });
                            }
                            if (callback) callback();
                        });
                        return;
                    }
                    if (callback) callback();
                });
            });
        },

        checkStorageUsage: function () {
            chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
                if (chrome.runtime.lastError) {
                    console.error('[Credit Tracker for Genspark] Failed to check storage usage:', chrome.runtime.lastError);
                    return;
                }

                const maxBytes = 5 * 1024 * 1024;
                const usagePercent = (bytesInUse / maxBytes) * 100;

                if (Logger) Logger.debugLog(`[Credit Tracker for Genspark] Storage usage: ${bytesInUse} bytes (${usagePercent.toFixed(1)}%)`);

                const now = Date.now();
                if (usagePercent > 80 && (now - State.lastStorageWarning) > Config.STORAGE_WARNING_INTERVAL) {
                    if (Logger) Logger.debugWarn('[Credit Tracker for Genspark] Storage usage is high:', usagePercent.toFixed(1) + '%');
                    State.lastStorageWarning = now;

                    chrome.storage.local.get({ history: [] }, (data) => {
                        if (chrome.runtime.lastError) return;

                        const history = data.history;
                        if (history.length > 30) {
                            const trimmedHistory = history.slice(0, 30);
                            chrome.storage.local.set({ history: trimmedHistory }, () => {
                                if (!chrome.runtime.lastError) {
                                    if (Logger) Logger.debugLog('[Credit Tracker for Genspark] Automatically trimmed history to 30 entries');
                                }
                            });
                        }
                    });
                }
            });
        }
    };

    window.GensparkTracker.Utils.Storage = Storage;

})();
