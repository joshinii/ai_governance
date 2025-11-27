# AI Governance Browser Extension

Chrome extension that monitors AI tool usage, detects PII, and improves prompt quality for enterprises.

## Features

✅ **AI Tool Monitoring**
- ChatGPT (full support)
- Claude (full support)  
- Gemini (basic)
- Copilot (basic)

✅ **PII Detection** (Client-side)
- Emails, phone numbers, SSN, credit cards
- API keys, IP addresses
- Personal names
- Blocks high-risk prompts before submission

✅ **Prompt Improvements**
- Generates 3 improved variants
- Shows quality scores
- Lets user pick best version
- Tracks adoption rate

✅ **Usage Logging**
- Logs all AI interactions
- Sends data to backend
- Creates compliance alerts

## Prerequisites

- Chrome or Edge browser
- Backend running on `http://localhost:8000`
- Dashboard running on `http://localhost:3000`

## Installation

### Option 1: Load Unpacked (Development)

1. Extract the extension folder
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `browser-extension` folder
6. Extension is now installed!

### Option 2: Package as CRX (Distribution)

```bash
# In Chrome, go to chrome://extensions/
# Click "Pack extension"
# Select browser-extension folder
# Creates .crx file for distribution
```

## Configuration

Edit `config.js` before loading:

```javascript
const CONFIG = {
  API_URL: 'http://localhost:8000',  // Your backend URL
  API_KEY: 'your-api-key',           // Match backend API_KEY_SECRET
  USER_EMAIL: 'user@company.com',    // User's email
  ORG_ID: 1
};
```

## Usage

### First Time Setup

1. Install extension
2. Visit ChatGPT or Claude
3. Extension icon shows monitoring is active
4. Try typing a prompt with PII (e.g., "My email is test@example.com")
5. Should see PII warning

### Testing Prompt Improvements

1. Go to ChatGPT
2. Type a vague prompt: "make this better"
3. Click Send
4. Modal appears with 3 improved variants
5. Choose one or keep original
6. Prompt is submitted

### Viewing Stats

1. Click extension icon in toolbar
2. See today's stats:
   - Prompts monitored
   - PII blocked
   - Improvements used
3. Click "View Dashboard" to see full analytics
4. Click "Test Connection" to verify backend

## How It Works

```
User types prompt → Extension intercepts
                    ↓
              Check for PII
                    ↓
         (if high-risk → BLOCK)
                    ↓
       Call backend for variants
                    ↓
          Show modal with 3 options
                    ↓
          User picks variant
                    ↓
           Log to backend
                    ↓
          Submit to AI tool
```

## Architecture

```
browser-extension/
├── manifest.json          # Extension config
├── config.js             # User configuration
├── src/
│   ├── background/
│   │   └── service-worker.js    # Background tasks
│   ├── content/
│   │   ├── chatgpt.js          # ChatGPT integration
│   │   ├── claude.js           # Claude integration
│   │   ├── gemini.js           # Gemini (basic)
│   │   └── copilot.js          # Copilot (basic)
│   ├── shared/
│   │   ├── pii-detector.js     # PII detection logic
│   │   ├── api-client.js       # Backend API calls
│   │   └── variant-modal.js    # UI for variants
│   └── popup/
│       ├── popup.html          # Extension popup UI
│       ├── popup.css
│       └── popup.js
└── icons/                      # Extension icons
```

## Supported AI Tools

### Full Support
- ✅ **ChatGPT** (chat.openai.com) - Fully tested
- ✅ **Claude** (claude.ai) - Fully tested

### Basic Support (Needs Enhancement)
- ⚠️ **Gemini** (gemini.google.com) - Placeholder
- ⚠️ **Copilot** (copilot.microsoft.com) - Placeholder

## Development

### Testing Locally

1. Make changes to files
2. Go to `chrome://extensions/`
3. Click reload icon on extension card
4. Refresh AI tool page
5. Test changes

### Debugging

**View logs:**
- Open DevTools (F12) on AI tool page
- Go to Console tab
- Filter by "[AI Governance]"

**Common issues:**

**"Backend connection failed":**
- Ensure backend is running: `docker-compose up`
- Check API_URL in config.js
- Verify API_KEY matches backend

**"PII not detected":**
- Check console for errors
- Verify PII patterns in pii-detector.js

**"Modal not showing":**
- Check if prompt is > 10 characters
- Verify FEATURES.PROMPT_VARIANTS is true
- Check backend /prompt-variants endpoint

**"Not intercepting prompts":**
- AI site may have changed UI
- Check selectors in content script
- Open issue with screenshot

## Customization

### Add New PII Pattern

Edit `src/shared/pii-detector.js`:

```javascript
this.patterns = {
  // Add new pattern
  customID: {
    regex: /\b[A-Z]{2}\d{6}\b/g,
    type: 'Custom ID',
    risk: 'medium'
  }
};
```

### Change Modal Styling

Edit `src/shared/variant-modal.js`, look for `_injectStyles()` method.

### Add New AI Tool

1. Create `src/content/newtool.js`
2. Copy from `chatgpt.js`
3. Update selectors for new tool
4. Add to `manifest.json` content_scripts

## API Endpoints Used

- `POST /usage-logs/` - Log AI usage
- `POST /prompt-variants/` - Get improved prompts
- `POST /prompt-variants/log` - Log variant choice
- `POST /alerts` - Create compliance alert
- `GET /policies/{org_id}` - Get policies

## Security & Privacy

✅ **Client-side PII detection** - No sensitive data sent to backend for detection  
✅ **Prompt hashing** - Only SHA-256 hash stored, not full text  
✅ **No tracking** - Extension doesn't track browsing  
✅ **Local processing** - PII detection runs in browser  

## Performance

- **PII Detection**: ~5-10ms
- **Variant Generation**: ~100-200ms (cached: ~5ms)
- **Modal Display**: ~50ms
- **Total Overhead**: ~200-300ms per prompt

## Troubleshooting

### Extension Not Loading

- Check if Developer Mode is enabled
- Verify manifest.json has no errors
- Look for errors in chrome://extensions/

### Can't Connect to Backend

```bash
# Test backend manually
curl http://localhost:8000/health \
  -H "X-API-Key: dev-secret-key-change-in-production"

# Should return: {"status": "healthy"}
```

### UI Not Appearing on AI Site

- ChatGPT/Claude frequently update their UI
- Selectors may need updating
- Check browser console for errors

## Production Deployment

### For IT Teams

1. Update `config.js` with production settings:
   - Set production API URL
   - Set production API key
   - Remove debug logging

2. Package extension:
   - Create .crx file
   - Sign with enterprise certificate
   - Distribute via Chrome Web Store or Enterprise Policy

3. Deploy via Google Workspace:
   - Use managed Chrome policy
   - Force install for all users
   - Control permissions centrally

### Chrome Web Store Publishing

1. Create developer account ($5 fee)
2. Package extension as ZIP
3. Upload to Chrome Web Store
4. Wait for review (1-3 days)
5. Publish to organization only (unlisted)

## Browser Support

- ✅ Chrome 90+
- ✅ Edge 90+ (Chromium-based)
- ❌ Firefox (would need separate manifest v2)
- ❌ Safari (would need different approach)

## Known Limitations

- Only works on specific AI tool domains
- Doesn't monitor API usage (only web UI)
- ChatGPT/Claude UI changes may break selectors
- Can't monitor embedded AI tools
- Requires backend to be accessible

## Future Enhancements

- [ ] Offline mode with cached policies
- [ ] Firefox support
- [ ] More granular policy controls
- [ ] Real-time dashboard sync
- [ ] Keyboard shortcuts
- [ ] Dark mode
- [ ] Multi-language support

## License

Proprietary - Internal Use Only

## Support

For issues:
1. Check browser console logs
2. Test backend connection
3. Verify configuration
4. Open issue with details
