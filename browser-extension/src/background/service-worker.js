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

    case 'PROXY_API_REQUEST':
      handleApiRequest(message.data)
        .then(response => sendResponse({ success: true, data: response }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep channel open for async response
  }

  return true;
});

async function handleApiRequest(requestData) {
  const { endpoint, options, config } = requestData;
  const url = `${config.API_URL}${endpoint}`;
  
  console.log('[AI Governance] ===== PROXY REQUEST =====');
  console.log('[AI Governance] URL:', url);
  console.log('[AI Governance] Method:', options.method || 'GET');
  if (options.body) {
    console.log('[AI Governance] Body:', JSON.parse(options.body));
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': config.API_KEY,
    ...options.headers
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    console.log('[AI Governance] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI Governance] Response error:', errorText);
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[AI Governance] Response data:', data);
    return data;
  } catch (error) {
    console.error('[AI Governance] Proxy request failed:', error);
    throw error;
  }
}

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