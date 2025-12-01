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
  // Scroll to settings
  document.querySelector('.settings-section').scrollIntoView({ behavior: 'smooth' });
});

// Load user email
async function loadEmail() {
  chrome.storage.local.get(['userEmail'], (result) => {
    if (result.userEmail) {
      document.getElementById('user-email').value = result.userEmail;
    }
  });
}

// Save user email
document.getElementById('save-email').addEventListener('click', () => {
  const email = document.getElementById('user-email').value.trim();
  const status = document.getElementById('save-status');
  
  if (!email) {
    status.textContent = 'Please enter a valid email';
    status.style.color = '#dc2626';
    return;
  }
  
  chrome.storage.local.set({ userEmail: email }, () => {
    status.textContent = 'Email saved successfully!';
    status.style.color = '#10b981';
    
    // Clear status after 2 seconds
    setTimeout(() => {
      status.textContent = '';
    }, 2000);
  });
});

// Load stats and email on popup open
loadStats();
loadEmail();

// Refresh stats every 2 seconds while popup is open
setInterval(loadStats, 2000);
