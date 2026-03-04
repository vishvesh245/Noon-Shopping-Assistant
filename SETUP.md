# 🛠️ Setup Guide

How to run Noon Shopping Assistant locally using your own Anthropic API key.

---

## Prerequisites

- Google Chrome browser
- An Anthropic API key — get one at [console.anthropic.com](https://console.anthropic.com)

---

## Steps

### 1. Clone the repo

```bash
git clone https://github.com/vishveshpandya/noon-shopping-assistant.git
cd noon-shopping-assistant
```

### 2. Add your API key

Open `src/content.js` and find line ~1048:

```js
const CLAUDE_API_KEY = "YOUR_API_KEY_HERE";
```

Replace `YOUR_API_KEY_HERE` with your actual Anthropic API key.

> ⚠️ **Never commit your API key to GitHub.** If you fork this repo, make sure your key is replaced or gitignored before pushing.

### 3. Load the extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top right)
3. Click **Load unpacked**
4. Select the root `noon-shopping-assistant/` folder
5. The extension will appear in your Chrome toolbar

### 4. Use it

1. Go to [noon.com](https://www.noon.com/uae-en/)
2. The chat bubble will appear in the bottom-right corner
3. Click it and start shopping

---

## Troubleshooting

**"API key not set" error**
You haven't replaced the placeholder in `src/content.js`. Double-check step 2.

**"Claude API error 401"**
Your API key is invalid or has been revoked. Generate a new one at [console.anthropic.com](https://console.anthropic.com) → API Keys.

**"Claude API error 429"**
You've hit Anthropic's rate limit or run out of credits. Check your usage at [console.anthropic.com](https://console.anthropic.com) → Billing.

**Extension not showing on noon.com**
Make sure the extension is enabled in `chrome://extensions/` and that you're on `https://www.noon.com/uae-en/` (not a subdomain or country variant outside UAE).

**After editing `content.js`, changes aren't reflected**
Go to `chrome://extensions/` and click the refresh icon on the extension card, then reload the noon.com tab.

---

## Notes on the API key

This extension calls the Anthropic API directly from the browser. That's intentional — no backend, no server, no infra costs. The `anthropic-dangerous-direct-browser-access` header is required for this to work and is an officially supported Anthropic feature for browser-based integrations.

Your API key is stored only in the local source file and is never transmitted anywhere except directly to `api.anthropic.com`.
