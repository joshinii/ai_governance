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
    url: 'https://surrey-tide-neutral-presence.trycloudflare.com'
  });
});

// Test connection button
document.getElementById('test-connection').addEventListener('click', async () => {
  const button = document.getElementById('test-connection');
  button.textContent = 'Testing...';
  button.disabled = true;

  try {
    const response = await fetch('https://blah-subsequent-personal-synthetic.trycloudflare.com/health', {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      alert('✅ Backend connection successful!\n\nStatus: ' + data.status);
    } else {
      alert('❌ Backend connection failed!\n\nStatus: ' + response.status);
    }
  } catch (error) {
    alert('❌ Cannot reach backend!\n\nMake sure backend is running on https://blah-subsequent-personal-synthetic.trycloudflare.com\n\nError: ' + error.message);
  } finally {
    button.textContent = 'Test Backend Connection';
    button.disabled = false;
  }
});

// Login button
document.getElementById('login-button').addEventListener('click', async () => {
  const button = document.getElementById('login-button');
  button.textContent = 'Logging in...';
  button.disabled = true;

  try {
    // Send message to background script to trigger Auth0 login
    const result = await chrome.runtime.sendMessage({ type: 'AUTH0_LOGIN' });

    if (result.success) {
      alert('✅ Login successful!\n\nYou can now use the extension.');
      loadStats();
    } else {
      alert('❌ Login failed!\n\nError: ' + result.error);
    }
  } catch (error) {
    alert('❌ Login error!\n\nError: ' + error.message);
  } finally {
    button.textContent = 'Login with Auth0';
    button.disabled = false;
  }
});

// Logout button
document.getElementById('logout-button').addEventListener('click', async () => {
  const button = document.getElementById('logout-button');
  button.textContent = 'Logging out...';
  button.disabled = true;

  try {
    // Send message to background script to trigger logout
    await chrome.runtime.sendMessage({ type: 'AUTH0_LOGOUT' });
    alert('✅ Logged out successfully!');
    updateAuthUI();
    loadStats();
  } catch (error) {
    alert('❌ Logout error!\n\nError: ' + error.message);
  } finally {
    button.textContent = 'Logout';
    button.disabled = false;
  }
});

// Update UI based on authentication status
async function updateAuthUI() {
  try {
    const isAuthenticated = await chrome.runtime.sendMessage({ type: 'IS_AUTHENTICATED' });
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const userInfo = document.getElementById('user-info');

    if (isAuthenticated.authenticated) {
      loginButton.style.display = 'none';
      logoutButton.style.display = 'block';
      if (isAuthenticated.userInfo) {
        userInfo.textContent = `Logged in as: ${isAuthenticated.userInfo.email}`;
        userInfo.style.display = 'block';
      }
    } else {
      loginButton.style.display = 'block';
      logoutButton.style.display = 'none';
      userInfo.style.display = 'none';
    }
  } catch (error) {
    console.error('Failed to update auth UI:', error);
  }
}

// Update auth UI on load
updateAuthUI();

// Settings link
document.getElementById('settings-link').addEventListener('click', (e) => {
  e.preventDefault();
  alert('Settings panel coming soon!\n\nFor now, edit config.js to change settings.');
});

// Load stats on popup open
loadStats();

// Refresh stats every 2 seconds while popup is open
setInterval(loadStats, 2000);
