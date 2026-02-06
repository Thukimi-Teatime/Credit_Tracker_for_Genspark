// ========================================
// Initialization
// ========================================

// Global namespace for the extension
window.GensparkTracker = window.GensparkTracker || {};

// Initialize sub-namespaces
window.GensparkTracker.Utils = window.GensparkTracker.Utils || {};
window.GensparkTracker.Modules = window.GensparkTracker.Modules || {};
window.GensparkTracker.UI = window.GensparkTracker.UI || {};

// Shared state
window.GensparkTracker.State = {
    isDebugMode: false,
    isProcessing: false,
    isPopupOpen: false,
    hasProcessedCurrentPopup: false,
    isClosing: false,
    lastCloseTime: 0,
    lastProcessedCount: null,
    retryCount: 0,
    detectionAttemptCount: 0,
    detectedValues: [],
    detectedStrategies: [],
    detectionStartTime: 0,
    lastAttemptTime: 0,
    attemptTimestamps: [],
    lastStorageWarning: 0,
    sidebarInitialLoadComplete: false,
    sidebarRetryCount: 0
};

// Configuration constants
window.GensparkTracker.Config = {
    MAX_RETRIES: 3,
    MAX_DETECTION_ATTEMPTS: 8,
    QUICK_CONFIRM_COUNT: 2,
    ZERO_CONFIRM_COUNT: 4,
    DETECTION_INTERVAL: 200,
    DEBOUNCE_DELAY: 300,
    STORAGE_WARNING_INTERVAL: 3600000,
    MAX_SIDEBAR_RETRIES: 5
};

console.log("[Credit Tracker for Genspark] Content script initialized");
