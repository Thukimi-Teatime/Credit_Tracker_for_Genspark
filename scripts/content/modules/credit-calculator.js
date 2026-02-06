// ========================================
// Credit Calculator Module
// ========================================

(function () {
    const Logger = window.GensparkTracker.Utils.Logger;
    const State = window.GensparkTracker.State;
    const Config = window.GensparkTracker.Config;

    const Calculator = {
        /**
         * Robust function to get credit value
         * Tries multiple strategies and uses the first successful one
         */
        getCreditValue: function () {
            const self = this;
            const strategies = [
                // Strategy 1: Direct Strategy (Current UI)
                // Targets specifically '.credit-left-item' and its value-containing child.
                () => {
                    const container = document.querySelector('.credit-left-item');
                    if (!container) return null;

                    // Try to get the second child (typical for current UI)
                    const valueElement = container.children[1] || container.querySelector('span:last-child');
                    if (!valueElement) return null;

                    const text = valueElement.innerText || valueElement.textContent;
                    return self.parseAndValidateCreditValue(text);
                },

                // Strategy 2: Container Text Strategy (UI Update Resilience)
                // Extracts numbers from the known container regardless of internal structure.
                () => {
                    const container = document.querySelector('.credit-left-item');
                    if (!container) return null;

                    const allText = container.innerText || container.textContent;
                    if (!allText) return null;

                    // Extract all numbers and pick the most likely credit candidate
                    const matches = allText.match(/\d+/g);
                    if (!matches || matches.length === 0) return null;

                    const numbers = matches.map(m => parseInt(m, 10)).filter(n => !isNaN(n));
                    // Credits are usually the primary/largest number in this small container
                    return Math.max(...numbers);
                },

                // Strategy 3: Global Keyword Strategy (UI Redesign Resilience)
                // Searches for price/credit related keywords across the entire sidebar/header.
                () => {
                    const keywords = ['credit', 'balance', 'remain'];
                    const selector = keywords.map(kw => `[class*="${kw}"], [id*="${kw}"]`).join(', ');
                    const possibleContainers = document.querySelectorAll(selector);

                    for (const container of possibleContainers) {
                        const text = container.innerText || container.textContent;
                        if (!text) continue;

                        const parsed = self.parseAndValidateCreditValue(text);
                        // Filter for "reasonable" values to avoid picking IDs or random UI numbers
                        if (parsed !== null && parsed >= 0 && parsed < 1000000) {
                            return parsed;
                        }
                    }
                    return null;
                }
            ];

            // Try stages in order
            for (let i = 0; i < strategies.length; i++) {
                const stageNum = i + 1;
                try {
                    Logger.debugLog(`[Credit Tracker for Genspark] Attempting Stage ${stageNum}...`);
                    const result = strategies[i]();

                    // Allow 0 as valid value
                    if (result !== null && result !== undefined && result >= 0) {
                        Logger.logSuccess(stageNum, result);
                        return { value: result, strategy: stageNum };
                    }
                } catch (error) {
                    // Try next stage even if error occurs
                    Logger.logError(stageNum, error);
                }
            }

            // All stages failed
            Logger.logFailure();
            return null;
        },

        /**
         * Extract number from text and validate
         */
        parseAndValidateCreditValue: function (text) {
            if (!text || typeof text !== 'string') return null;

            // Remove commas, spaces, other separators
            const cleaned = text.replace(/[,\s]/g, '');

            // Extract numbers only
            const numberMatch = cleaned.match(/\d+/);
            if (!numberMatch) return null;

            const value = parseInt(numberMatch[0], 10);

            // Validation
            if (isNaN(value)) return null;
            if (value < 0) return null;
            if (value > 10000000) return null;

            return value;
        },

        /**
         * Check valid stability and return confirmed value
         * Prioritize non-zero values
         * @returns {number|null} Confirmed value or null if unstable
         */
        checkValueStability: function () {
            const detectedValues = State.detectedValues;
            const detectedStrategies = State.detectedStrategies;
            const detectionAttemptCount = State.detectionAttemptCount;

            if (detectedValues.length === 0) {
                return null;
            }

            const lastValue = detectedValues[detectedValues.length - 1];
            const hasNonZero = detectedValues.some(v => v > 0);

            // Priority 1: Non-zero value 2 times in a row -> Immediate confirmation
            if (lastValue > 0 && detectedValues.length >= Config.QUICK_CONFIRM_COUNT) {
                const lastN = detectedValues.slice(-Config.QUICK_CONFIRM_COUNT);
                const allSame = lastN.every(v => v === lastValue);

                if (allSame) {
                    Logger.debugLog(`[Credit Tracker for Genspark] → Non-zero value (${lastValue}) detected ${Config.QUICK_CONFIRM_COUNT} times consecutively`);
                    return lastValue;
                }
            }

            // Priority 2: If non-zero value exists in array, prioritize it
            if (hasNonZero) {
                // Extract non-zero values only
                const nonZeroValues = detectedValues.filter(v => v > 0);

                Logger.debugLog(`[Credit Tracker for Genspark] → Non-zero values detected: [${nonZeroValues.join(', ')}]`);

                // If non-zero value appears 2 or more times
                if (nonZeroValues.length >= Config.QUICK_CONFIRM_COUNT) {
                    const lastNonZero = nonZeroValues[nonZeroValues.length - 1];
                    const lastTwoNonZero = nonZeroValues.slice(-Config.QUICK_CONFIRM_COUNT);

                    if (lastTwoNonZero.length === Config.QUICK_CONFIRM_COUNT && lastTwoNonZero.every(v => v === lastNonZero)) {
                        Logger.debugLog(`[Credit Tracker for Genspark] → Non-zero value (${lastNonZero}) confirmed ${Config.QUICK_CONFIRM_COUNT} times (ignoring previous zeros)`);
                        return lastNonZero;
                    }
                }

                // Max attempts reached and at least one non-zero -> adopt last non-zero
                if (detectionAttemptCount >= Config.MAX_DETECTION_ATTEMPTS && nonZeroValues.length >= 1) {
                    const lastNonZero = nonZeroValues[nonZeroValues.length - 1];
                    Logger.debugLog(`[Credit Tracker for Genspark] → Max attempts reached, adopting last non-zero value: ${lastNonZero}`);
                    return lastNonZero;
                }
            }

            // Priority 3: Final judgment when max attempts reached
            if (detectionAttemptCount >= Config.MAX_DETECTION_ATTEMPTS) {
                Logger.debugLog(`[Credit Tracker for Genspark] → Max attempts reached, performing final judgment`);
                Logger.debugLog(`[Credit Tracker for Genspark] → Detected values: [${detectedValues.join(', ')}]`);

                // If non-zero never appeared
                if (!hasNonZero) {
                    // If zero continued for 4+ times, adopt zero
                    if (detectedValues.length >= Config.ZERO_CONFIRM_COUNT) {
                        const zeroCount = detectedValues.filter(v => v === 0).length;

                        if (zeroCount >= Config.ZERO_CONFIRM_COUNT) {
                            Logger.debugLog(`[Credit Tracker for Genspark] → Zero detected ${zeroCount} times (no non-zero detected)`);
                            Logger.debugLog(`[Credit Tracker for Genspark] → Zero is considered valid, will be saved`);
                            return 0;
                        }
                    }

                    // Adopt most frequent value
                    const frequencyMap = {};
                    detectedValues.forEach(v => {
                        frequencyMap[v] = (frequencyMap[v] || 0) + 1;
                    });

                    let maxFreq = 0;
                    let mostFrequentValue = null;

                    for (const [value, freq] of Object.entries(frequencyMap)) {
                        if (freq > maxFreq) {
                            maxFreq = freq;
                            mostFrequentValue = parseInt(value);
                        }
                    }

                    if (mostFrequentValue !== null && maxFreq >= 2) {
                        Logger.debugLog(`[Credit Tracker for Genspark] → Most frequent value: ${mostFrequentValue} (appeared ${maxFreq} times)`);
                        return mostFrequentValue;
                    }
                }

                Logger.debugLog(`[Credit Tracker for Genspark] → No stable value found`);
                return null;
            }

            // Not stable yet
            Logger.debugLog(`[Credit Tracker for Genspark] → Value not stable yet (${detectedValues.length} values collected)`);
            return null;
        }
    };

    window.GensparkTracker.Modules.Calculator = Calculator;

})();
