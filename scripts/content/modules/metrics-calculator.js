// ========================================
// Metrics Calculator Module
// Centralized logic for credit consumption and pace calculations
// ========================================

(function () {
    // Ensure namespace exists
    window.GensparkTracker = window.GensparkTracker || {};
    window.GensparkTracker.Modules = window.GensparkTracker.Modules || {};

    const MetricsCalculator = {
        /**
         * Calculate the plan start date based on renewal day.
         * Logic: If today is before renewal day, start date is renewal day of previous month.
         *        If today is on or after renewal day, start date is renewal day of current month.
         * @param {number} renewalDay - The day of the month when the plan renews.
         * @returns {Date} The calculated plan start date.
         */
        getPlanStartDate: function (renewalDay) {
            const now = new Date();
            let planStart = new Date(now.getFullYear(), now.getMonth(), renewalDay);

            if (now.getDate() < renewalDay) {
                planStart.setMonth(planStart.getMonth() - 1);
            }

            return planStart;
        },

        /**
         * Calculate days elapsed since plan start.
         * Check logic: max(1, ceil(diff / dayMs))
         * @param {Date} planStartDate - The start date of the current cycle.
         * @returns {number} Days elapsed (minimum 1).
         */
        getDaysElapsed: function (planStartDate) {
            const now = new Date();
            const diffTime = now - planStartDate;
            const daysElapsed = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return Math.max(1, daysElapsed);
        },

        /**
         * Calculate actual daily consumption pace.
         * @param {number} totalStartCredit - Total credits at start (Base + Purchased).
         * @param {number} currentCredit - Current remaining credits.
         * @param {number} daysElapsed - Days elapsed in the cycle.
         * @returns {number} Actual pace formatted to 1 decimal place.
         */
        calculateActualPace: function (totalStartCredit, currentCredit, daysElapsed) {
            const consumed = totalStartCredit - currentCredit;
            const actualPace = consumed / daysElapsed;
            return Math.round(actualPace * 10) / 10;
        },

        /**
         * Calculate target daily consumption pace.
         * @param {number} planStartCredit - Base credits for the plan.
         * @param {number} renewalDay - The day of the month when the plan renews.
         * @returns {number} Target pace formatted to 1 decimal place.
         */
        calculateTargetPace: function (planStartCredit, renewalDay) {
            const now = new Date();
            const nextRenewal = new Date(now.getFullYear(), now.getMonth(), renewalDay);
            if (now.getDate() >= renewalDay) {
                nextRenewal.setMonth(nextRenewal.getMonth() + 1);
            }

            const planStart = this.getPlanStartDate(renewalDay);
            const totalDays = Math.ceil((nextRenewal - planStart) / (1000 * 60 * 60 * 24));
            if (totalDays <= 0) return 0;

            const targetPace = planStartCredit / totalDays;
            return Math.round(targetPace * 10) / 10;
        },

        /**
         * Determine the status color and text based on pace difference.
         * @param {number} actualPace 
         * @param {number} targetPace 
         * @returns {Object} { status: string, color: string }
         */
        getPaceStatus: function (actualPace, targetPace) {
            if (targetPace === 0) {
                return { status: 'N/A', color: '#5f6368' };
            }

            const diff = actualPace - targetPace;
            const percentDiff = (diff / targetPace) * 100;

            let status = '';
            let color = '';

            if (percentDiff < -10) {
                status = `🟢 Excellent (Saving ${Math.abs(Math.round(percentDiff))}%)`;
                color = '#34a853';
            } else if (percentDiff < 10) {
                status = '🟢 On Track';
                color = '#34a853';
            } else if (percentDiff < 30) {
                status = `🟡 Slightly Over (+${Math.round(percentDiff)}%)`;
                color = '#fbbc04';
            } else {
                status = `🔴 Over Target (+${Math.round(percentDiff)}%)`;
                color = '#ea4335';
            }

            return { status, color };
        },

        /**
         * Calculate days ahead (+) or behind (-) schedule.
         * @param {number} currentCredit 
         * @param {number} totalStartCredit 
         * @param {number} targetPace 
         * @param {number} daysElapsed 
         * @returns {number} Days difference (positive = ahead, negative = behind).
         */
        getDaysAheadBehind: function (currentCredit, totalStartCredit, targetPace, daysElapsed) {
            if (targetPace === 0) return 0;

            const idealBalanceToday = totalStartCredit - (targetPace * daysElapsed);
            const creditDifference = currentCredit - idealBalanceToday;
            const daysDifference = creditDifference / targetPace;

            return daysDifference;
        },

        /**
         * Get remaining days in the cycle.
         * @param {number} renewalDay 
         * @returns {number} Days remaining (minimum 1).
         */
        getDaysLeft: function (renewalDay) {
            const now = new Date();
            let nextRenewal = new Date(now.getFullYear(), now.getMonth(), renewalDay);
            if (now.getDate() >= renewalDay) {
                nextRenewal.setMonth(nextRenewal.getMonth() + 1);
            }
            return Math.max(1, Math.ceil((nextRenewal - now) / (1000 * 60 * 60 * 24)));
        }
    };

    window.GensparkTracker.Modules.MetricsCalculator = MetricsCalculator;
})();
