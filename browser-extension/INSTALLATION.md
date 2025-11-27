# Quick Installation Guide

## Step 1: Configure

Edit `config.js`:

```javascript
const CONFIG = {
  API_URL: 'http://localhost:8000',
  API_KEY: 'dev-secret-key-change-in-production',
  USER_EMAIL: 'test@company.com',  // Change this to your email
  ORG_ID: 1
};
```

## Step 2: Add Icons (Optional)

Place PNG icons in `icons/` folder:
- icon16.png (16x16 pixels)
- icon48.png (48x48 pixels)
- icon128.png (128x128 pixels)

Or skip this - extension works without custom icons.

## Step 3: Load Extension

### Chrome:

1. Open Chrome
2. Go to `chrome://extensions/`
3. Toggle "Developer mode" (top right)
4. Click "Load unpacked"
5. Select this `browser-extension` folder
6. Done!

### Edge:

1. Open Edge
2. Go to `edge://extensions/`
3. Toggle "Developer mode" (left sidebar)
4. Click "Load unpacked"
5. Select this `browser-extension` folder
6. Done!

## Step 4: Test

1. Visit https://chat.openai.com or https://claude.ai
2. Look for extension icon in toolbar
3. Type a prompt
4. Should see interception working

## Step 5: Verify

Click extension icon to see:
- Monitoring status
- Today's stats
- Test connection button

## Troubleshooting

**Extension not loading:**
- Check manifest.json for errors
- Ensure folder structure is correct
- Enable Developer mode

**Can't connect to backend:**
- Ensure backend is running: `docker-compose up`
- Check API_URL in config.js
- Test: `curl http://localhost:8000/health`

**Not intercepting prompts:**
- Check browser console (F12) for errors
- Look for "[AI Governance]" logs
- Make sure you're on supported site

## Next Steps

- Configure backend (see backend/README.md)
- Start dashboard (see dashboard/README.md)
- Test end-to-end workflow
