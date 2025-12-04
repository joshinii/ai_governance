/**
 * Handle Auth0 callback
 * Extract authorization code from URL and send to background script
 */
async function handleCallback() {
    try {
        // Get authorization code from URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        const statusElement = document.getElementById('status');

        if (error) {
            statusElement.textContent = `Error: ${errorDescription || error}`;
            statusElement.className = 'error';
            setTimeout(() => {
                window.close();
            }, 3000);
            return;
        }

        if (!code) {
            statusElement.textContent = 'No authorization code received';
            statusElement.className = 'error';
            setTimeout(() => {
                window.close();
            }, 3000);
            return;
        }

        // Send code to background script for token exchange
        const result = await chrome.runtime.sendMessage({
            type: 'AUTH0_CALLBACK',
            code,
            state
        });

        if (result.success) {
            statusElement.textContent = 'Authentication successful!';
            statusElement.className = 'success';
            setTimeout(() => {
                window.close();
            }, 1500);
        } else {
            statusElement.textContent = `Error: ${result.error || 'Unknown error'}`;
            statusElement.className = 'error';
            setTimeout(() => {
                window.close();
            }, 3000);
        }
    } catch (error) {
        console.error('Callback error:', error);
        const statusElement = document.getElementById('status');
        statusElement.textContent = `Error: ${error.message}`;
        statusElement.className = 'error';
        setTimeout(() => {
            window.close();
        }, 3000);
    }
}

// Handle callback when page loads
window.addEventListener('load', handleCallback);