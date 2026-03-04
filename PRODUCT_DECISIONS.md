# Product Decisions

A behind-the-scenes log of the meaningful product and design decisions made while building Noon Shopping Assistant — what the problem was, what options were considered, and why things ended up the way they did.

This document exists because shipping a product is easy to show. Thinking through a product is harder to communicate. This is my attempt to make that thinking visible.

---

## Why a Chrome Extension and not a standalone app?

The biggest friction in online shopping isn't finding products — it's context switching. You're on noon, you open Google to research, you open a YouTube review, you open a Reddit thread, and by the time you come back to noon you've lost your place and your momentum.

A Chrome Extension keeps the assistant *inside* noon. The user never leaves the page. That's not a technical choice — it's a product choice. The value of the assistant is directly tied to being in the same context as the thing you're buying.

A standalone app or website would have been easier to build and deploy. It would have been the wrong product.

---

## Why Claude AI and not a simpler rule-based search?

Early thinking was to build a smarter filter UI — dropdowns for price range, brand, specs. That's what most shopping tools do.

The problem with that approach: users don't think in filters. They think in outcomes. "I want something for gaming that won't break my budget" is not a filter query. It's a goal. Rule-based search forces users to translate their goals into the system's language. That's friction.

Claude understands goal-oriented language. It can take "something for gaming that won't break my budget" and figure out what products to surface, what price range is implied, and how to frame the answer. The UX becomes conversational instead of transactional — which maps more closely to how people actually make buying decisions.

---

## Why parse noon's RSC payload instead of using a public API?

noon doesn't have a public product API. The options were:

1. Use a third-party price comparison API — data would be stale, incomplete, and require ongoing cost
2. Scrape noon's HTML — fragile, breaks with every UI change, against ToS
3. Parse the React Server Components (RSC) payload that noon's own frontend uses

Option 3 is what the extension does. When noon loads a search results page, it sends a JSON payload to its own frontend with all the product data. The extension reads that same payload. This means the data is always live, always accurate, and structurally the same as what noon's own app uses.

The tradeoff: it's more complex to parse and can break if noon changes their internal data structure. The upside: real-time accuracy with no third-party dependency.

---

## The comparison widget: why two different flows became one

Version 1 had two separate comparison experiences:
- **Named comparison** ("compare iPhone 15 and Samsung S24") → triggered a big inline card with spec tables, a verdict pill, and a "Deep comparison" button
- **Manual selection** (ticking checkboxes on cards) → triggered a compact widget with thumbnails, an AI verdict, and a "View full breakdown" button

In practice the named comparison flow was over-engineered. It made a separate Claude API call just for the inline view, rendered a large UI block, and felt heavier than the task warranted. Users who typed a comparison query wanted the same quick answer as users who manually selected cards.

The decision was to unify both into the compact widget. One consistent UI for all comparison entry points. If you want the full spec breakdown, you tap one button — same flow regardless of how you initiated the comparison.

Simpler UX, less API cost, no loss of functionality.

---

## Context-aware chips: the problem they were solving

Quick-reply chips are a common pattern in chat UIs. The first implementation was naive — chips were just stored as their display text. So if Claude returned chips like "Under AED 500?" and "Show Samsung options", clicking them sent exactly those strings to the API.

The problem: "Under AED 500?" has no context. Claude doesn't know what category you're in. It's like asking a shop assistant "under AED 500?" without telling them what you're shopping for.

The fix was to attach the *topic context* of the parent message to each chip as a `data-context` attribute. When a chip is clicked, the extension silently prepends the context to the query before sending: "Laptops under AED 500?" — but still shows just "Under AED 500?" in the user's message bubble.

This made chip follow-ups significantly more accurate without any change to the visible UI.

---

## show_products: letting Claude decide when to show cards

The original flow always showed product cards when noon returned results — regardless of what the user actually asked. If a user asked "what specs should I look for in a gaming laptop?" the assistant would answer the question *and* dump 6 laptop cards below it. That's not an answer to the question asked — it's a product push.

The fix was to add a `show_products` boolean to Claude's response schema and give it clear instructions: show cards when the user wants to browse or buy, don't show cards when the user is asking a question or wants advice.

This sounds small. It's not. It's the difference between an assistant that helps you and a shopping widget dressed up as an assistant.

---

## Catalog validation: why Claude can never hallucinate products

LLMs can invent things. In a general chatbot that's sometimes fine. In a shopping assistant that's a trust-destroying bug — imagine clicking a product card and getting a 404, or being quoted a price that doesn't exist.

Every product Claude mentions in a response goes through a validation step: it's cross-referenced against the actual noon search results fetched in the same request. If Claude's product name doesn't match anything in the real catalog, the card is silently dropped.

The user never sees a hallucinated product. Ever.

This was a non-negotiable design constraint from the start, not something added after a bug was found.

---

## The permission rejection: a Chrome Web Store lesson

Version 1.2.0 was submitted to the Chrome Web Store and rejected. The reason: the manifest declared `storage` and `activeTab` permissions that weren't actually used anywhere in the code.

The fix was trivial — remove two lines from `manifest.json`. The lesson was real: Chrome's review team checks that every permission you request is demonstrably used. Requesting permissions "just in case" isn't allowed. This is actually good policy — it protects users from extensions that over-claim access.

Version 1.2.1 removed both permissions and was approved.
