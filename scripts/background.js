// Background script to handle extension actions
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openOptionsRemote') {
        chrome.runtime.openOptionsPage();
    }
});
