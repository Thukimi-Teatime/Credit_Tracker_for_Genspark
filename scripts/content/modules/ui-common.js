// ========================================
// UI Common Module
// ========================================

(function () {

    const UI = {
        /**
         * Format credit value based on numeric display settings
         */
        formatCreditValue: function (credits, numericDisplayEnabled, monthlyPrice, planStartCredit, decimalPlaces) {
            if (!numericDisplayEnabled || !monthlyPrice || !planStartCredit || planStartCredit === 0) {
                return `${credits}`;  // Display as credits
            }

            const conversionRate = monthlyPrice / planStartCredit;
            const numericValue = credits * conversionRate;
            return numericValue.toFixed(decimalPlaces);
        },

        /**
         * Format credit value for display
         * @param {number} credits - Credit value
         * @param {boolean} numericEnabled - Numeric Display Mode enabled or not
         * @param {number} conversionRate - Conversion rate (price per credit)
         * @param {number} decimalPlaces - Decimal places (0-4)
         * @returns {string} Formatted string
         */
        formatValue: function (credits, numericEnabled, conversionRate, decimalPlaces) {
            if (!numericEnabled || conversionRate <= 0 || credits === null || credits === undefined) {
                return String(credits);
            }

            const value = credits * conversionRate;
            // Ensure number conversion before calling toFixed
            const decimalPlacesNum = parseInt(decimalPlaces, 10);
            return value.toFixed(decimalPlacesNum);
        }
    };

    window.GensparkTracker.UI.Common = UI;

})();
