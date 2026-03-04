# 🛍️ Noon Shopping Assistant

An AI-powered Chrome Extension that lives on **noon.com** — find products, compare deals, and get instant summaries through natural conversation.

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Live-brightgreen?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/ahmddkhlmakehabmgelljlpehomepmhj)

---

## 📌 The Problem
**noon.com** hosts millions of products. For a typical shopper, finding the right item often means:
* Drowning in endless search results.
* Jumping between dozens of tabs to compare technical specs.
* Sifting through hundreds of reviews to find the "truth."
* General uncertainty about whether they are actually getting the best deal.

## ✨ The Solution
The **Noon Shopping Assistant** brings a Claude AI-powered chat panel directly onto the noon interface. It acts as a digital concierge that finds, compares, and summarizes products for you—without you ever leaving the page.

---

## 🚀 Key Features

| Feature | Description |
| :--- | :--- |
| **🔍 Conversational Search** | Ask in plain language (e.g., *"best noise-cancelling headphones under AED 500"*) and get curated product cards. |
| **⚖️ Smart Comparison** | Side-by-side spec breakdowns for 2–4 products with an AI-generated verdict on which offers better value. |
| **✦ AI Product Summary** | Instant "TL;DR" of specs and sentiment analysis of reviews to see if a product is actually worth buying. |
| **⚡ Live Deal Discovery** | Surface Mega Deals, Flash Deals, and Ramadan offers sorted by **actual discount percentage**. |
| **🧠 Context-Aware Chips** | Smart follow-up suggestions that remember your current shopping session and constraints. |
| **📊 Intelligent Show/Answer** | Powered by Claude to decide when to display product cards vs. when to provide a direct text answer. |

---

## 🛠️ Tech Stack

* **Chrome Extension Architecture:** Manifest V3, utilizing content scripts for seamless UI injection.
* **LLM Engine:** `claude-haiku-4-5` via Anthropic API (direct browser fetch).
* **Data Sourcing:** Interfaces directly with noon.com's live **RSC (React Server Components)** payload—ensuring real-time accuracy without heavy scraping libraries.
* **Performance:** Built with Vanilla JS and CSS. **Zero dependencies, zero bundlers, zero bloat.**

---

## 🗂️ Repo Structure

```text
noon-shopping-assistant/
├── src/
│   ├── content.js        # Core logic: UI injection, API handling, & parsing
│   └── content.css       # Styles for the chat panel and custom components
├── manifest.json         # Chrome extension configuration (v3)
├── README.md             # Project overview
├── SETUP.md              # Local installation & API configuration
├── CHANGELOG.md          # Version history and bug fixes
└── PRODUCT_DECISIONS.md  # Documentation of product trade-offs and "why"
