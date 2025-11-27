/**
 * Popup UI script
 * Displays stats and provides controls
 */

// Load stats from background worker
async function loadStats() {
  try {
    const stats = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
    
    document.getElementById('prompts-count').textContent = stats.promptsMonitored || 0;
    document.getElementById('pii-count').textContent = stats.piiBlocked || 0;
    document.getElementById('variants-count').textContent = stats.variantsUsed || 0;
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

// View dashboard button
document.getElementById('view-dashboard').addEventListener('click', () => {
  chrome.tabs.create({
    url: 'http://localhost:3000'
  });
});

// Test connection button
document.getElementById('test-connection').addEventListener('click', async () => {
  const button = document.getElementById('test-connection');
  button.textContent = 'Testing...';
  button.disabled = true;

  try {
    const response = await fetch('http://localhost:8000/health', {
      headers: {
        'X-API-Key': 'dev-secret-key-change-in-production'
      }
    });

    if (response.ok) {
      const data = await response.json();
      alert('✅ Backend connection successful!\n\nStatus: ' + data.status);
    } else {
      alert('❌ Backend connection failed!\n\nStatus: ' + response.status);
    }
  } catch (error) {
    alert('❌ Cannot reach backend!\n\nMake sure backend is running on http://localhost:8000\n\nError: ' + error.message);
  } finally {
    button.textContent = 'Test Backend Connection';
    button.disabled = false;
  }
});

// Settings link
document.getElementById('settings-link').addEventListener('click', (e) => {
  e.preventDefault();
  alert('Settings panel coming soon!\n\nFor now, edit config.js to change settings.');
});

// Load stats on popup open
loadStats();

// Refresh stats every 2 seconds while popup is open
setInterval(loadStats, 2000);
