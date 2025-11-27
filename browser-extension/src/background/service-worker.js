/**
 * Background service worker
 * Handles extension lifecycle and badge updates
 */

console.log('[AI Governance] Background service worker loaded');

// Track stats
let stats = {
  promptsMonitored: 0,
  piiBlocked: 0,
  variantsUsed: 0
};

// Load stats from storage on startup
chrome.storage.local.get(['stats', 'lastStatsReset'], (result) => {
  if (result.stats) {
    stats = result.stats;
  }
  resetDailyStats();
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[AI Governance] Message received:', message);

  switch (message.type) {
    case 'PROMPT_MONITORED':
      stats.promptsMonitored++;
      saveStats();
      updateBadge();
      break;
    
    case 'PII_BLOCKED':
      stats.piiBlocked++;
      saveStats();
      updateBadge();
      break;
    
    case 'VARIANT_USED':
      stats.variantsUsed++;
      saveStats();
      updateBadge();
      break;
    
    case 'GET_STATS':
      sendResponse(stats);
      break;
  }

  return true;
});

function saveStats() {
  chrome.storage.local.set({ stats: stats });
}

function updateBadge() {
  chrome.action.setBadgeText({ 
    text: stats.promptsMonitored > 0 ? stats.promptsMonitored.toString() : '' 
  });
  chrome.action.setBadgeBackgroundColor({ color: '#2563eb' });
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[AI Governance] Extension installed');
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/popup/popup.html')
    });
  }
});

function resetDailyStats() {
  chrome.storage.local.get(['lastStatsReset'], (result) => {
    const now = new Date();
    const lastReset = result.lastStatsReset ? new Date(result.lastStatsReset) : null;
    
    if (!lastReset || lastReset.getDate() !== now.getDate()) {
      stats = {
        promptsMonitored: 0,
        piiBlocked: 0,
        variantsUsed: 0
      };
      chrome.storage.local.set({ 
        stats: stats,
        lastStatsReset: now.toISOString() 
      });
      updateBadge();
    }
  });
}

setInterval(resetDailyStats, 60 * 60 * 1000);