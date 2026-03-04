🛍️ Noon Shopping Assistant

An AI-powered Chrome Extension that lives on noon.com — find products, compare deals, and get instant summaries through conversation.

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Live-brightgreen?logo=googlechrome)](https://chromewebstore.google.com/detail/ahmddkhlmakehabmgelljlpehomepmhj)
[![Version](https://img.shields.io/badge/version-1.2.1-blue)](CHANGELOG.md)
[![Built by a PM](https://img.shields.io/badge/Built%20by%20a-Product%20Manager-orange)](#about)



The Problem

noon.com has millions of products. Finding the right one means drowning in search results, jumping between tabs to compare specs, reading hundreds of reviews, and still not being sure if you're getting a good deal.

Most people either give up or buy something they're not confident about.

The Solution

Noon Shopping Assistant brings a Claude AI-powered chat panel directly onto noon.com. You just talk to it — and it finds, compares, and summarises products for you without you ever leaving the page.





✨ Key Features

Feature
What it does
🔍 Conversational Search
Ask in plain language — "best noise-cancelling headphones under AED 500" — and get real noon products back
⚖️ Smart Comparison
Type "compare iPhone 15 and Samsung S24" or select any 2–4 products manually — get a side-by-side spec breakdown with an AI verdict
✦ AI Product Summary
Tap ✦ on any card to get an instant summary of specs, reviews, and whether it's worth buying
⚡ Live Deal Discovery
Finds Mega Deals, Flash Deals, Ramadan offers — sorted by actual discount, not noon's algorithm
🧠 Context-Aware Chips
Follow-up suggestion chips remember what you were shopping for — "Under AED 500?" knows you mean laptops under AED 500
📊 Show/Answer Mode
Claude decides when to show product cards vs. when to just answer your question — no forced product dumps



🚀 Try It

→ Install from Chrome Web Store

Or run it locally — see SETUP.md.



🗂️ Repo Structure

noon-shopping-assistant/
├── src/
│   ├── content.js        # All extension logic — UI, API calls, product parsing
│   └── content.css       # All styles for the chat panel and components
├── icons/                # Extension icons (16px, 48px, 128px)
├── manifest.json         # Chrome extension manifest (v3)
├── docs/                 # Screenshots and demo assets
├── README.md
├── SETUP.md              # How to run locally with your own API key
├── CHANGELOG.md          # Full version history
└── PRODUCT_DECISIONS.md  # Why things were built the way they were



🛠️ Tech Stack

Chrome Extension — Manifest V3, content script architecture
Claude AI — claude-haiku-4-5 via Anthropic API (direct browser fetch)
Data Source — noon.com's live RSC (React Server Components) payload — no third-party API, no scraping library
No build tools — vanilla JS and CSS, zero dependencies, zero bundler



🗺️ What's Next

These aren't backlog filler — each one is a deliberate product bet:

Price Drop Tracker
Save any product and get notified when its price falls. The current assistant is session-based — you find, you buy, you leave. A tracker creates a reason to come back and builds a retention loop that noon itself doesn't offer natively.

Arabic Language Support
noon's primary market is UAE and KSA — Arabic-first users. The assistant currently works only in English, which is a real gap. Supporting Arabic means the product actually serves the market it's built for, not just the expat segment.

"Best Time to Buy" Insight
Show price history trends per product over time. Right now the assistant tells you what things cost today. Knowing whether today's price is actually a deal — or if it was lower last month — turns it from a search tool into a buying advisor. That's a fundamentally different value proposition.



💡 About

Built by Vishvesh — a Product Manager with no prior coding background.

This project started as a personal itch (noon's search is genuinely bad) and became an experiment in whether a PM could ship a real, live product using AI as a co-builder. The answer turned out to be yes.

The extension is live on the Chrome Web Store, built end-to-end without writing a single line of code from scratch — just problem framing, product decisions, and iteration with Claude as the technical partner.

If that idea interests you — how PMs can now build and ship independently — I write about it on LinkedIn.



📄 License

MIT © Vishvesh
