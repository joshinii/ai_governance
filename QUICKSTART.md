# 🚀 Quick Start Guide - Supermemory Integration

## What Was Built

The AI Governance system now uses **Supermemory** as a knowledge graph to:
1. **Remember** user's previous prompts
2. **Learn** from user's prompt patterns  
3. **Enhance** new prompts with relevant historical context
4. **Improve** prompt quality using AI (Gemini) + context

## For the Next Developer

### Setup (5 minutes)

1. **Get the API keys** from `API_KEYS.md`

2. **Create backend `.env` file**:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env and paste the API keys from API_KEYS.md
   ```

3. **Start the backend**:
   ```bash
   cd backend
   uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

4. **Load the extension** in Chrome:
   - Go to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `browser-extension` folder

5. **Set your email** in the extension popup

### How to Test

1. **Open ChatGPT** (fresh tab)
2. **Type a prompt** (>10 characters): "Tell me about machine learning"
3. **See the modal** with 3 improved variants + Supermemory badge
4. **Select a variant** or keep original
5. **Check backend logs** for `===== /prompt-variants/log ENDPOINT CALLED =====`
6. **Check Supermemory dashboard**: https://console.supermemory.ai

### Supported Platforms

- ✅ ChatGPT (`chat.openai.com`)
- ✅ Google Gemini (`gemini.google.com`)  
- ✅ Claude (`claude.ai`)

### Key Files Modified

**Backend**:
- `app/core/config.py` - Removed hardcoded keys ⚠️
- `app/core/knowledge_graph.py` - **NEW** Supermemory client
- `app/core/llm_service.py` - Enhanced with context
- `app/api/routes/prompts.py` - Search + store logic

**Extension**:
- `src/shared/variant-modal.js` - Supermemory status UI
- `src/shared/api-client.js` - Extension context fix
- `src/shared/content-core.js` - Better selector handling

### Debugging

**Backend not seeing requests?**
```bash
# Check which terminal has the active backend
# Look for: "Application startup complete"
```

**Extension errors?**
```
# Open browser console (F12) on ChatGPT
# Look for: [AI Governance] logs
# Check service worker: chrome://extensions → "service worker"
```

**Memory not storing?**
```bash
# Check backend logs for:
# DEBUG: ===== SUPERMEMORY ADD MEMORY =====
# Look for containerTag: user_at_example_dot_com
```

### Important Notes

⚠️ **After reloading extension**: Close and reopen all AI chat tabs  
⚠️ **Supermemory requires**: Email format: `user_at_example_dot_com` (not `user@example.com`)  
⚠️ **Backend requires**: Both `SUPERMEMORY_API_KEY` and `GEMINI_API_KEY` in `.env`

### What to Work On Next

1. **SSO**: Replace manual email with OAuth2
2. **Dashboard**: Add Supermemory analytics and memory management
3. **Deployment**: 
   - Set up Cloud Run / App Engine
   - Migrate secrets to cloud secret manager
   - Set up CI/CD pipeline
   - Configure production database

### Documentation

- **Full technical docs**: `SUPERMEMORY_HANDOFF.md`
- **API keys**: `API_KEYS.md` (keep secure!)
- **Current status**: Everything working ✅

### Questions?

Check the DEBUG logs first:
- **Backend**: Look for `DEBUG:` lines
- **Browser**: Look for `[AI Governance]` logs  
- **Supermemory**: Check https://console.supermemory.ai

Good luck! 🚀

---
**Last tested**: ChatGPT, Gemini, Claude - Nov 30, 2025
