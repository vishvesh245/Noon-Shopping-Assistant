(function() {
  'use strict';
  if (document.getElementById('noon-assistant-root')) return;

  // ── STATE ──
  let isOpen=false, isExpanded=false, isLoading=false;

  let conversationHistory=[];
  let comparePool=[];
  let settings={showImages:true};
  let lastSearchResults=[]; // track last shown products for ordinal compare

  // ── INJECT UI ──
  const styleLink=document.createElement('link');
  styleLink.rel='stylesheet';
  styleLink.href=chrome.runtime.getURL('src/content.css');
  document.head.appendChild(styleLink);

  const root=document.createElement('div');
  root.id='noon-assistant-root';
  root.innerHTML=`
    <div class="na-compare-modal" id="na-compare-modal">
      <div class="na-compare-sheet">
        <div class="na-compare-header">
          <div class="na-compare-title">Compare products</div>
          <button class="na-compare-close" id="na-compare-close">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div id="na-cmp-sticky-hdrs" class="na-cmp-sticky-hdrs"></div>
        <div id="na-compare-loading" style="display:none;padding:40px;text-align:center;color:#888;font-size:13px"><div style="font-size:28px;margin-bottom:10px">⚖️</div>Analysing…</div>
        <div class="na-compare-grid" id="na-compare-grid"></div>
        <div id="na-compare-summary"></div>
      </div>
    </div>

    <div id="na-teaser" class="na-teaser">
      <span>👋 Need help finding something?</span>
    </div>
    <button id="na-launcher">
      <svg class="na-chat-icon" width="20" height="20" viewBox="0 0 24 24" fill="#111"><path d="M12 2C6.48 2 2 6.48 2 12c0 2.1.67 4.04 1.81 5.63L2 22l4.37-1.81C7.96 21.33 9.9 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/></svg>
      <svg class="na-close-icon" style="display:none" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
    <div id="na-panel">
      <div class="na-header">
        <div class="na-header-avatar"><svg width="15" height="15" viewBox="0 0 24 24" fill="#111"><path d="M12 2C6.48 2 2 6.48 2 12c0 2.1.67 4.04 1.81 5.63L2 22l4.37-1.81C7.96 21.33 9.9 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/></svg></div>
        <div class="na-header-info">
          <div class="na-header-name">Noon Assistant</div>
          <div class="na-header-status"><div class="na-status-dot"></div><span class="na-status-text">Online · Powered by Claude AI</span></div>
        </div>
        <div class="na-header-actions">
          <button class="na-hbtn" id="na-settings-btn" title="Settings">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
          <button class="na-hbtn" id="na-expand-btn" title="Expand">
            <svg id="na-expand-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
          </button>
          <button class="na-hbtn" id="na-close-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <div class="na-settings" id="na-settings">
        <div class="na-settings-header">
          <button class="na-settings-back" id="na-settings-back"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg></button>
          <div class="na-settings-title">Settings</div>
        </div>
        <div class="na-settings-body">
          <div class="na-settings-section-title">Display</div>
          <div class="na-settings-row">
            <div class="na-settings-row-info"><div class="na-settings-row-label">Show product images</div><div class="na-settings-row-desc">Load images in product cards</div></div>
            <button class="na-toggle on" id="toggle-showImages"></button>
          </div>
          <div class="na-settings-section-title">Chat</div>
          <button class="na-settings-clear" id="na-clear-chat">🗑 Clear conversation</button>
          <div class="na-settings-version">Noon Assistant v1.0 · Powered by Claude</div>
        </div>
      </div>

      <div class="na-messages" id="na-messages">
        <div class="na-welcome">
          <div class="na-welcome-icon">🛍️</div>
          <div class="na-welcome-title">Hey! I'm Noon Assistant</div>
          <div class="na-welcome-sub">Finally, an AI that actually speaks noon. Want to compare the top results? Done. Hunting for Ramadan Flash deals? Found. Need a product summary in seconds? You've got it. No filters, no jumping sites—just the best of noon, instantly.</div>
          <div class="na-chips">
            <button class="na-chip" data-query="gaming mouse">🖱️ Gaming Mouse</button>
            <button class="na-chip" data-query="wireless earbuds">🎧 Earbuds</button>
            <button class="na-chip" data-query="laptop under 3000">💻 Laptops</button>
            <button class="na-chip" data-query="iphone 15">📱 iPhone 15</button>
            <button class="na-chip" data-query="samsung 4k tv">📺 Smart TVs</button>
          </div>

        </div>
      </div>

      <div class="na-input-area">
        <div class="na-input-row">
          <textarea id="na-input" placeholder="What are you looking for?" rows="1" maxlength="500"></textarea>
          <button id="na-send">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
        <div class="na-input-footer">
          <span class="na-input-hint">Enter to send · Shift+Enter for newline</span>
          <span class="na-powered">Powered by Claude</span>
        </div>
      </div>
      <div class="na-detail-overlay" id="na-detail-overlay"></div>
      <div class="na-detail-sheet" id="na-detail-sheet">
        <div class="na-sheet-handle-wrap"><div class="na-sheet-handle"></div></div>
        <div class="na-sheet-scroll" id="na-sheet-content"></div>
      </div>
    </div>`;
  document.body.appendChild(root);

  // ── REFS ──
  const panel=root.querySelector('#na-panel'), launcher=root.querySelector('#na-launcher');
  const msgs=root.querySelector('#na-messages'), inputEl=root.querySelector('#na-input'), sendBtn=root.querySelector('#na-send');
  const settingsEl=root.querySelector('#na-settings');
  const compareModal=root.querySelector('#na-compare-modal'), compareGrid=root.querySelector('#na-compare-grid');
  const compareLoading=root.querySelector('#na-compare-loading'), compareSummary=root.querySelector('#na-compare-summary');
  const detailOverlay=root.querySelector('#na-detail-overlay'), detailSheet=root.querySelector('#na-detail-sheet'), detailContent=root.querySelector('#na-sheet-content');

  // ── EVENTS ──
  launcher.addEventListener('click', ()=>{ 
    isOpen=!isOpen; panel.classList.toggle('na-open',isOpen); launcher.classList.toggle('na-open',isOpen); 
    if(isOpen){ setTimeout(()=>inputEl.focus(),320); dismissTeaser();

    }
  });

  // ── TEASER BUBBLE ──
  const teaser = root.querySelector('#na-teaser');
  let teaserDismissed = false;

  function dismissTeaser() {
    if(teaserDismissed) return;
    teaserDismissed = true;
    teaser.classList.add('na-teaser-hide');
    setTimeout(()=>teaser.style.display='none', 400);
  }

  // Show teaser after 1.5s, dismiss after 10s
  setTimeout(()=>{
    if(!isOpen) {
      teaser.classList.add('na-teaser-show');
      // Gentle shake of launcher at 2s
      setTimeout(()=>launcher.classList.add('na-shake'), 500);
      setTimeout(()=>launcher.classList.remove('na-shake'), 1100);
      // Auto-dismiss after 10s
      setTimeout(dismissTeaser, 10000);
    }
  }, 1500);

  teaser.addEventListener('click', ()=>{ 
    dismissTeaser(); 
    isOpen=true; panel.classList.add('na-open'); launcher.classList.add('na-open');
    setTimeout(()=>inputEl.focus(),320);
    // Load live deals on first open
    if (!document.getElementById('na-deal-chips-container')?.children.length) fetchLiveDeals();
  });
  // Backdrop for expanded mode
  const backdrop = document.createElement('div');
  backdrop.id = 'na-backdrop';
  backdrop.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:2147483645;backdrop-filter:blur(2px)';
  document.body.appendChild(backdrop);
  backdrop.addEventListener('click', () => {
    isExpanded = false; panel.classList.remove('na-expanded'); backdrop.style.display='none';
    root.querySelector('#na-expand-btn').innerHTML = `<svg id="na-expand-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;
  });

  root.querySelector('#na-close-btn').addEventListener('click', ()=>{ 
    isOpen=false; isExpanded=false;
    panel.classList.remove('na-open','na-expanded'); 
    launcher.classList.remove('na-open');
    backdrop.style.display='none';
  });
  root.querySelector('#na-expand-btn').addEventListener('click', ()=>{
    isExpanded=!isExpanded; panel.classList.toggle('na-expanded',isExpanded);
    backdrop.style.display = isExpanded ? 'block' : 'none';
    const ic=root.querySelector('#na-expand-icon');
    ic.outerHTML=isExpanded
      ?`<svg id="na-expand-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/></svg>`
      :`<svg id="na-expand-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;
  });
  root.querySelector('#na-settings-btn').addEventListener('click', ()=>settingsEl.classList.add('na-open'));
  root.querySelector('#na-settings-back').addEventListener('click', ()=>settingsEl.classList.remove('na-open'));
  root.querySelector('#na-clear-chat').addEventListener('click', ()=>{
    conversationHistory=[]; comparePool=[]; settingsEl.classList.remove('na-open');
    msgs.innerHTML=`<div class="na-welcome"><div class="na-welcome-icon">✨</div><div class="na-welcome-title">Fresh start!</div><div class="na-welcome-sub">What are you looking for today?</div></div>`;
  });
  root.querySelector('#toggle-showImages').addEventListener('click', function(){ settings.showImages=!settings.showImages; this.classList.toggle('on',settings.showImages); });
  root.querySelector('#na-compare-close').addEventListener('click', ()=>compareModal.classList.remove('na-open'));
  compareModal.addEventListener('click', e=>{ if(e.target===compareModal) compareModal.classList.remove('na-open'); });

  // Shared chip handler — used by both msgs area AND welcome screen
  function handleChipClick(e) {
    const chip=e.target.closest('.na-chip,.na-action-btn');
    if(chip){
      if(isLoading) return;
      const dealSlug = chip.dataset.dealSlug||null;
      const dealText = chip.dataset.dealText||null;
      const chipQuery = chip.dataset.query || chip.textContent.trim();
      const chipContext = chip.dataset.context || '';
      // If chip has a context topic and the chip text doesn't already contain it, prepend silently
      // e.g. context="Gaming Mouse", query="Under AED 500" → send "Gaming Mouse under AED 500"
      const needsContext = chipContext && !chipQuery.toLowerCase().includes(chipContext.toLowerCase().slice(0,10));
      const fullQuery = needsContext ? chipContext + ' ' + chipQuery : chipQuery;
      const displayLabel = chip.textContent.trim(); // always show the original chip label to user
      console.log('[NA] chip click: query=', fullQuery, 'display=', displayLabel, 'context=', chipContext, 'dealSlug=', dealSlug);
      sendMessage(fullQuery, displayLabel, dealSlug, dealText);
      return;
    }
  }
  // Delegate clicks from welcome screen chips (outside msgs)
  root.addEventListener('click', e=>{ if(e.target.closest('#na-welcome')) handleChipClick(e); });

  msgs.addEventListener('click', e=>{
    handleChipClick(e);
    const chip=e.target.closest('.na-chip,.na-action-btn');
    if(chip){if(isLoading)return;const dealSlug=chip.dataset.dealSlug||null;const dealText=chip.dataset.dealText||null;console.log('[NA] chip click: query=',chip.dataset.query,'dealSlug=',dealSlug,'dealText=',dealText);sendMessage(chip.dataset.query||chip.textContent.trim(), chip.textContent.trim(), dealSlug, dealText);return;}
    const starBtn=e.target.closest('.na-star-btn');
    if(starBtn){e.stopPropagation();openDetailSheet(starBtn);return;}
    const toggle=e.target.closest('.na-card-compare-toggle');
    if(toggle){e.stopPropagation();toggleCompare(toggle.closest('.na-product-card'));return;}
    const card=e.target.closest('.na-product-card');
    if(card&&!e.target.closest('.na-card-compare-toggle')&&!e.target.closest('.na-star-btn')){const u=card.dataset.url;if(u&&u.startsWith('http'))window.open(u,'_blank');return;}
    if(e.target.closest('#na-start-compare'))return; // handled by inline tray
    const rm=e.target.closest('.na-it-rm');
    if(rm){const n=rm.dataset.name;const item=comparePool.find(p=>p.name===n);const gid=item?.groupId;comparePool=comparePool.filter(p=>p.name!==n);msgs.querySelectorAll(`.na-product-card[data-name="${CSS.escape(n)}"]`).forEach(c=>c.classList.remove('na-card-selected'));updateCompareTray(gid);}
  });

  inputEl.addEventListener('keydown', e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();doSend();} });
  inputEl.addEventListener('input', ()=>{ inputEl.style.height='auto'; inputEl.style.height=Math.min(inputEl.scrollHeight,96)+'px'; });
  sendBtn.addEventListener('click', doSend);
  function doSend(){const t=inputEl.value.trim();if(!t||isLoading)return;inputEl.value='';inputEl.style.height='auto';sendMessage(t);}

  // ── SEND — direct fetch, no service worker ──
  // Detect if message is a comparison query (X vs Y, compare A and B, etc.)
  function detectComparisonQuery(text) {
    const t = text.toLowerCase();
    const hasVs  = /\bvs\.?\b|\bversus\b/.test(t);
    const hasCmp = /\bcompar(e|ing|ison)\b/.test(t);
    const hasDiff= /\b(difference|differ|better|between)\b/.test(t);
    const hasOrQ = /\b(or|which|should i (get|buy|choose)|what.{0,10}better)\b/.test(t);
    const hasShowVs = /show\b.{0,20}\bvs\b/.test(t);

    // Ordinal reference: "compare 1st and 3rd", "compare first and second"
    const ordinalMap = {'1st':0,'first':0,'2nd':1,'second':1,'3rd':2,'third':2,'4th':3,'fourth':3,'5th':4,'fifth':4,'6th':5,'sixth':5};
    const ordinalMatch = t.match(/compar\w*\s+(\w+)\s+(?:and|with|to)\s+(\w+)/);
    if (ordinalMatch) {
      const idxA = ordinalMap[ordinalMatch[1]], idxB = ordinalMap[ordinalMatch[2]];
      if (idxA !== undefined && idxB !== undefined) {
        return { isComparison: true, parts: null, ordinals: [idxA, idxB] };
      }
    }
    // Also handle "1st vs 3rd"
    const ordVsMatch = t.match(/(\w+)\s+vs\.?\s+(\w+)/);
    if (ordVsMatch) {
      const idxA = ordinalMap[ordVsMatch[1]], idxB = ordinalMap[ordVsMatch[2]];
      if (idxA !== undefined && idxB !== undefined) {
        return { isComparison: true, parts: null, ordinals: [idxA, idxB] };
      }
    }

    if (!hasCmp && !hasVs && !hasShowVs && !(hasDiff && hasOrQ)) return null;

    let parts = null;
    const vsMatch  = t.match(/(.{3,50}?)\s+(?:vs\.?|versus)\s+(.{3,50})/);
    const andMatch = t.match(/compare\s+(.{3,50}?)\s+(?:and|with|to)\s+(.{3,50})/);
    if (vsMatch)  parts = [vsMatch[1].replace(/^(show me|compare|show)\s+/,'').trim(), vsMatch[2].replace(/\s+(prices?|specs?|deals?).*$/,'').trim()];
    else if (andMatch) parts = [andMatch[1].trim(), andMatch[2].replace(/\s+(prices?|specs?|deals?).*$/,'').trim()];

    return { isComparison: true, parts, ordinals: null };
  }

  async function sendMessage(text, displayLabel='', _dealSlug=null, _dealText=null) {
    msgs.querySelector('.na-welcome')?.remove();
    appendUserBubble(displayLabel || text);
    conversationHistory.push({role:'user', content:text});
    const typingEl = appendTyping();
    isLoading=true; sendBtn.disabled=true;

    try {
      // ── PATH A: Comparison query — skip noon search, do smart comparison ──
      const cmpDetect = detectComparisonQuery(text);
      if (cmpDetect) {
        await handleComparisonQuery(text, cmpDetect, typingEl);
        isLoading=false; sendBtn.disabled=false;
        return;
      }

      // ── PATH B: Normal product search ──
      const query = extractQuery(text);
      const products = query ? await searchNoon(query, _dealSlug, _dealText) : ((_dealSlug) ? await searchNoon('', _dealSlug, _dealText) : []);
      // isDealBrowse: true when user came from deal chip with no specific product query
      const isDealBrowse = !!_dealSlug && !extractQuery(text)?.replace(/mega|deal|ramadan|flash|clearance|friday/gi,'').trim();
      const dealName = _dealSlug ? (_dealText || _dealSlug.replace(/-/g,' ')) : (Object.entries(DEAL_FILTERS).find(([k])=>text.toLowerCase().includes(k))||[])[0];
      const context = products.length > 0
        ? (isDealBrowse
            ? `User is browsing ${dealName||'deal'} products — they want to see the craziest discounts available right now.\nLead your message with excitement about the deals, mention the best discount % or savings in AED you see, then list products. End with an offer to help filter by category (phones, laptops, speakers, etc).\nReal noon ${dealName||'deal'} products sorted by discount:\n`
            : 'Real noon products:\n')
          + products.slice(0,6).map(formatProduct).join('\n')
        : 'No products found — ask a clarifying question.';
      const messages = [
        ...conversationHistory.slice(-8),
        { role:'user', content: text + '\n\n[DATA: ' + context + ']' }
      ];
      const raw = await callClaude(messages);
      const res = parseClaudeResponse(raw, products);
      typingEl.remove();
      // CATALOG VALIDATION: only keep products that have a match in real noon results
      const validatedProducts = [];
      res.products.forEach(cp => {
        const match = products.find(np => np.name && cp.name &&
          np.name.toLowerCase().includes(cp.name.toLowerCase().slice(0,25)));
        if (match) {
          cp._specs = match.plp_specifications || [];
          cp._rawPrice = match.price; cp._rawSalePrice = match.sale_price;
          if (!cp.image_url && match._imageUrl) cp.image_url = match._imageUrl;
          if (!cp.url && match._url) cp.url = match._url;
          validatedProducts.push(cp);
        }
        // Products not found in noon catalog are silently dropped — never hallucinate
      });
      // If Claude returned products but none matched catalog, use raw noon products instead
      const finalProducts = validatedProducts.length > 0
        ? validatedProducts
        : (res.products.length > 0 && products.length > 0 ? [] : products.slice(0,6).map(p=>({
            name: p.name, price: p.sale_price ? 'AED '+p.sale_price : 'AED '+p.price,
            old_price: p.sale_price ? 'AED '+p.price : '',
            rating: p.rating_count ? p.rating_average+' \u2605 ('+p.rating_count+')' : '',
            url: p._url||'', image_url: p._imageUrl||'',
            deal_tag: p.deal_tag?.text||'',
            _specs: p.plp_specifications||[], _rawPrice: p.price, _rawSalePrice: p.sale_price
          })));
      // Respect Claude's show_products flag — text-only answers don't need cards
      const cardsToShow = res.showProducts !== false ? finalProducts : [];
      if (cardsToShow.length) lastSearchResults = cardsToShow;
      const chipContext = res.heading || displayLabel || text;
      appendBotBubble(res.reply, cardsToShow, res.quickReplies||[], chipContext);
      conversationHistory.push({role:'assistant', content: res.reply});
    } catch(err) {
      typingEl.remove();
      console.error('[NA] Error:', err.message);
      appendError(err.message + ' — tap to retry', text);
    }
    isLoading=false; sendBtn.disabled=false;
  }

  // ── COMPARISON QUERY HANDLER ──
  async function handleComparisonQuery(text, detect, typingEl) {
    try {
      let pA = null, pB = null;

      // ── ORDINAL: "compare 1st and 3rd" ──
      if (detect.ordinals && lastSearchResults.length) {
        const [iA, iB] = detect.ordinals;
        const rA = lastSearchResults[iA], rB = lastSearchResults[iB];
        if (!rA || !rB) {
          typingEl.remove();
          const max = lastSearchResults.length;
          const el = mk('div','na-msg-row na-bot');
          el.innerHTML = `<div class="na-bot-avatar">${botSVG()}</div><div class="na-bubble"><p>I only have ${max} product${max!==1?'s':''} in the last results — try "compare 1st and ${max === 1 ? '2nd' : max+'th'}" or tap the checkboxes on the cards.</p></div>`;
          msgs.appendChild(el); scrollBottom(); return;
        }
        // Build pool from lastSearchResults directly — skip noon search
        const mkPool = p => ({
          name: p.name||'', url: p.url||p._url||'',
          img: p.image_url||p._imageUrl||'',
          price: p.price||'', rating: p.rating||'',
          _rawPrice: p._rawPrice||p.price, _rawSalePrice: p._rawSalePrice||p.sale_price,
          groupId:'ordinal'
        });
        const pool = [mkPool(rA), mkPool(rB)];
        typingEl.remove();
        // Show brief inline compare (same as card selection flow) — not modal directly
        await showBriefCompare(pool, text);
        return;
      }

      // ── NAMED PRODUCT COMPARISON — uses same brief widget as checkbox/ordinal flow ──
      let productsA = [], productsB = [];
      if (detect.parts) {
        [productsA, productsB] = await Promise.all([
          searchNoon(detect.parts[0]),
          searchNoon(detect.parts[1])
        ]);
      }
      pA = productsA[0]||null; pB = productsB[0]||null;

      typingEl.remove();

      if (!pA && !pB) {
        const el = mk('div','na-msg-row na-bot');
        el.innerHTML = `<div class="na-bot-avatar">${botSVG()}</div><div class="na-bubble"><p>Couldn't find either product on noon right now. Try searching for them individually?</p></div>`;
        msgs.appendChild(el); scrollBottom();
        conversationHistory.push({role:'assistant', content:"Couldn't find either product on noon."});
      } else if (!pA || !pB) {
        const missing = !pA ? (detect.parts?.[0]||'Product A') : (detect.parts?.[1]||'Product B');
        const found   = (pA||pB);
        const el = mk('div','na-msg-row na-bot');
        el.innerHTML = `<div class="na-bot-avatar">${botSVG()}</div><div class="na-bubble"><p>I found <strong>${esc(found.name)}</strong> but couldn't locate <em>${esc(missing)}</em> on noon. Try a different name?</p></div>`;
        msgs.appendChild(el); scrollBottom();
        conversationHistory.push({role:'assistant', content:`Found ${found.name} but not ${missing}.`});
      } else {
        const cmpGroupId = 'named-'+Date.now();
        const pool = [
          { name:pA.name||'', price:pA.sale_price?'AED '+pA.sale_price:(pA.price?'AED '+pA.price:''), img:pA._imageUrl||'', url:pA._url||'', rating:'', groupId:cmpGroupId },
          { name:pB.name||'', price:pB.sale_price?'AED '+pB.sale_price:(pB.price?'AED '+pB.price:''), img:pB._imageUrl||'', url:pB._url||'', rating:'', groupId:cmpGroupId },
        ];
        await showBriefCompare(pool, text);
        conversationHistory.push({role:'assistant', content:`Compared ${pA.name} vs ${pB.name}.`});
      }

    } catch(err) {
      typingEl.remove();
      appendError(err.message + ' — tap to retry', text);
    }
  }

  // ── RENDERERS ──
  function appendUserBubble(text){const el=mk('div','na-msg-row na-user');el.innerHTML=`<div class="na-bubble">${esc(text)}</div>`;msgs.appendChild(el);scrollBottom();}

  function appendBotBubble(text,products,quickReplies,label=''){
    const el=mk('div','na-msg-row na-bot');
    el.innerHTML=`<div class="na-bot-avatar">${botSVG()}</div><div class="na-bubble"><p>${esc(text)}</p>${products.length?buildCards(products, label, quickReplies):buildQR(quickReplies, label)}</div>`;
    msgs.appendChild(el);scrollBottom();
    if(products.length) animateStarBtns(el);
  }

  function appendError(text, retryQuery=null){
    const el=mk('div','na-msg-row na-bot');
    const retryHtml = retryQuery
      ? `<button class="na-retry-btn" style="margin-top:8px;padding:5px 12px;border:1px solid #DC2626;border-radius:20px;background:transparent;color:#DC2626;font-size:11px;cursor:pointer;font-family:inherit" onclick="this.closest('.na-msg-row').remove()">↩ Retry</button>`
      : '';
    el.innerHTML=`<div class="na-bot-avatar">${botSVG()}</div><div class="na-bubble" style="color:#DC2626;border-color:#FECACA;background:#FEF2F2">⚠️ ${esc(text)}${retryHtml}</div>`;
    if(retryQuery) el.querySelector('.na-retry-btn').addEventListener('click', ()=>{ if(!isLoading) sendMessage(retryQuery); });
    msgs.appendChild(el);scrollBottom();
  }

  function appendTyping(){const el=mk('div','na-typing-row');el.innerHTML=`<div class="na-bot-avatar">${botSVG()}</div><div class="na-typing-bubble"><span></span><span></span><span></span></div>`;msgs.appendChild(el);scrollBottom();return el;}

  function buildCards(products, query='', quickReplies=[]){
    // Use Claude's heading directly; fall back to title-casing the query
    const heading = /^[A-Z]/.test(query) ? query :
      query.replace(/[^\w\s']/g, '').trim().replace(/\b\w/g, c => c.toUpperCase()) || 'Results';

    const cards=products.slice(0,6).map(p=>{
      const name=(p.name||'Product').substring(0,65);

      // Price
      let priceHtml;
      const hasOld = p.old_price && p.price && p.old_price !== p.price;
      const hasNoonDiscount = p.sale_price && p.price && p.price > p.sale_price;
      if(hasOld) priceHtml=`<div class="na-price-row"><span class="na-product-price">${esc(p.price)}</span><span class="na-product-price-old">${esc(p.old_price)}</span></div>`;
      else if(hasNoonDiscount) priceHtml=`<div class="na-price-row"><span class="na-product-price">AED ${p.sale_price}</span><span class="na-product-price-old">AED ${p.price}</span></div>`;
      else priceHtml=`<div class="na-price-row"><span class="na-product-price">${esc(String(p.price||p.price_text||''))}</span></div>`;

      // Discount % on image — extract numeric values from any price format
      let discountPct = '';
      const parsePrice = s => parseFloat(String(s||'').replace(/[^\d.]/g,'')) || 0;
      const saleNum = parsePrice(p.sale_price || p.price);
      const origNum = parsePrice(p.old_price || p.price);
      if (origNum > saleNum && saleNum > 0 && p.old_price) {
        discountPct = Math.round((1 - saleNum / origNum) * 100) + '% off';
      } else if (p.sale_price && p.price) {
        const s = parsePrice(p.sale_price), o = parsePrice(p.price);
        if (o > s && s > 0) discountPct = Math.round((1 - s / o) * 100) + '% off';
      } else if (p.badge && /^\d+%/.test(String(p.badge||''))) {
        discountPct = p.badge;
      }
      const discountHtml = discountPct
        ? `<span class="na-discount-badge">${esc(discountPct)}</span>` : '';

      // Rating
      const rv=p.rating||(p.product_rating?.value?`${p.product_rating.value} ★ (${(p.product_rating.count||0).toLocaleString()})`:'')||'';
      const ratingHtml=rv?`<div class="na-product-rating">⭐ ${esc(rv)}</div>`:'';

      // Deal tag — Ramadan, Mega Deal, etc. shown below name in one line
      const dealEmojis={'Ramadan Deal':'🌙','Mega Deal':'📣','11.11 Deal':'🔥','10.10 Sale':'💥','End of Year Sale':'🎉','Deal':'⚡'};
      const dealTagText = String(p.deal_tag?.text || p.deal_tag || '');
      const dealEmoji = dealTagText ? (Object.entries(dealEmojis).find(([k])=>dealTagText.includes(k))?.[1] || '🏷️') : '';
      const dealTagHtml = dealTagText
        ? `<div class="na-deal-tag">${dealEmoji} ${esc(dealTagText)}</div>` : '';

      // URL
      let url = p._url || p.url || '';
      if (url && !url.startsWith('http')) url = 'https://www.noon.com/uae-en/' + url.replace(/^\//,'');
      if (!url && p.catalog_sku) url = `https://www.noon.com/uae-en/-/${p.catalog_sku.replace(/-\d+$/, '')}/p/`;

      // Image
      const imgSrc = p.image_url || p._imageUrl
        || (p.image_key ? `https://f.nooncdn.com/p/${p.image_key}.jpg` : '')
        || p.image || '';
      const imgHtml=(imgSrc&&settings.showImages)
        ?`<img src="${esc(imgSrc)}" alt="${esc(name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display=''">
           <span class="na-no-img" style="display:none">📦</span>`
        :`<span class="na-no-img">📦</span>`;

      return `<div class="na-product-card" data-url="${esc(url)}" data-name="${esc(name)}" data-price="${esc(String(p.price||p.sale_price||''))}" data-img="${esc(imgSrc)}" data-rating="${esc(rv)}" data-badge="${esc(p.badge||'')}">
        <button class="na-card-compare-toggle" title="Add to compare"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg></button>
        <button class="na-star-btn" title="Specs &amp; Claude's take" data-product="${esc(JSON.stringify({name,price:p.sale_price?`AED ${p.sale_price}`:String(p.price||''),oldPrice:p.old_price||(p.price&&p.sale_price?`AED ${p.price}`:''),rating:rv,disc:p.sale_price&&p.price?Math.round((1-parseFloat(p.sale_price)/parseFloat(p.price))*100)+'%':'',specs:(p._specs||p.plp_specifications||[]).slice(0,8).map(s=>([s.label,s.value])),url,img:imgSrc,dealTag:String(p.deal_tag?.text||p.deal_tag||'')}))}" >✦</button>
        <div class="na-product-img-wrap">${imgHtml}${discountHtml}</div>
        <div class="na-product-body">
          <div class="na-product-name">${esc(name)}</div>
          ${priceHtml}${ratingHtml}${dealTagHtml}
        </div>
      </div>`;
    }).join('');

    const q=encodeURIComponent((products[0]?.name||'').split(' ').slice(0,3).join(' '));
    const groupId='cg-'+Date.now();
    return `
      <div class="na-products-label">${esc(heading)} · Tap to open</div>
      <div class="na-products-hint">✦ Tap <span class="na-hint-star">✦</span> for AI summary &nbsp;·&nbsp; ✓ Select 2–4 to compare</div>
      <div class="na-products-scroll" data-group="${groupId}">${cards}</div>
      <div class="na-inline-tray" id="tray-${groupId}" style="display:none">
        <div class="na-inline-tray-items" id="tray-items-${groupId}"></div>
        <button class="na-inline-compare-btn" id="tray-btn-${groupId}" disabled>Select 2 to compare</button>
      </div>
      <a href="https://www.noon.com/uae-en/search/?q=${q}" target="_blank" rel="noopener" class="na-view-all-btn">View all on noon →</a>
      ${quickReplies.length ? buildQR(quickReplies, heading) : ''}`;
  }

  function buildQR(replies, context=''){return `<div class="na-actions-row">${replies.map(r=>`<button class="na-action-btn" data-query="${esc(r)}" data-context="${esc(context)}">${esc(r)}</button>`).join('')}</div>`;}

  // ── COMPARE ──
  function toggleCompare(card){
    if(!card)return;
    const name=card.dataset.name;
    // Find which group this card belongs to
    const scroll=card.closest('.na-products-scroll');
    const groupId=scroll?scroll.dataset.group:null;
    const idx=comparePool.findIndex(p=>p.name===name);
    if(idx>-1){
      comparePool.splice(idx,1);
      card.classList.remove('na-card-selected');
    } else {
      const groupCount = comparePool.filter(p=>p.groupId===groupId).length;
      if(groupCount>=4){showToast('Max 4 products');return;}
      comparePool.push({name,price:card.dataset.price,img:card.dataset.img,url:card.dataset.url,rating:card.dataset.rating,badge:card.dataset.badge,groupId});
      card.classList.add('na-card-selected');
    }
    updateCompareTray(groupId);
  }

  function updateCompareTray(groupId){
    const tray=groupId?msgs.querySelector('#tray-'+groupId):null;
    const items=groupId?msgs.querySelector('#tray-items-'+groupId):null;
    const btn=groupId?msgs.querySelector('#tray-btn-'+groupId):null;
    if(!tray) return;

    const groupItems = comparePool.filter(p=>p.groupId===groupId);
    if(!groupItems.length){ tray.style.display='none'; return; }
    tray.style.display='';

    items.innerHTML = groupItems.map(p=>`
      <div class="na-it">
        ${p.img?`<img src="${esc(p.img)}" width="24" height="24" style="object-fit:contain;border-radius:5px;background:#fff">`:'<span style="font-size:15px">📦</span>'}
        <span class="na-it-name">${esc(p.name.split(' ').slice(0,3).join(' '))}</span>
        <button class="na-it-rm" data-name="${esc(p.name)}" title="Remove">×</button>
      </div>`).join('');

    const n = groupItems.length;
    if(n === 1){
      btn.disabled=true;
      btn.className='na-inline-compare-btn na-icb-nudge';
      btn.textContent='Add 1 more to compare';
    } else {
      btn.disabled=false;
      btn.className='na-inline-compare-btn';
      btn.textContent=n===2 ? 'Compare these 2 →' : `Compare all ${n} →`;
      btn.onclick = () => launchInlineCompare(groupId);
    }
  }

  // Shared fn: show brief inline compare bubble for any pool of products
  async function showBriefCompare(pool, label='') {
    const withDetails = await Promise.all(pool.map(async p => {
      if (p.details && p.details.specs) return { ...p };
      const details = p.url ? await fetchProductDetails(p.url) : {specs:[],reviews:[],noonSummary:null,avgRating:0,reviewCount:0};
      return {...p, details};
    }));
    await _renderBriefCompare(withDetails);
  }

  async function launchInlineCompare(groupId){
    const items = comparePool.filter(p=>p.groupId===groupId);
    if(items.length<2) return;

    // Lock tray
    const trayBtn = msgs.querySelector('#tray-btn-'+groupId);
    if(trayBtn){ trayBtn.disabled=true; trayBtn.textContent='Comparing…'; }

    const typingEl = appendTyping();

    // Fetch specs in parallel
    const withDetails = await Promise.all(items.map(async p => {
      const details = p.url ? await fetchProductDetails(p.url) : {specs:[],reviews:[],noonSummary:null,avgRating:0,reviewCount:0};
      return {...p, details};
    }));
    typingEl.remove();

    // Auto-deselect all compared products immediately
    items.forEach(p => {
      comparePool = comparePool.filter(cp=>cp.name!==p.name);
      msgs.querySelectorAll(`.na-product-card[data-name="${CSS.escape(p.name)}"]`)
          .forEach(card=>card.classList.remove('na-card-selected'));
    });
    // Hide the tray since pool is now empty for this group
    const tray = msgs.querySelector('#tray-'+groupId);
    if(tray) tray.style.display='none';

    await _renderBriefCompare(withDetails);
  }

  async function _renderBriefCompare(withDetails) {
    const cmpId = 'icmp-'+Date.now();

    // Store details for full modal
    window._naCompareData = window._naCompareData||{};
    window._naCompareData[cmpId] = withDetails;

    // ── FIX 1: Brief inline card — just product thumbs + winner verdict + CTA ──
    const thumbs = withDetails.map(p=>`
      <div class="na-ic-thumb">
        <div class="na-ic-thumb-img">${p.img?`<img src="${esc(p.img)}" onerror="this.style.display='none'">`:'📦'}</div>
        <div class="na-ic-thumb-name">${esc(p.name.split(' ').slice(0,3).join(' '))}</div>
        <div class="na-ic-thumb-price">${esc(p.price||'')}</div>
      </div>`).join(`<div class="na-ic-thumb-vs">VS</div>`);

    const el = mk('div','na-msg-row na-bot');
    el.innerHTML = `<div class="na-bot-avatar">${botSVG()}</div><div class="na-bubble">
      <div class="na-brief-cmp">
        <div class="na-brief-thumbs">${thumbs}</div>
        <div class="na-brief-verdict" id="bv-${cmpId}">
          <div class="na-ai-loading" style="padding:8px 0"><span></span><span></span><span></span></div>
        </div>
        <button class="na-brief-full-btn" id="bfull-${cmpId}">⚖️ View full spec breakdown</button>
      </div>
    </div>`;
    msgs.appendChild(el); scrollBottom();

    // Wire CTA — opens modal with max z-index
    el.querySelector(`#bfull-${cmpId}`).addEventListener('click', ()=>{
      comparePool = window._naCompareData[cmpId]||[];
      launchCompare();
    });

    // Get Claude verdict (brief)
    try {
      const summaries = withDetails.map((p,i)=>{
        const specs=(p.details.specs||[]).slice(0,10).map(([l,v])=>l+': '+v).join(', ');
        return (i+1)+'. '+p.name+' | '+p.price+(p.rating?' | '+p.rating:'')+'\n   '+specs;
      }).join('\n\n');

      const raw = await callClaude([{role:'user',content:
        'Compare these products. JSON only, no markdown:\n\n'+summaries+'\n\n'+
        '{"winner":"exact product name","one_line":"Why it wins in one sentence citing a specific spec or price advantage","tag":"Best Value or Best Performance or Budget Pick or Premium Choice"}'
      }], 300, 'Product analyst. One sentence max. No hedging. No asterisks.');

      let v=null;
      try{v=JSON.parse(raw.trim().replace(/^```json\s*/,'').replace(/\s*```$/,''));}
      catch(e){const m=raw.match(/\{[\s\S]*\}/);if(m)try{v=JSON.parse(m[0]);}catch(e2){}}

      const area = el.querySelector(`#bv-${cmpId}`);
      if(area && v){
        const tagCol={'Best Value':'#166534','Best Performance':'#1e40af','Budget Pick':'#92400e','Premium Choice':'#581c87'};
        const col = tagCol[v.tag]||'#166534';
        area.innerHTML=`
          <div class="na-brief-winner-row">
            <span class="na-brief-tag" style="background:${col}18;color:${col}">${esc(v.tag||'Claude picks')}</span>
            <span class="na-brief-winner">${esc((v.winner||'').replace(/\*\*/g,''))}</span>
          </div>
          <p class="na-brief-why">${esc((v.one_line||'').replace(/\*\*/g,''))}</p>`;
      } else if(area){
        area.innerHTML='<p style="font-size:11px;color:#999">See full breakdown for details.</p>';
      }
    } catch(e){
      const area=el.querySelector(`#bv-${cmpId}`);
      if(area) area.innerHTML='<p style="font-size:11px;color:#999">Tap below to see full comparison.</p>';
    }
    scrollBottom();
  }

  function openCompareModal(){
    compareModal.classList.add('na-open');
    compareModal.style.zIndex = '2147483647';
  }

  // Stop scroll bleeding through modal to the page behind
  compareModal.addEventListener('wheel', e => {
    const grid = compareGrid;
    const atTop = grid.scrollTop === 0;
    const atBot = grid.scrollTop + grid.clientHeight >= grid.scrollHeight - 1;
    if ((atTop && e.deltaY < 0) || (atBot && e.deltaY > 0)) e.preventDefault();
  }, { passive: false });
  compareModal.addEventListener('touchmove', e => {
    if (e.target === compareModal) e.preventDefault();
  }, { passive: false });

  async function launchCompare(){
    if(comparePool.length<2)return;
    compareGrid.innerHTML=''; compareSummary.innerHTML='';
    compareLoading.style.display='block';
    openCompareModal();

    // Fetch real specs — reuse pre-fetched details if already available
    const withDetails = await Promise.all(comparePool.map(async p => {
      if (p.details && p.details.specs) return { ...p }; // already have specs
      const details = p.url ? await fetchProductDetails(p.url) : { specs:[],reviews:[],noonSummary:null,avgRating:0,reviewCount:0 };
      return { ...p, details };
    }));

    // Collect all unique spec keys
    const allKeys = [], seenKeys = new Set();
    withDetails.forEach(p => {
      (p.details.specs||[]).forEach(([l]) => {
        if (!seenKeys.has(l.toLowerCase())) { seenKeys.add(l.toLowerCase()); allKeys.push(l); }
      });
    });
    const getSpec = (p, key) => {
      const s = (p.details.specs||[]).find(([l]) => l.toLowerCase() === key.toLowerCase());
      return s ? s[1] : null;
    };

    const n = withDetails.length;
    compareGrid.className = 'na-compare-grid na-cmp-wrap';

    // Header cards
    const headerCols = withDetails.map(p => `
      <div class="na-cmp-col-hdr">
        <div class="na-cmp-pimg">${p.img ? `<img src="${esc(p.img)}" alt="${esc(p.name)}" onerror="this.style.display='none'">` : '\u{1F4E6}'}</div>
        <div class="na-cmp-pname">${esc(p.name)}</div>
        <div class="na-cmp-pprice">${esc(p.price||'\u2014')}</div>
        ${p.rating ? `<div class="na-cmp-prating">\u2B50 ${esc(p.rating)}</div>` : ''}
      </div>`).join('');

    // Group spec keys by category
    const catGroups = [
      { label:'\u{1F4FA} Display',      keys:['screen','size','resolution','display','refresh','hz','panel','uled','oled','amoled','qled','ips','fhd','4k'] },
      { label:'\u26A1 Performance', keys:['ram','memory','processor','chip','cpu','storage','internal','ssd','rom','capacity'] },
      { label:'\u{1F50B} Battery',      keys:['battery','mah','charging','watt','power'] },
      { label:'\u{1F4F7} Camera',       keys:['camera','mp','megapixel','aperture','zoom','lens','sensor'] },
      { label:'\u{1F50C} Connectivity', keys:['wifi','bluetooth','nfc','5g','4g','sim','hdmi','usb','port','jack'] },
      { label:'\u{1F4E6} Physical',     keys:['weight','dimension','colour','color','height','width','depth'] },
    ];
    const grouped = catGroups.map(g => ({ ...g, specKeys:[] }));
    const ungrouped = [];
    allKeys.forEach(key => {
      const search = key.toLowerCase();
      let placed = false;
      for (const g of grouped) { if (g.keys.some(k => search.includes(k))) { g.specKeys.push(key); placed=true; break; } }
      if (!placed) ungrouped.push(key);
    });
    if (ungrouped.length) grouped.push({ label:'\u{1F6E0} Other', specKeys:ungrouped });

    // Build spec rows
    let specRowsHTML = '';
    grouped.filter(g => g.specKeys && g.specKeys.length > 0).forEach(g => {
      const validRows = g.specKeys.filter(key => withDetails.some(p => getSpec(p,key)));
      if (!validRows.length) return;
      specRowsHTML += `<div class="na-cmp-cat-hdr">${esc(g.label)}</div>`;
      validRows.forEach(key => {
        const vals = withDetails.map(p => getSpec(p,key)||'\u2014');
        specRowsHTML += `<div class="na-cmp-spec-row">
          <div class="na-cmp-spec-label">${esc(key)}</div>
          <div class="na-cmp-spec-vals">${vals.map(v=>`<div class="na-cmp-spec-val">${esc(v)}</div>`).join('')}</div>
        </div>`;
      });
    });

    // CTA row
    const ctasHTML = withDetails.map(p =>
      `<a href="${esc(p.url||'#')}" target="_blank" class="na-cmp-cta-btn">View on noon \u2197</a>`
    ).join('');

    // Sticky product headers — outside the scrollable grid, always visible
    const stickyHdrs = root.querySelector('#na-cmp-sticky-hdrs');
    if(stickyHdrs) stickyHdrs.innerHTML = `<div class="na-cmp-headers">${headerCols}</div>`;

    compareGrid.innerHTML = `
      <div class="na-cmp-specs">${specRowsHTML}</div>
      <div class="na-cmp-ctas">${ctasHTML}</div>`;

    compareLoading.style.display = 'none';

    // Claude verdict
    // Verdict goes inside grid so it scrolls with specs
    compareGrid.innerHTML += `<div id="na-cmp-verdict-slot" class="na-cmp-verdict-box"><div class="na-ai-loading" style="padding:10px 0"><span></span><span></span><span></span></div></div>`;
    compareSummary.innerHTML = ''; // clear — not used

    try {
      const productSummaries = withDetails.map((p,i) => {
        const specs = (p.details.specs||[]).slice(0,14).map(([l,v])=>l+': '+v).join(', ');
        const revs = p.details.noonSummary ? 'Reviews: '+p.details.noonSummary.slice(0,2).join('; ') : '';
        return (i+1)+'. '+p.name+'\n   Price: '+p.price+(p.rating?' | Rating: '+p.rating:'')+'\n   Specs: '+(specs||'not available')+'\n   '+revs;
      }).join('\n\n');

      const raw = await callClaude([{role:'user', content:
        'Compare these products and respond ONLY with valid JSON:\n\n'+productSummaries+'\n\n'+
        '{"winner":"exact product name","why":"2-3 sentences — what makes it clearly better, cite specific specs","breakdown":[{"name":"short name","tag":"Best Value or Best Performance or Budget Pick or Premium Choice or Most Balanced","summary":"1 sentence on who this is for"}]}'
      }], 700, 'Spec-sharp product analyst. Brutally honest, cites data, no hedging.');

      let verdict = null;
      try { const clean=raw.trim().replace(/^```json\s*/,'').replace(/\s*```$/,''); verdict=JSON.parse(clean); }
      catch(e) { const m=raw.match(/\{[\s\S]*\}/); if(m) try{verdict=JSON.parse(m[0]);}catch(e2){} }

      if (verdict) {
        const tagColors = {'Best Value':'#166534','Best Performance':'#1e40af','Budget Pick':'#92400e','Premium Choice':'#581c87','Most Balanced':'#1f5c5c'};
        const bdHTML = (verdict.breakdown||[]).map(b => {
          const col = tagColors[b.tag] || '#444';
          return `<div class="na-cmp-bd-item">
            <span class="na-cmp-bd-tag" style="background:${col}20;color:${col}">${esc(b.tag||'')}</span>
            <span class="na-cmp-bd-name">${esc(b.name||'')}</span>
            <p class="na-cmp-bd-sum">${esc(b.summary||'')}</p>
          </div>`;
        }).join('');
        const vslot = compareGrid.querySelector('#na-cmp-verdict-slot');
        if (vslot) vslot.outerHTML = `
          <div class="na-cmp-verdict-box">
            <div class="na-cmp-verdict-hdr">
              <span class="na-cmp-verdict-label">\u2736 Claude's Pick</span>
              <span class="na-cmp-verdict-winner">${esc(verdict.winner||'')}</span>
            </div>
            <p class="na-cmp-verdict-why">${esc(verdict.why||'')}</p>
            ${bdHTML ? '<div class="na-cmp-breakdown">'+bdHTML+'</div>' : ''}
          </div>`;
      } else {
        const vslot2=compareGrid.querySelector('#na-cmp-verdict-slot'); if(vslot2) vslot2.innerHTML='<p style="font-size:12px;color:#999;padding:12px">Could not parse verdict.</p>';
      }
    } catch(e) {
      const vslot3=compareGrid.querySelector('#na-cmp-verdict-slot'); if(vslot3) vslot3.innerHTML='<p style="font-size:12px;color:#999;padding:12px">API error loading verdict.</p>';
    }
  }

  // ── DETAIL SHEET ──
  detailOverlay.addEventListener('click', closeDetailSheet);

  function openDetailSheet(btn) {
    let p; try { p = JSON.parse(btn.dataset.product); } catch(e){ return; }
    btn.style.background='var(--k)'; btn.style.color='white';

    const imgHtml = p.img
      ? `<img src="${esc(p.img)}" alt="${esc(p.name)}" style="width:100%;height:100%;object-fit:contain;padding:6px" onerror="this.style.display='none'">`
      : '\u{1F4E6}';
    const discHtml = p.disc ? `<span class="na-sheet-disc">${esc(p.disc)} off</span>` : '';
    const dealHtml = p.dealTag ? `<div class="na-deal-tag" style="margin-top:4px">\u{1F3F7}\uFE0F ${esc(p.dealTag)}</div>` : '';

    detailContent.innerHTML = `
      <div class="na-sheet-phdr">
        <div class="na-sheet-pimg">${imgHtml}</div>
        <div class="na-sheet-pinfo">
          <div class="na-sheet-pname">${esc(p.name)}</div>
          <div class="na-sheet-prices">
            <span class="na-sheet-price">${esc(p.price)}</span>
            ${p.oldPrice ? `<span class="na-sheet-price-old">${esc(p.oldPrice)}</span>` : ''}
            ${discHtml}
          </div>
          ${p.rating ? `<div class="na-sheet-rating">\u2B50 ${esc(p.rating)}</div>` : ''}
          ${dealHtml}
        </div>
      </div>
      <div id="na-specs-area"><div class="na-ai-loading" style="padding:16px 0"><span></span><span></span><span></span></div></div>
      <div class="na-ai-box" style="margin-top:14px">
        <div class="na-ai-label">\u2736 Claude's take</div>
        <div id="na-ai-area"><div class="na-ai-loading"><span></span><span></span><span></span></div></div>
      </div>
      <div class="na-sheet-ctas">
        <button class="na-sheet-btn-s" onclick="document.getElementById('na-detail-sheet').classList.remove('na-sheet-open');document.getElementById('na-detail-overlay').classList.remove('na-detail-overlay-show')">\u2190 Back</button>
        <button class="na-sheet-btn-p" onclick="window.open('${esc(p.url)}','_blank')">View on noon \u2197</button>
      </div>`;

    detailOverlay.classList.add('na-detail-overlay-show');
    detailSheet.classList.add('na-sheet-open');

    fetchProductDetails(p.url).then(details => {
      const allSpecs = details.specs.length > 0 ? details.specs : (p.specs||[]);

      // ── RENDER SPECS: Option D — Hero cards + compact list ──
      const specsArea = root.querySelector('#na-specs-area');
      if (specsArea) {
        if (allSpecs.length === 0) {
          specsArea.innerHTML = '<div style="font-size:11px;color:#999;padding:8px 0">Specs not available</div>';
        } else {
          // Group specs by category using keyword matching
          const groupDefs = [
            { label: '📺 Display',       keys: ['screen','size','diagonal','resolution','display','refresh','hz','panel','uled','oled','amoled','qled','ips','lcd','fhd','qhd','4k','8k','nit','brightness','contrast','aspect'] },
            { label: '⚡ Performance',   keys: ['ram','memory','processor','chip','cpu','gpu','snapdragon','exynos','m4','a16','a17','a18','ghz','core','benchmark','storage','internal','ssd','rom','capacity'] },
            { label: '🔋 Battery',       keys: ['battery','mah','charging','watt','power','wired','wireless','charge'] },
            { label: '📷 Camera',        keys: ['camera','mp','megapixel','aperture','zoom','lens','optical','video','fps','sensor','flash','selfie','front','rear','photo'] },
            { label: '🔌 Connectivity',  keys: ['hdmi','usb','wifi','wi-fi','bluetooth','nfc','5g','4g','lte','sim','esim','network','ethernet','port','connector','jack','audio'] },
            { label: '📦 Physical',      keys: ['weight','kg','gram','height','width','length','depth','dimension','colour','color','material','finish','box','in the box','include'] },
            { label: '🛠 General',       keys: [] }, // catch-all
          ];

          const groups = groupDefs.map(g => ({ ...g, specs: [] }));
          const assigned = new Set();

          allSpecs.forEach(([l, v], i) => {
            const search = (l + ' ' + v).toLowerCase();
            let placed = false;
            for (const g of groups.slice(0, -1)) {
              if (g.keys.some(k => search.includes(k))) {
                g.specs.push([l, v]);
                assigned.add(i);
                placed = true;
                break;
              }
            }
            if (!placed) groups[groups.length - 1].specs.push([l, v]);
          });

          const activeGroups = groups.filter(g => g.specs.length > 0);

          specsArea.innerHTML = activeGroups.map((g, gi) => {
            const isFirst = gi === 0;
            const rows = g.specs.map(([l, v]) =>
              `<div class="na-acc-row"><span class="na-acc-l">${esc(l)}</span><span class="na-acc-v">${esc(v)}</span></div>`
            ).join('');
            return `
              <div class="na-acc-group">
                <div class="na-acc-hdr ${isFirst ? 'na-acc-open' : ''}" onclick="this.classList.toggle('na-acc-open');this.nextElementSibling.classList.toggle('na-acc-body-open')">
                  <span>${esc(g.label)}</span>
                  <span class="na-acc-count">${g.specs.length}</span>
                  <span class="na-acc-arrow">▾</span>
                </div>
                <div class="na-acc-body ${isFirst ? 'na-acc-body-open' : ''}">\<div>${rows}</div></div>
              </div>`;
          }).join('');
        }
      }

      // ── BUILD CLAUDE PROMPT ──
      const specsText = allSpecs.map(([l,v]) => `${l}: ${v}`).join(', ');
      const descText  = details.description ? `\nDescription: ${details.description.slice(0,400)}` : '';

      const productContext = `Product: ${p.name}\nPrice: ${p.price}${p.oldPrice?' (was '+p.oldPrice+')':''}\nRating: ${p.rating||details.avgRating||'N/A'}\nSpecs: ${specsText||'Not available'}${descText}`;

      // Build review context smartly — split good vs bad reviews for Claude
      const goodRevs = details.reviews.filter(r=>r.rating>=4).slice(0,6);
      const badRevs  = details.reviews.filter(r=>r.rating&&r.rating<=3).slice(0,4);
      let reviewInsight = '';
      if (details.noonSummary && details.noonSummary.length) {
        reviewInsight = '\n\nNoon AI summary of ' + (details.reviewCount||'many') + ' reviews (avg ' + (details.avgRating||'?') + '\u2605):\n' + details.noonSummary.map(s => '- ' + s).join('\n');
      } else if (goodRevs.length || badRevs.length) {
        if (goodRevs.length) reviewInsight += '\n\nPositive reviews:\n' + goodRevs.map((r,i) => (i+1)+'. ['+r.rating+'\u2605] "'+r.body.slice(0,200)+'"').join('\n');
        if (badRevs.length) reviewInsight += '\n\nCritical reviews:\n' + badRevs.map((r,i) => (i+1)+'. ['+r.rating+'\u2605] "'+r.body.slice(0,200)+'"').join('\n');
      } else if (details.reviews.length) {
        reviewInsight = '\n\nCustomer reviews (' + (details.reviewCount||details.reviews.length) + ' total, avg ' + (details.avgRating||'?') + '\u2605):\n' + details.reviews.slice(0,8).map((r,i) => (i+1)+'. "'+r.body.slice(0,200)+'"').join('\n');
      }

      const fullContext = `${productContext}${reviewInsight}`;

      callClaude([{role:'user', content:
        `You are a sharp product analyst. Based ONLY on the actual specs and reviews provided, give:\n` +
        `1. "verdict": 2-3 sentences — who it's genuinely for, real value prop\n` +
        `2. "pros": 3-4 bullets — cite specific specs or quote review sentiment (no generic praise)\n` +
        `3. "cons": 2-3 bullets — real trade-offs from specs or negative reviews (no made-up issues)\n\n` +
        `IMPORTANT: Only mention things grounded in the data below. If reviews are limited, say so in cons.\n\n` +
        `${fullContext}\n\n` +
        `Respond ONLY with valid JSON: {"verdict":"...","pros":["...","...","..."],"cons":["...","..."]}`
      }], 800)
        .then(raw => {
          let verdict='', pros=[], cons=[];
          try {
            const clean = raw.trim().replace(/^```json\s*/,'').replace(/\s*```$/,'');
            const parsed = JSON.parse(clean);
            verdict = parsed.verdict || '';
            pros = parsed.pros || [];
            cons = parsed.cons || [];
          } catch(e) {
            const m = raw.match(/\{[\s\S]*\}/);
            if(m) try { const o=JSON.parse(m[0]); verdict=o.verdict||''; pros=o.pros||[]; cons=o.cons||[]; } catch(e2){}
          }

          const area = root.querySelector('#na-ai-area');
          if (!area) return;

          let html = '';
          if (verdict) html += `<p class="na-ai-verdict">${esc(verdict)}</p>`;

          if (pros.length) {
            html += `<div class="na-review-section">
              <div class="na-review-sec-label na-pros-label">\u{1F44D} What's good</div>
              <ul class="na-ai-bullets">
                ${pros.map((b,i)=>`<li style="animation-delay:${i*0.1}s"><span class="na-bullet-check na-check-green">\u2713</span><span>${esc(b)}</span></li>`).join('')}
              </ul>
            </div>`;
          }
          if (cons.length) {
            html += `<div class="na-review-section" style="margin-top:10px">
              <div class="na-review-sec-label na-cons-label">\u{1F914} Watch out for</div>
              <ul class="na-ai-bullets">
                ${cons.map((b,i)=>`<li style="animation-delay:${(pros.length+i)*0.1}s"><span class="na-bullet-check na-check-amber">\u2013</span><span>${esc(b)}</span></li>`).join('')}
              </ul>
            </div>`;
          }
          if (!html) html = `<div style="font-size:11px;color:#999">Could not load Claude's take.</div>`;
          area.innerHTML = html;
        })
        .catch(() => {
          const area = root.querySelector('#na-ai-area');
          if (area) area.innerHTML = '<div style="font-size:11px;color:#999">API error.</div>';
        });
    });
  }


  function closeDetailSheet() {
    detailOverlay.classList.remove('na-detail-overlay-show');
    detailSheet.classList.remove('na-sheet-open');
    // reset any pressed star buttons
    msgs.querySelectorAll('.na-star-btn').forEach(b=>{ b.style.background=''; b.style.color=''; });
  }

  // Animate ✦ buttons when new cards appear — pop, wiggle, pulse
  function animateStarBtns(container) {
    const btns = container.querySelectorAll('.na-star-btn');
    btns.forEach((btn, i) => {
      btn.style.opacity='0'; btn.style.transform='scale(0)';
      setTimeout(()=>{
        btn.style.transition='none';
        btn.style.animation=`na-star-pop 0.42s cubic-bezier(.34,1.56,.64,1) forwards`;
        setTimeout(()=>{
          btn.style.animation='na-star-wiggle 0.45s ease 2';
          btn.style.opacity='1'; btn.style.transform='scale(1)';
          setTimeout(()=>{
            btn.style.animation='na-star-pulse 1.1s ease 3';
            setTimeout(()=>{ btn.style.animation=''; }, 3400);
          }, 950);
        }, 460);
      }, 450 + i*140);
    });
  }

  function showToast(msg){const t=mk('div','na-system-msg');t.textContent=msg;msgs.appendChild(t);scrollBottom();setTimeout(()=>t.remove(),2500);}
  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function mk(tag,cls){const el=document.createElement(tag);el.className=cls;return el;}
  function scrollBottom(){setTimeout(()=>msgs.scrollTop=msgs.scrollHeight,60);}
  function botSVG(){return`<svg width="11" height="11" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12c0 2.1.67 4.04 1.81 5.63L2 22l4.37-1.81C7.96 21.33 9.9 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/></svg>`;}
  // ════════════════════════════════════════════════
  // CORE — all runs directly here, no service worker
  // ════════════════════════════════════════════════

  const CLAUDE_API_KEY = "YOUR_API_KEY_HERE";
  const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
  const SYSTEM_PROMPT = `You are a sharp, friendly noon.com shopping assistant. Real person energy — warm, direct, no corporate speak.
Tone: contractions ("you'll", "it's", "don't"), real opinions, NEVER say "Great choice!" "Absolutely!" "Certainly!". React to what the user ACTUALLY said — if they want budget options, lead with value; if they want premium, lead with quality. Keep responses grounded in what the data actually shows.
ALWAYS respond with ONLY valid JSON (no markdown, no extra text):
{"heading":"Men\'s Wallets","message":"1-2 casual sentences","show_products":true,"products":[{"name":"exact product name from data","price":"AED 149","old_price":"AED 249","rating":"4.7 \u2605 (1,234)","deal_tag":"Mega Deal","url":"https://www.noon.com/uae-en/-/SKU/p/","image_url":"https://f.nooncdn.com/p/pnsku/SKU/..."}],"quick_replies":["specific option 1","specific option 2"]}

CATALOG GROUNDING — CRITICAL:
- ONLY include products from the [DATA] block I provide. Never invent names, prices, specs, or ratings.
- If the data says "No products found" → set products:[] and ask ONE clarifying question.
- If a product the user asked for is not in the data → say it\'s not available and suggest the closest match from what IS in the data.
- Never show a product card for something that doesn\'t appear in the [DATA] block.
- Never generate synthetic prices, discounts, RAM specs, or storage — only use what\'s in the data.

show_products: Set true when user wants to browse/buy products (searching, filtering, "show me", deals, category exploration). Set false when user asks a question or needs advice (e.g. "what's the return policy?", "is this a good deal?", "what should I look for?", "tell me more about this"). When false: set products:[], write a helpful conversational answer, and use quick_reply chips to lead back to shopping.
heading: 2-4 title-case words matching what was found e.g. "Gaming Consoles", "Budget Laptops Under 2K". Leave empty when show_products is false.
quick_replies: 2-3 follow-ups that feel like a natural next step for THIS specific conversation. Rules:
- Match the category: phones → "Show me Samsung options" / "Under AED 1000?" / "What about refurbished?"
- After a text-only answer → guide back to browsing e.g. "Show me options" / "Under AED 500?"
- Match the context: if user asked for deals → refine by category or price range; if comparing → "What about battery life?" 
- Never suggest something already answered. Never use generic chips like "Show more" or "Tell me more".
- Sound like a real person continuing the conversation, not a menu.

RULES: image_url = https://f.nooncdn.com/p/ + image_key + .jpg. url = https://www.noon.com/uae-en/-/ + catalog_sku (strip -1/-2 suffix) + /p/. Max 6 products.`;

  const DEAL_FILTERS = {
    'ramadan deal':'ramadan-ready', ramadan:'ramadan-ready',
    'mega deal':'mega-deal', mega:'mega-deal',
    '11.11':'11-11-deal', '11 11':'11-11-deal',
    '10.10':'10-10-sale',
    'end of year':'end-of-year-sale',
    'white friday':'white-friday', 'white fri':'white-friday',
    'flash deal':'flash-deal', flash:'flash-deal',
    'clearance':'clearance-sale', clearance:'clearance-sale',
    'eid':'eid-deal', 'national day':'national-day-deal',
    'back to school':'back-to-school',
  };
  // For dynamically-loaded deal chips, the data-deal-slug attr is the canonical slug
  function getDealSlugFromChip(btn) {
    return btn?.dataset?.dealSlug || null;
  }

  // Ordered list for UI — label, query string, emoji
  const DEAL_MENU = [
    { label:'Mega Deal',     query:'mega deal',     emoji:'📣' },
    { label:'Ramadan Deal',  query:'ramadan deal',  emoji:'🌙' },
    { label:'Flash Deal',    query:'flash deal',    emoji:'⚡' },
    { label:'11.11 Deal',    query:'11.11 deal',    emoji:'🔥' },
    { label:'White Friday',  query:'white friday',  emoji:'🏷️' },
    { label:'Clearance',     query:'clearance',     emoji:'🧹' },
  ];
  const CATEGORY_MAP = {
    laptops:'laptops-computers/laptops',laptop:'laptops-computers/laptops',
    phones:'mobiles-tablets/smartphones',phone:'mobiles-tablets/smartphones',
    mobiles:'mobiles-tablets/smartphones',mobile:'mobiles-tablets/smartphones',
    tvs:'electronics/televisions',tv:'electronics/televisions',
    headphones:'electronics/headphones',earbuds:'electronics/earphones-earbuds',
    tablets:'mobiles-tablets/tablets',tablet:'mobiles-tablets/tablets',
    watches:'wearables/smart-watches',watch:'wearables/smart-watches',
    camera:'cameras/digital-cameras',cameras:'cameras/digital-cameras',
    toys:'baby-kids/educational-toys',baby:'baby-kids',fridge:'home-appliances/refrigerators',
    ac:'home-appliances/air-conditioners',
  };


  // Emoji map for deal labels
  const DEAL_EMOJI = {
    'mega deal':'📣','ramadan deal':'🌙','ramadan':'🌙',
    'flash deal':'⚡','11.11':'🔥','11-11':'🔥',
    'white friday':'🏷️','clearance':'🧹','clearance sale':'🧹',
    'eid deal':'🌙','national day':'🇦🇪','back to school':'🎒',
    'end of year':'🎉','10.10':'🔟','sale':'💸',
  };
  function getDealEmoji(label) {
    const l = label.toLowerCase();
    for (const [k,v] of Object.entries(DEAL_EMOJI)) if (l.includes(k)) return v;
    return '🏷️';
  }

  // Convert display label to noon URL slug: "Ramadan Deal 🌙" → "ramadan-deal"
  function dealLabelToSlug(label) {
    return label
      .replace(/[\u{1F300}-\u{1FFFF}\u{2600}-\u{27FF}]/gu, '') // strip emoji
      .trim().toLowerCase()
      .replace(/[^a-z0-9\s]/g,'')
      .trim().replace(/\s+/g,'-')
      .replace(/-+/g,'-').replace(/^-|-$/g,'');
  }
  // Normalise deal text for comparison
  function normDeal(text) {
    return text.replace(/[\u{1F300}-\u{1FFFF}\u{2600}-\u{27FF}]/gu,'')
      .replace(/[^\w\s]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
  }

  async function fetchLiveDeals() {
    const container = document.getElementById('na-deal-chips-container');
    const dealLabel = document.getElementById('na-deals-label');
    if (!container) return;
    try {
      // Use properly encoded sort params — square brackets must be %5B%5D in noon URLs
      const url = 'https://www.noon.com/uae-en/search/?sort%5Bby%5D=discount&sort%5Border%5D=desc&_rsc=1';
      const nextUrl = '/uae-en/search/?sort%5Bby%5D=discount&sort%5Border%5D=desc';
      const res = await fetch(url, {
        headers:{ 'RSC':'1','Next-Router-State-Tree':'%5B%22%22%2C%7B%7D%5D','Next-Url':nextUrl,'Accept':'*/*' }
      });
      const text = await res.text();
      console.log('[NA] fetchLiveDeals RSC status:', res.status, 'len:', text.length);

      // Extract deal slugs from URL-encoded routing: f%5Bdeal_tag%5D%5B%5D=SLUG
      const dealMap = new Map();
      const slugRe = /f%5Bdeal_tag%5D%5B%5D=([a-z0-9-]+)/g;
      let m;
      while ((m = slugRe.exec(text)) !== null) {
        if (!dealMap.has(m[1])) dealMap.set(m[1], null);
      }

      // Extract deal_tag text values from product objects
      const dealTexts = [];
      const textRe = /"deal_tag"\s*:\s*\{[^}]{0,300}"text"\s*:\s*"([^"]+)"/g;
      while ((m = textRe.exec(text)) !== null) {
        const raw = m[1].replace(/\\u([0-9a-fA-F]{4})/g, (_,h)=>String.fromCodePoint(parseInt(h,16)));
        const clean = raw.replace(/[\u{1F000}-\u{1FFFF}\u2600-\u27FF\uFE0F]/gu,'').trim();
        if (clean.length > 1 && !dealTexts.includes(clean)) dealTexts.push(clean);
      }
      console.log('[NA] slugs:', [...dealMap.keys()], 'texts:', dealTexts);

      // Match texts to slugs
      for (const [slug] of dealMap) {
        const kw = slug.split('-')[0];
        const match = dealTexts.find(t => t.toLowerCase().includes(kw));
        dealMap.set(slug, match || slug.replace(/-/g,' ').replace(/\b\w/g,ch=>ch.toUpperCase()));
      }

      // Always ensure known deals are present if their text appeared
      const ensureSlug = (slug, kw, fallbackLabel) => {
        if (!dealMap.has(slug)) {
          const match = dealTexts.find(t=>t.toLowerCase().includes(kw));
          if (match || dealTexts.length === 0) dealMap.set(slug, match || fallbackLabel);
        }
      };
      ensureSlug('ramadan-ready','ramadan','Ramadan Deal');
      ensureSlug('mega-deal','mega','Mega Deal');
      ensureSlug('flash-deal','flash','Flash Deal');

      const results = [...dealMap.entries()].filter(([s,l])=>s&&l).map(([slug,display])=>({slug,display}));
      console.log('[NA] final chips:', results);
      if (results.length === 0) throw new Error('no deals');

      container.innerHTML = results.slice(0,6).map(({slug,display}) => {
        const emoji = getDealEmoji(display);
        const clean = display.replace(/[\u{1F000}-\u{1FFFF}\u2600-\u27FF\uFE0F]/gu,'').trim();
        return '<button class="na-chip na-chip-deal" data-query="'+esc(clean)+'" data-deal-slug="'+esc(slug)+'" data-deal-text="'+esc(clean)+'">'+emoji+' '+esc(clean)+'</button>';
      }).join('');
      if (dealLabel) dealLabel.style.display = '';
    } catch(e) {
      console.warn('[NA] fetchLiveDeals error:', e.message);
      container.innerHTML = [
        {slug:'ramadan-ready',label:'Ramadan Deal',emoji:'\uD83C\uDF19'},
        {slug:'mega-deal',label:'Mega Deal',emoji:'\uD83D\uDCE3'},
        {slug:'flash-deal',label:'Flash Deal',emoji:'\u26A1'},
      ].map(({slug,label,emoji})=>
        '<button class="na-chip na-chip-deal" data-query="'+label+'" data-deal-slug="'+slug+'" data-deal-text="'+label+'">'+emoji+' '+label+'</button>'
      ).join('');
      if (dealLabel) dealLabel.style.display = '';
    }
  }

  function extractQuery(msg) {
    const skip = new Set(['i','need','want','a','an','the','find','me','show','help','get','please','can','you','looking','for','some','good','is','any','what','how','which','do','have','best','top','cheap','under','around','about']);
    const words = msg.toLowerCase().replace(/[^a-z0-9\s]/g,'').split(/\s+/).filter(w=>w.length>1&&!skip.has(w));
    const chat = new Set(['yes','no','ok','okay','sure','thanks','hi','hey','hello','it','that','this','great','nice','cool','awesome']);
    if (!words.length || words.every(w=>chat.has(w))) return null;
    return words.slice(0,6).join(' ');
  }

  function getDealFilter(q) {
    const ql = q.toLowerCase();
    for (const [k,v] of Object.entries(DEAL_FILTERS)) if (ql.includes(k)) return v;
    return null;
  }

  async function searchNoon(query, explicitDealSlug=null, explicitDealText=null) {
    try {
      const dealFilter = explicitDealSlug || getDealFilter(query);
      const dealText = explicitDealText || null; // exact noon text e.g. 'Ramadan Deal 🌙'
      let url;
      if (dealFilter) {
        // Strip deal keywords from query to get the product part (e.g. "speakers on mega deal" → "speakers")
        const dealKeywords = ['mega deal','ramadan deal','flash deal','11.11 deal','white friday','clearance','mega','ramadan','flash','clearance','deal'];
        let productQuery = query.toLowerCase();
        for (const kw of dealKeywords) productQuery = productQuery.replace(new RegExp('\\b'+kw+'\\b','gi'), '').replace(/\bon\b/gi,'').trim();
        productQuery = productQuery.replace(/\s+/g,' ').trim();
        const qParam = productQuery ? `&q=${encodeURIComponent(productQuery)}` : '';
        // Sort by biggest discount so best deals surface first
        const sortParams = productQuery ? '' : '&sort[by]=discount&sort[order]=desc';
        url = `https://www.noon.com/uae-en/search/?f[deal_tag][]=${encodeURIComponent(dealFilter)}${qParam}${sortParams}&_rsc=1`;
      } else {
        const cat = CATEGORY_MAP[query.toLowerCase().trim()];
        url = cat
          ? `https://www.noon.com/uae-en/${cat}/?_rsc=1`
          : `https://www.noon.com/uae-en/search/?q=${encodeURIComponent(query)}&_rsc=1`;
      }
      const nextUrl = new URL(url).pathname + new URL(url).search.replace('_rsc=1&','').replace('&_rsc=1','').replace('?_rsc=1','');
      const res = await fetch(url, { headers:{ 'RSC':'1', 'Next-Router-State-Tree':'%5B%22%22%2C%7B%7D%5D', 'Next-Url':nextUrl, 'Accept':'*/*' }});
      const text = await res.text();
      console.log('[NA] noon search URL:', url);
      console.log('[NA] noon search:', res.status, text.length, 'chars | has products:', text.includes('catalog_sku'), '| has deal_tag:', text.includes('deal_tag'));
      return parseNoonRSC(text, dealFilter || null, dealText || null);
    } catch(e) { console.warn('[NA] noon search failed:', e.message); return []; }
  }

  async function fetchProductDetails(productUrl) {
    const empty = { specs: [], reviews: [], noonSummary: null, reviewCount: 0, avgRating: 0, description: '' };
    try {
      const url = productUrl.split('?')[0] + '?_rsc=1';
      const nextUrl = new URL(productUrl).pathname;
      const res = await fetch(url, { headers:{
        'RSC':'1',
        'Next-Router-State-Tree':'%5B%22%22%2C%7B%7D%5D',
        'Next-Url': nextUrl,
        'Accept':'*/*',
        'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }});
      const text = await res.text();
      console.log('[NA] PDP fetch:', res.status, text.length, 'chars, has catalog_sku:', text.includes('catalog_sku'), 'has label:', text.includes('"label"'));

      const details = { ...empty };

      // ── 1. SPECS: noon PDP RSC has plp_specifications as [{label,value},...] ──
      // Strategy A: find the biggest plp_specifications array
      const seenKeys = new Set();
      const addSpec = (l, v) => {
        const k = String(l).toLowerCase().trim();
        if (!seenKeys.has(k) && l && v && String(v) !== 'null' && String(l).length < 80) {
          seenKeys.add(k);
          details.specs.push([String(l), String(v)]);
        }
      };

      // Try to find plp_specifications JSON array directly
      const plpMatches = [...text.matchAll(/"plp_specifications"\s*:\s*(\[[^\]]{0,20000}\])/gs)];
      let bestPlp = null;
      for (const m of plpMatches) {
        try {
          const arr = JSON.parse(m[1]);
          if (Array.isArray(arr) && arr.length > (bestPlp?.length||0)) bestPlp = arr;
        } catch(e) {}
      }
      if (bestPlp) {
        bestPlp.forEach(s => addSpec(s.label, s.value));
        console.log('[NA] plp_specifications:', bestPlp.length, 'entries');
      }

      // Strategy B: find any specifications/attributes array
      if (details.specs.length < 3) {
        for (const key of ['"specifications"', '"attributes"', '"features"']) {
          const re = new RegExp(key + '\\s*:\\s*(\\[[^\\]]{0,20000}\\])', 'gs');
          for (const m of text.matchAll(re)) {
            try {
              const arr = JSON.parse(m[1]);
              if (Array.isArray(arr)) arr.forEach(s => addSpec(s.label||s.name||s.key, s.value));
            } catch(e) {}
          }
        }
      }

      // Strategy C: scan all {label:x, value:y} pairs in entire RSC text
      if (details.specs.length < 3) {
        for (const [,l,v] of text.matchAll(/\{"label":"([^"]{1,60})","value":"([^"]{1,200})"\}/g)) addSpec(l,v);
        for (const [,v,l] of text.matchAll(/\{"value":"([^"]{1,200})","label":"([^"]{1,60})"\}/g)) addSpec(l,v);
        for (const [,l,v] of text.matchAll(/\{"name":"([^"]{1,60})","value":"([^"]{1,200})"\}/g)) addSpec(l,v);
      }

      console.log('[NA] total specs found:', details.specs.length);

      // ── 2. NOON AI REVIEW SUMMARY ──
      // noon embeds "summary_points" in their RSC for the reviews section
      for (const re of [
        /"summary_points"\s*:\s*(\[[^\]]{10,5000}\])/gs,
        /"highlights"\s*:\s*(\[[^\]]{10,5000}\])/gs,
        /"keyPoints"\s*:\s*(\[[^\]]{10,5000}\])/gs,
      ]) {
        for (const m of text.matchAll(re)) {
          try {
            const pts = JSON.parse(m[1]);
            if (Array.isArray(pts) && pts.length > 0) {
              const mapped = pts.map(p => typeof p === 'string' ? p : (p.text||p.point||p.summary||'')).filter(s=>s.length>10);
              if (mapped.length > 0 && (!details.noonSummary || mapped.length > details.noonSummary.length)) {
                details.noonSummary = mapped;
              }
            }
          } catch(e) {}
        }
      }

      // ── 3. INDIVIDUAL REVIEWS with ratings ──
      // Noon review objects: {"id":...,"body":"...","overall_rating":4,...}
      const reviewRe = /\{"[^{}]{0,200}"overall_rating"\s*:\s*([\d.]+)[^{}]{0,500}"body"\s*:\s*"([^"]{15,600})"[^{}]{0,200}\}|\{"[^{}]{0,200}"body"\s*:\s*"([^"]{15,600})"[^{}]{0,500}"overall_rating"\s*:\s*([\d.]+)[^{}]{0,200}\}/g;
      for (const m of text.matchAll(reviewRe)) {
        const rating = parseFloat(m[1]||m[4]);
        const body = (m[2]||m[3]||'').replace(/\\n/g,' ').replace(/\\"/g,'"').replace(/\\u[\da-f]{4}/gi, c => String.fromCharCode(parseInt(c.slice(2),16))).trim();
        if (body.length > 15 && details.reviews.length < 25) details.reviews.push({ body, rating });
      }
      // Fallback body-only scan
      if (details.reviews.length === 0) {
        for (const [,body] of text.matchAll(/"body"\s*:\s*"([^"]{15,500})"/g)) {
          details.reviews.push({ body: body.replace(/\\n/g,' ').trim(), rating: null });
          if (details.reviews.length >= 20) break;
        }
      }

      // ── 4. REVIEW COUNT + AVG RATING ──
      const cntM = text.match(/"review_count"\s*:\s*(\d+)|"total_reviews"\s*:\s*(\d+)|"count"\s*:\s*(\d+)/);
      if (cntM) details.reviewCount = parseInt(cntM[1]||cntM[2]||cntM[3]||0);
      const ratM = text.match(/"average_rating"\s*:\s*([\d.]+)/);
      if (ratM) details.avgRating = parseFloat(ratM[1]);

      // ── 5. DESCRIPTION ──
      const descM = text.match(/"description"\s*:\s*"([^"]{30,3000})"/);
      if (descM) details.description = descM[1].replace(/\\n/g,' ').replace(/\\t/g,' ').replace(/\\"/g,'"').replace(/\\u[\da-f]{4}/gi, c => String.fromCharCode(parseInt(c.slice(2),16))).trim().slice(0,1200);

      console.log('[NA] PDP parsed:', details.specs.length, 'specs |', details.reviews.length, 'reviews | noonSummary:', details.noonSummary?.length||0, 'pts | reviewCount:', details.reviewCount);
      return details;
    } catch(e) {
      console.warn('[NA] PDP fetch failed:', e.message);
      return empty;
    }
  }


  function parseNoonRSC(text, requiredDealSlug=null, requiredDealText=null) {
    if (!text || text.length < 100) return [];
    // 🔍 DIAGNOSTIC: what deal_tag values exist in this RSC payload?
    const allDealTags = [...text.matchAll(/"deal_tag"\s*:\s*\{[^}]*"text"\s*:\s*"([^"]+)"/g)].map(m=>m[1]);
    const flatDealTags = [...text.matchAll(/"deal_tag"\s*:\s*"([^"]+)"/g)].map(m=>m[1]);
    console.log('[NA RSC] requiredDealSlug:', requiredDealSlug, '| requiredDealText:', requiredDealText);
    console.log('[NA RSC] deal_tag values in payload:', [...new Set([...allDealTags,...flatDealTags])].slice(0,10));
    const products = [], seen = new Set();
    const pat = /\{"offer_code":"[^"]+","catalog_sku":/g;
    let m;
    while ((m = pat.exec(text)) !== null && products.length < 8) {
      const pos = m.index;
      let depth=0, end=-1;
      for (let i=pos; i<Math.min(pos+50000,text.length); i++) {
        if(text[i]==='{') depth++;
        else if(text[i]==='}') { depth--; if(depth===0){end=i+1;break;} }
      }
      if(end===-1) continue;
      try {
        const p = JSON.parse(text.slice(pos,end));
        if(p.catalog_sku && p.name && !seen.has(p.catalog_sku)) {
          // If a deal filter is active, only keep products carrying that deal tag
          if (requiredDealSlug) {
            // Noon's URL filter (f[deal_tag][]=slug) already filters server-side.
            // Only do client-side rejection if the product explicitly has a DIFFERENT deal tag.
            // Don't reject products with no deal_tag field — they may still be deal products.
            const rawTag = p.deal_tag?.text || p.deal_tag || '';
            if (rawTag) {
              const normTag = rawTag.replace(/[\u{1F300}-\u{1FFFF}\u{2600}-\u{27FF}\u{200D}\uFE0F]/gu,'').trim().toLowerCase();
              const keyword = requiredDealSlug.split('-')[0]; // "ramadan", "mega", "flash"
              // Only skip if it explicitly has a DIFFERENT deal (e.g. "mega deal" when we want "ramadan")
              if (!normTag.includes(keyword) && keyword !== 'flash') {
                // Be lenient — keyword 'ramadan' should match 'ramadan ready', 'ramadan deal', etc.
                const slugKeywords = requiredDealSlug.split('-').filter(w=>w.length>3); // ['ramadan','ready']
                const anyMatch = slugKeywords.some(kw => normTag.includes(kw));
                if (!anyMatch) { continue; }
              }
            }
            // No deal_tag on product? Trust noon's server-side filter — keep it.
          }
          seen.add(p.catalog_sku);
          // Sanitize specs
          let specs = p.plp_specifications;
          if(!specs||typeof specs!=='object') specs=[];
          else if(!Array.isArray(specs)) specs=Object.entries(specs).map(([label,value])=>({label,value}));
          specs = specs.filter(s=>s&&s.label&&s.value);
          // Build URL — noon format is: /slug/SKU/p/
          const sku = (p.catalog_sku||'').replace(/-\d+$/,'');
          let productUrl = '';
          if (p.url && sku) {
            // Combine slug + SKU: /sunscreen-hydro-.../ZE433CD9EA9EB12745D69Z/p/
            const slug = p.url.replace(/\/+$/,'');
            productUrl = `https://www.noon.com/uae-en/${slug}/${sku}/p/`;
          } else if (sku) {
            productUrl = `https://www.noon.com/uae-en/-/${sku}/p/`;
          }
          if (products.length === 0) console.log('[NA] URL built:', productUrl);
          products.push({
            ...p,
            plp_specifications: specs,
            _imageUrl: p.image_key ? `https://f.nooncdn.com/p/${p.image_key}.jpg` : '',
            _url: productUrl,
          });
        }
      } catch(e) {}
    }
    console.log('[NA]', products.length > 0 ? `✅ ${products.length} products: ${products[0].name}` : '❌ no products');
    return products;
  }

  function formatProduct(p, i) {
    const price = p.sale_price ? `AED ${p.sale_price}` : (p.price ? `AED ${p.price}` : '');
    const oldP  = (p.sale_price && p.price && p.price > p.sale_price) ? `AED ${p.price}` : '';
    const rating = p.product_rating?.value ? `${p.product_rating.value} \u2605 (${(p.product_rating.count||0).toLocaleString()})` : '';
    const specs  = (p.plp_specifications||[]).slice(0,4).map(s=>`${s.label}: ${s.value}`).join(', ');
    const deal   = p.deal_tag?.text || '';
    return `[${i+1}] name="${p.name}" price="${price}" old_price="${oldP}" rating="${rating}" deal_tag="${deal}" specs="${specs}" url="${p._url||''}" image_url="${p._imageUrl||''}"`;
  }

  function parseClaudeResponse(raw, fallback) {
    let reply='Something went wrong — try again?', products=[], quickReplies=[], heading='';
    let claudeExplicitlySetProducts = false;
    let showProducts = true;
    console.log('[NA] Claude raw:', raw?.slice(0,200));
    try {
      const clean = raw.trim().replace(/^```json\s*/,'').replace(/\s*```$/,'');
      const parsed = JSON.parse(clean);
      reply = parsed.message || reply;
      heading = parsed.heading || '';
      quickReplies = parsed.quick_replies || [];
      if (parsed.show_products === false) showProducts = false;
      if (Array.isArray(parsed.products)) { claudeExplicitlySetProducts=true; products=parsed.products; }
    } catch(e) {
      console.warn('[NA] JSON parse failed:', e.message, '| raw:', raw?.slice(0,300));
      const m = raw.match(/\{[\s\S]*\}/);
      if(m) { try { const p=JSON.parse(m[0]); reply=p.message||reply; heading=p.heading||''; quickReplies=p.quick_replies||[];
        if(p.show_products===false) showProducts=false;
        if(Array.isArray(p.products)){claudeExplicitlySetProducts=true;products=p.products;}
      }catch(e2){ console.warn('[NA] fallback parse also failed:', e2.message); } }
    }
    if (!claudeExplicitlySetProducts && fallback?.length > 0) products = fallback;
    console.log('[NA] parsed:', products.length, 'products, claudeSet:', claudeExplicitlySetProducts, 'showProducts:', showProducts);
    return { reply, products, quickReplies, heading, showProducts };
  }

  async function callClaude(messages, maxTokens=2048, system=null) {
    const apiKey = CLAUDE_API_KEY;
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') throw new Error('API key not set in content.js');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: maxTokens,
        system: system || SYSTEM_PROMPT,
        messages,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(()=>({}));
      throw new Error(err.error?.message || `Claude API error ${res.status}`);
    }
    return (await res.json()).content?.[0]?.text || '';
  }

})();
