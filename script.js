(function(){
  const CATEGORIES = [
    { name: "Active Shooter / Terrorist Attack", rank: 1, color: "var(--s1)" },
    { name: "Explosion / Bombing",               rank: 1, color: "var(--s1)" },
    { name: "Multi-Alarm Structural Fire",       rank: 2, color: "var(--s2)" },
    { name: "Building Collapse",                 rank: 2, color: "var(--s2)" },
    { name: "Hazmat / Chemical Spill",           rank: 3, color: "var(--s3)" },
    { name: "Severe Weather Emergency",          rank: 3, color: "var(--s3)" },
    { name: "Serious Medical Emergency",         rank: 4, color: "var(--s4)" },
    { name: "Gas Leak / Utility Emergency",      rank: 4, color: "var(--s4)" },
    { name: "Motor Vehicle Collision",           rank: 5, color: "var(--s5)" },
    { name: "Public Disturbance",                rank: 5, color: "var(--s5)" },
  ];
  const RANK_COLOR = { 1:"var(--s1)", 2:"var(--s2)", 3:"var(--s3)", 4:"var(--s4)", 5:"var(--s5)" };
  const RANK_LABEL = { 1:"EMERGENCY ALERT", 2:"EMERGENCY ALERT", 3:"ADVISORY", 4:"ADVISORY", 5:"ADVISORY" };
  // numeric rank still drives sorting/bundling under the hood, but the UI only ever
  // shows these words + the matching color — no "Rank N" wording anywhere
  const SEVERITY_NAME = { 1: "Critical", 2: "High", 3: "Moderate", 4: "Low", 5: "Minimal" };
  function severityLabel(rank){ return SEVERITY_NAME[rank] || `Level ${rank}`; }

  const BOROUGHS = {
    "Brooklyn": {
      facility: "PSAC I — 11 MetroTech Center, Downtown Brooklyn",
      shape: "300,300 350,290 400,295 450,300 480,330 495,370 490,410 460,440 420,460 380,470 340,460 305,440 280,410 270,375 275,340",
      marker: { x: 390, y: 385 }, label: { x: 390, y: 350 }
    },
    "Bronx": {
      facility: "PSAC II — 1200 Waters Place",
      shape: "260,40 320,25 380,20 415,55 430,100 415,140 370,155 330,150 300,145 275,120 255,85",
      marker: { x: 345, y: 95 }, label: { x: 345, y: 62 }
    },
    "Manhattan": {
      facility: "FDNY Manhattan Dispatch (relays into PSAC I)",
      shape: "280,150 300,155 306,180 304,230 308,280 302,330 296,365 286,380 274,372 266,345 262,300 258,250 260,200 268,165",
      marker: { x: 283, y: 262 }, label: { x: 195, y: 262 }
    },
    "Queens": {
      facility: "FDNY Queens Dispatch (relays into PSAC I)",
      shape: "320,110 380,95 440,85 500,90 545,110 570,150 580,200 560,250 520,280 470,300 430,290 390,270 355,240 330,200 315,160",
      marker: { x: 460, y: 195 }, label: { x: 460, y: 158 }
    },
    "Staten Island": {
      facility: "FDNY Staten Island Dispatch (relays into PSAC I)",
      shape: "70,400 110,385 150,380 185,390 205,415 215,450 205,485 180,510 145,520 110,510 80,485 65,450",
      marker: { x: 140, y: 452 }, label: { x: 140, y: 415 }
    },
  };
  const HUB = { x: 400, y: 320 };

  // atlas-style flourishes: bridge/tunnel corridors, interstate shields, landmark dots
  const HIGHWAY_LINES = [
    { d: "M283,310 L200,420 L140,452" },   // Manhattan -> Staten Island (via Verrazzano corridor, schematic)
    { d: "M330,360 L390,385" },            // Manhattan -> Brooklyn (bridges)
    { d: "M310,240 L345,150" },            // Manhattan -> Bronx
    { d: "M340,230 L460,195" },            // Manhattan/Bronx -> Queens
    { d: "M420,300 L390,385" },            // Queens -> Brooklyn (BQE)
    { d: "M170,410 L390,385" },            // Staten Island -> Brooklyn (Verrazzano-Narrows)
  ];
  const HIGHWAY_SHIELDS = [
    { x: 310, y: 340, label: "I-95" },
    { x: 380, y: 300, label: "278" },
    { x: 330, y: 190, label: "87" },
    { x: 240, y: 400, label: "278" },
  ];
  const LANDMARKS = [
    { x: 279, y: 200, name: "Times Square" },
    { x: 300, y: 340, name: "Lower Manhattan" },
    { x: 420, y: 430, name: "Coney Island" },
    { x: 345, y: 70, name: "Yankee Stadium" },
    { x: 530, y: 220, name: "JFK Airport" },
    { x: 470, y: 130, name: "LaGuardia" },
    { x: 130, y: 415, name: "St. George" },
  ];

  let incidents = []; // {id, description, category, rank, borough, ts, status, units, assignmentStatus}
  let nextId = 1;
  let selectedCategory = CATEGORIES[0].name;
  let selectedBorough = Object.keys(BOROUGHS)[0];

  // ---------- chip pickers (no dropdowns) ----------
  const catChipsEl = document.getElementById('catChips');
  const boroughChipsEl = document.getElementById('boroughChips');
  const catSelectEl = document.getElementById('catSelect');
  const boroughSelectEl = document.getElementById('boroughSelect');
  let correctionMode = null; // null | 'pending' (fresh manual classify) | <incidentId> (fixing a dispatched one)

  function buildCatSelect(){
    catSelectEl.innerHTML = '';
    [1,2,3,4,5].forEach(rank => {
      const inTier = CATEGORIES.filter(c => c.rank === rank);
      if (!inTier.length) return;
      const group = document.createElement('optgroup');
      group.label = severityLabel(rank);
      inTier.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = c.name;
        if (c.name === selectedCategory) opt.selected = true;
        group.appendChild(opt);
      });
      catSelectEl.appendChild(group);
    });
  }
  function buildBoroughSelect(){
    boroughSelectEl.innerHTML = '';
    Object.keys(BOROUGHS).forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      if (name === selectedBorough) opt.selected = true;
      boroughSelectEl.appendChild(opt);
    });
  }
  catSelectEl.addEventListener('change', () => {
    selectedCategory = catSelectEl.value;
    buildCatChips(); updateRankPreview();
    if (typeof correctionMode === 'number') applyCorrection(correctionMode, 'category', catSelectEl.value);
  });
  boroughSelectEl.addEventListener('change', () => {
    selectedBorough = boroughSelectEl.value;
    buildBoroughChips();
    if (typeof correctionMode === 'number') applyCorrection(correctionMode, 'borough', boroughSelectEl.value);
  });

  function buildCatChips(){
    catChipsEl.innerHTML = '';
    CATEGORIES.forEach(c => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip-btn' + (c.name === selectedCategory ? ' active' : '');
      btn.dataset.name = c.name;
      btn.innerHTML = `<span class="swatch" style="background:${c.color}"></span>${severityLabel(c.rank)}`;
      btn.title = c.name;
      btn.addEventListener('click', () => {
        selectedCategory = c.name; buildCatChips(); updateRankPreview();
        if (typeof correctionMode === 'number') applyCorrection(correctionMode, 'category', c.name);
      });
      catChipsEl.appendChild(btn);
    });
    buildCatSelect();
  }

  function buildBoroughChips(){
    boroughChipsEl.innerHTML = '';
    Object.keys(BOROUGHS).forEach(name => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip-btn' + (name === selectedBorough ? ' active' : '');
      btn.textContent = name;
      btn.addEventListener('click', () => {
        selectedBorough = name; buildBoroughChips();
        if (typeof correctionMode === 'number') applyCorrection(correctionMode, 'borough', name);
      });
      boroughChipsEl.appendChild(btn);
    });
    buildBoroughSelect();
  }

  function updateRankPreview(){
    const cat = categoryFor(selectedCategory);
    const el = document.getElementById('rankPreview');
    if (!cat){ el.textContent = ''; return; }
    const tier = cat.rank <= 2 ? 'Major — full unit bundle dispatch' : 'Minor — Second-Due-eligible';
    el.textContent = `Selected: ${cat.name} — ${tier}`;
  }

  // ---------- AI bot chat log ----------
  const chatLogEl = document.getElementById('chatLog');
  function addChatMessage(sender, text, actions){
    const wrap = document.createElement('div');
    wrap.className = 'chat-msg ' + (sender === 'user' ? 'user' : 'bot');
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = text;
    wrap.appendChild(bubble);
    if (actions && actions.length){
      const row = document.createElement('div');
      row.className = 'chat-actions';
      actions.forEach(a => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chat-action-btn';
        btn.textContent = a.label;
        btn.addEventListener('click', (ev) => { a.onClick(ev); });
        row.appendChild(btn);
      });
      wrap.appendChild(row);
    }
    chatLogEl.appendChild(wrap);
    chatLogEl.scrollTop = chatLogEl.scrollHeight;
  }

  // ---------- correction panel (feedback-driven override, not a default dropdown) ----------
  const correctionPanelEl = document.getElementById('correctionPanel');
  const finalizeManualBtn = document.getElementById('finalizeManualBtn');

  function openCorrectionForPending(){
    correctionMode = 'pending';
    correctionPanelEl.style.display = '';
    finalizeManualBtn.style.display = '';
  }
  function openCorrectionForIncident(id){
    correctionMode = id;
    correctionPanelEl.style.display = '';
    finalizeManualBtn.style.display = 'none';
  }
  function closeCorrectionPanel(){
    correctionMode = null;
    correctionPanelEl.style.display = 'none';
  }
  document.getElementById('closeCorrectionBtn').addEventListener('click', closeCorrectionPanel);
  finalizeManualBtn.addEventListener('click', () => {
    if (correctionMode !== 'pending') return;
    const text = document.getElementById('desc').value;
    const cat = categoryFor(selectedCategory);
    const { effective } = assessSeverity(cat.rank, text, cat.name, selectedBorough);
    const incident = logIncident(effective);
    addChatMessage('bot', `Manually classified as ${incident.category} in ${incident.borough}, ${severityLabel(incident.rank)} severity. Dispatching.`);
    closeCorrectionPanel();
  });

  // ---------- learning from feedback ----------
  // When an operator corrects a classification, Karen pulls a couple of
  // distinctive words out of that report and remembers them for next time —
  // a lightweight, in-session feedback loop, not a fixed keyword list.
  const LEARNED = {};
  const STOPWORDS = new Set([
    "the","a","an","in","on","at","and","or","of","to","is","was","were","with","near",
    "reported","incident","report","there","this","that","from","into","been","being"
  ]);
  function learnFromCorrection(description, categoryName){
    const already = CATEGORY_KEYWORDS.flatMap(c => c.keys).join(' ');
    const words = (description || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
      .filter(w => w.length > 4 && !STOPWORDS.has(w) && !already.includes(w));
    if (!words.length) return;
    if (!LEARNED[categoryName]) LEARNED[categoryName] = [];
    words.slice(0, 2).forEach(w => { if (!LEARNED[categoryName].includes(w)) LEARNED[categoryName].push(w); });
  }

  function applyCorrection(incidentId, field, value){
    const inc = incidents.find(i => i.id === incidentId);
    if (!inc) return;
    if (field === 'category'){
      const cat = categoryFor(value);
      learnFromCorrection(inc.description, cat.name);
      inc.category = cat.name;
      inc.baseRank = cat.rank;
      const { effective } = assessSeverity(cat.rank, inc.description || '', cat.name, inc.borough);
      inc.rank = effective;
    } else if (field === 'borough'){
      inc.borough = value;
    }
    releaseAllVehicles(inc);
    inc.units = [];
    render();
    addChatMessage('bot', `Fine — updated. It's ${inc.category} in ${inc.borough} now, ${severityLabel(inc.rank)} severity. I'll remember that phrasing.`);
    closeCorrectionPanel();
  }

  const QUICK_EXAMPLES = [
    { label: "🔫 Active shooter", text: "Active shooter reported inside an office building, multiple gunshots heard." },
    { label: "💥 Explosion", text: "Explosion reported at a subway entrance, suspicious package possibly involved." },
    { label: "🔥 Structure fire", text: "Heavy smoke and flames coming from a multi-story building fire." },
    { label: "🏚️ Building collapse", text: "Partial building collapse reported on a construction site, workers trapped." },
    { label: "☣️ Hazmat spill", text: "Chemical spill and toxic fumes reported at a warehouse." },
    { label: "🌪️ Severe weather", text: "Flooding and storm damage reported after severe weather." },
    { label: "🚑 Medical emergency", text: "Man collapsed, unconscious and not breathing." },
    { label: "⚡ Gas leak", text: "Strong gas smell and a downed power line reported near an apartment building." },
    { label: "🚗 Vehicle collision", text: "Multi-car collision blocking traffic." },
    { label: "🗣️ Public disturbance", text: "Loud disturbance and a minor altercation reported outside a bar." },
  ];
  const quickExamplesEl = document.getElementById('quickExamples');
  QUICK_EXAMPLES.forEach(ex => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip-btn';
    btn.textContent = ex.label;
    btn.addEventListener('click', () => {
      // pick a fresh random borough each time — the example text itself never
      // names one, so this is the only thing that decides where it lands
      const boroughNames = Object.keys(BOROUGHS);
      const randomBorough = boroughNames[Math.floor(Math.random() * boroughNames.length)];
      const fullText = `${ex.text} Reported in ${randomBorough}.`;
      document.getElementById('desc').value = fullText;
      setAiPill('analyzing', 'AI ANALYZING report…');
      attemptAutoClassify(fullText);
    });
    quickExamplesEl.appendChild(btn);
  });

  buildCatChips();
  buildBoroughChips();
  updateRankPreview();

  // ---------- Karen: AI voice + text classification ----------
  const karenStatus = document.getElementById('karenStatus');
  const micBtn = document.getElementById('micBtn');
  const voiceRepliesBox = document.getElementById('voiceReplies');
  const aiPill = document.getElementById('aiPill');
  const aiPillText = document.getElementById('aiPillText');

  function setAiPill(state, text){
    aiPill.className = 'ai-pill' + (state ? ' ' + state : '');
    aiPillText.textContent = text;
  }

  const CATEGORY_KEYWORDS = [
    { name: "Active Shooter / Terrorist Attack",
      keys: ["active shooter", "shooter", "gunman", "shooting", "gunshots", "gun", "terrorist", "terror attack",
             "attacker", "armed man", "armed suspect", "hostage", "stabbing", "knife attack"] },
    { name: "Explosion / Bombing",
      keys: ["explosion", "bomb", "bombing", "explosive device", "blast", "detonation", "suspicious package",
             "pipe bomb", "device went off"] },
    { name: "Multi-Alarm Structural Fire",
      keys: ["fire", "structure fire", "building fire", "multi-alarm", "multi alarm", "blaze", "smoke condition",
             "flames", "burning", "smoke coming from", "apartment fire", "high-rise fire", "warehouse fire"] },
    { name: "Building Collapse",
      keys: ["building collapse", "structure collapse", "collapsed building", "collapsed structure",
             "partial collapse", "scaffolding collapse", "roof collapse", "wall collapse", "building came down"] },
    { name: "Hazmat / Chemical Spill",
      keys: ["hazmat", "chemical spill", "chemical leak", "toxic", "spill", "fumes", "contamination",
             "toxic cloud", "chemical fumes", "radiation", "biohazard", "unknown substance"] },
    { name: "Severe Weather Emergency",
      keys: ["flooding", "flood", "storm damage", "hurricane", "tornado", "blizzard", "severe storm",
             "storm surge", "coastal flooding", "downed tree", "whiteout conditions"] },
    { name: "Serious Medical Emergency",
      keys: ["cardiac arrest", "heart attack", "unconscious", "not breathing", "overdose", "seizure", "stroke",
             "medical emergency", "unresponsive", "fainted", "passed out", "choking", "severe bleeding",
             "difficulty breathing"] },
    { name: "Gas Leak / Utility Emergency",
      keys: ["gas leak", "gas smell", "leaking gas", "natural gas", "power outage", "downed wire", "downed power line",
             "live wire", "water main break", "electrical arcing", "transformer explosion"] },
    { name: "Motor Vehicle Collision",
      keys: ["car accident", "collision", "crash", "fender bender", "vehicle accident", "hit and run",
             "traffic accident", "pileup", "car crash", "rolled over", "vehicle rollover"] },
    { name: "Public Disturbance",
      keys: ["disturbance", "noise complaint", "loitering", "minor altercation", "fight breaking out", "vandalism",
             "trespassing", "suspicious person", "parking dispute", "unruly crowd"] },
  ];
  const BOROUGH_KEYWORDS = {
    "Brooklyn": ["brooklyn", "williamsburg", "coney island", "dumbo", "bushwick", "metrotech"],
    "Bronx": ["bronx", "yankee stadium", "fordham", "riverdale", "waters place"],
    "Manhattan": ["manhattan", "times square", "midtown", "downtown manhattan", "wall street", "central park", "harlem"],
    "Queens": ["queens", "flushing", "astoria", "jfk", "laguardia", "jamaica queens"],
    "Staten Island": ["staten island", "st. george", "st george", "tottenville"],
  };

  // Language weighted by how strongly it signals real urgency — not every escalating
  // word means the same thing. "mass casualty" carries far more weight than "several".
  const SEVERITY_WEIGHTS = [
    // strongest escalators — near-certain rank-1 territory
    { phrase: "mass casualty", weight: 3 },
    { phrase: "citywide", weight: 3 }, { phrase: "city-wide", weight: 3 },
    { phrase: "collapsed", weight: 3 }, { phrase: "collapse", weight: 3 },
    { phrase: "explosion", weight: 3 }, { phrase: "multiple victims", weight: 3 },
    // strong escalators
    { phrase: "children", weight: 2 }, { phrase: "school", weight: 2 },
    { phrase: "trapped", weight: 2 }, { phrase: "critical condition", weight: 2 },
    { phrase: "life-threatening", weight: 2 }, { phrase: "life threatening", weight: 2 },
    { phrase: "widespread", weight: 2 }, { phrase: "entire block", weight: 2 },
    { phrase: "out of control", weight: 2 }, { phrase: "people down", weight: 2 },
    // mild escalators
    { phrase: "multiple", weight: 1 }, { phrase: "several", weight: 1 }, { phrase: "many", weight: 1 },
    { phrase: "dozens", weight: 1 }, { phrase: "spreading", weight: 1 }, { phrase: "large scale", weight: 1 },
    { phrase: "large-scale", weight: 1 }, { phrase: "extensive", weight: 1 }, { phrase: "overwhelmed", weight: 1 },
    // mild de-escalators
    { phrase: "minor", weight: -1 }, { phrase: "small", weight: -1 }, { phrase: "isolated", weight: -1 },
    { phrase: "localized", weight: -1 }, { phrase: "single car", weight: -1 }, { phrase: "one person", weight: -1 },
    // strong de-escalators — near-certain this is contained/minor
    { phrase: "no injuries", weight: -2 }, { phrase: "no injury", weight: -2 }, { phrase: "no one hurt", weight: -2 },
    { phrase: "under control", weight: -2 }, { phrase: "contained", weight: -2 },
    { phrase: "already out", weight: -2 }, { phrase: "extinguished", weight: -2 }, { phrase: "just a", weight: -2 },
  ];

  // Snapshot of real NWS/NYC Emergency Management conditions, fetched when this
  // page was published. A published page can't keep polling a weather API live
  // (the browser sandbox blocks outbound calls to sites other than script CDNs),
  // so this is refreshed each time the page is rebuilt rather than continuously —
  // but the AI actively uses it, it isn't just decorative.
  const WEATHER_SNAPSHOT = {
    fetchedAt: "Sep 27, 2026, ~7 AM ET",
    headline: "Nor'easter — active coastal storm over NYC",
    citywide: [
      "Wind Advisory — gusts up to 55 mph, citywide",
    ],
    coastalAlerts: [
      "Coastal Flood Warning — until 6 PM today (Notify NYC / NWS)",
      "Gale Warning — NY Harbor, Raritan & Sandy Hook Bay",
    ],
    // per NYC Emergency Management's advisory for this storm, coastal flooding is
    // specifically expected along these shorelines — not evenly citywide
    coastalBoroughs: ["Brooklyn", "Queens", "Staten Island"],
    severeActive: true,
  };

  (function renderWeatherBox(){
    const el = document.getElementById('weatherBox');
    if (!el) return;
    const coastalList = WEATHER_SNAPSHOT.coastalBoroughs.join(', ');
    el.innerHTML = `
      <span class="wx-headline">${WEATHER_SNAPSHOT.severeActive ? '⚠️' : '✅'} ${escapeHtml(WEATHER_SNAPSHOT.headline)}</span>
      <ul>${WEATHER_SNAPSHOT.citywide.map(a => `<li>${escapeHtml(a)}</li>`).join('')}</ul>
      <div style="margin:4px 0;"><strong>Coastal flood risk — ${escapeHtml(coastalList)} only:</strong></div>
      <ul>${WEATHER_SNAPSHOT.coastalAlerts.map(a => `<li>${escapeHtml(a)}</li>`).join('')}</ul>
      <span class="wx-meta">Snapshot fetched ${escapeHtml(WEATHER_SNAPSHOT.fetchedAt)} — a published page can't keep polling live, so Karen uses this fetched snapshot (matched to the reporting borough) to corroborate Severe Weather reports rather than a real-time feed.</span>
    `;
  })();

  // Scored match — picks the category with the most supporting language instead of
  // stopping at the first keyword hit, so a fuller description is understood better.
  function detectAndFill(text){
    const lower = text.toLowerCase();
    let bestCat = null, bestScore = 0;
    CATEGORY_KEYWORDS.forEach(c => {
      let score = c.keys.filter(k => lower.includes(k)).length;
      score += (LEARNED[c.name] || []).filter(w => lower.includes(w)).length;
      // a real active weather emergency right now makes ambiguous "flooding /
      // wind / storm" language more likely to genuinely be Severe Weather
      if (c.name === 'Severe Weather Emergency' && WEATHER_SNAPSHOT.severeActive && score > 0) score += 1;
      if (score > bestScore){ bestScore = score; bestCat = c; }
    });
    if (bestCat){ selectedCategory = bestCat.name; buildCatChips(); }
    const borough = Object.keys(BOROUGH_KEYWORDS).find(b => BOROUGH_KEYWORDS[b].some(k => lower.includes(k)));
    if (borough){ selectedBorough = borough; buildBoroughChips(); }
    updateRankPreview();
    return { categoryMatched: !!bestCat, boroughMatched: !!borough };
  }

  // Reads the actual impact described and ranks it from that — the category only
  // tells the AI what kind of threat this is; the rank itself comes entirely from
  // the strength of the language in THIS input, not a fixed default per category.
  function assessSeverity(baseRank, text, categoryName, borough){
    const lower = text.toLowerCase();
    const hits = SEVERITY_WEIGHTS.filter(w => lower.includes(w.phrase));
    let totalStrength = hits.reduce((sum, h) => sum + h.weight, 0);
    let weatherCorroborated = false, weatherNote = '';

    // a Severe Weather report during a real, currently-active NWS advisory gets
    // corroboration weight — but only as much as actually applies to that borough.
    // The coastal flood warning is specific to Brooklyn/Queens/Staten Island for
    // this storm; everywhere else in the city, only the wind advisory is live.
    if (categoryName === 'Severe Weather Emergency' && WEATHER_SNAPSHOT.severeActive){
      if (WEATHER_SNAPSHOT.coastalBoroughs.includes(borough)){
        totalStrength += 2;
        weatherCorroborated = true;
        weatherNote = `active coastal flood warning for ${borough} right now`;
      } else {
        totalStrength += 1;
        weatherCorroborated = true;
        weatherNote = `active citywide wind advisory right now`;
      }
    }

    // uncapped at ±2 on purpose — strong enough language in the input can move the
    // rank across the full 1–5 range, it isn't boxed in by the category's default
    const delta = Math.max(-4, Math.min(4, totalStrength));
    const effective = Math.max(1, Math.min(5, baseRank - delta));
    const escalators = hits.filter(h => h.weight > 0).sort((a,b) => b.weight - a.weight).map(h => h.phrase);
    const deescalators = hits.filter(h => h.weight < 0).sort((a,b) => a.weight - b.weight).map(h => h.phrase);
    if (weatherCorroborated) escalators.unshift(weatherNote);
    return { effective, delta, strength: totalStrength, escalators, deescalators, weatherCorroborated, weatherNote };
  }

  let typingTimer = null;
  function attemptAutoClassify(text){
    if (!text || !text.trim()){ setAiPill('', 'AI IDLE — awaiting a report'); return; }
    addChatMessage('user', text.trim());
    const { categoryMatched, boroughMatched } = detectAndFill(text);
    if (categoryMatched && boroughMatched){
      const cat = categoryFor(selectedCategory);
      const { effective, delta, strength, escalators, deescalators, weatherCorroborated, weatherNote } = assessSeverity(cat.rank, text, cat.name, selectedBorough);
      let pillText, line;
      if (weatherCorroborated){
        pillText = `AI CONFIDENCE: HIGH — matches ${weatherNote}, escalated to ${severityLabel(effective)}`;
        line = `That lines up with the ${weatherNote} — treating it as credible and pushing this to ${severityLabel(effective)} severity. Dispatching myself.`;
      } else if (delta >= 3){
        pillText = `AI CONFIDENCE: HIGH — severely escalated to ${severityLabel(effective)} ("${escalators[0]}")`;
        line = `That's serious — "${escalators[0]}" is high-strength language, pushing this straight to ${severityLabel(effective)} severity. Dispatching myself.`;
      } else if (delta >= 1){
        pillText = `AI CONFIDENCE: HIGH — escalated to ${severityLabel(effective)} ("${escalators[0]}")`;
        line = `Worse than the standard case — "${escalators[0]}" bumps it to ${severityLabel(effective)} severity. Dispatching myself.`;
      } else if (delta <= -3){
        pillText = `AI CONFIDENCE: HIGH — heavily de-escalated to ${severityLabel(effective)} ("${deescalators[0]}")`;
        line = `Barely worth the radio call — "${deescalators[0]}" and the rest of it drop this to ${severityLabel(effective)} severity. Dispatching myself.`;
      } else if (delta <= -1){
        pillText = `AI CONFIDENCE: HIGH — de-escalated to ${severityLabel(effective)} ("${deescalators[0]}")`;
        line = `Sounds contained — "${deescalators[0]}" drops it to ${severityLabel(effective)} severity. Dispatching myself.`;
      } else {
        pillText = 'AI CONFIDENCE: HIGH — threat + location identified';
        line = "Got it, I know what this is and where. Dispatching myself.";
      }
      setAiPill('done', pillText);
      const incident = logIncident(effective);
      const vehicleSummary = incident.units.length ? incident.units.map(u => vehicleLabel(incident, u)).join(', ') : incident.assignmentStatus;
      addChatMessage('bot', `${line} → ${incident.category}, ${severityLabel(incident.rank)} severity, ${incident.borough}. Sending: ${vehicleSummary}.`, [
        { label: '✅ Looks right', onClick: (ev) => {
            const row = ev.target.closest('.chat-actions'); if (row) row.remove();
            addChatMessage('bot', 'Noted. Moving on.');
          } },
        { label: '✏️ Not quite', onClick: () => openCorrectionForIncident(incident.id) }
      ]);
    } else if (categoryMatched || boroughMatched){
      setAiPill('none', `AI CONFIDENCE: PARTIAL — ${categoryMatched ? 'threat identified' : 'location identified'} only`);
      const line = `Got ${categoryMatched ? 'the threat type' : 'the borough'}, not the ${categoryMatched ? 'location' : 'threat type'}. Help me finish it.`;
      karenStatus.textContent = line;
      addChatMessage('bot', line, [
        { label: '✏️ Finish classifying', onClick: () => openCorrectionForPending() }
      ]);
    } else {
      setAiPill('none', 'AI CONFIDENCE: LOW — manual override needed');
      const line = "Can't tell what this is or where from that. You'll have to classify it yourself this time.";
      karenStatus.textContent = line;
      addChatMessage('bot', line, [
        { label: '✏️ Classify manually', onClick: () => openCorrectionForPending() }
      ]);
    }
  }

  const descBox = document.getElementById('desc');
  descBox.addEventListener('input', () => {
    clearTimeout(typingTimer);
    if (descBox.value.trim()) setAiPill('analyzing', 'AI ANALYZING report…');
    else setAiPill('', 'AI IDLE — awaiting a report');
    typingTimer = setTimeout(() => attemptAutoClassify(descBox.value), 900);
  });

  function speak(text){
    if (!voiceRepliesBox.checked || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.02;
    utter.pitch = 0.95;
    window.speechSynthesis.speak(utter);
  }

  const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
  const liveSensingBox = document.getElementById('liveSensing');
  const liveBadge = document.getElementById('liveBadge');
  let recognition = null;
  let listening = false;
  let continuousMode = false;

  if (SpeechRecognitionImpl){
    recognition = new SpeechRecognitionImpl();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.addEventListener('start', () => {
      listening = true;
      micBtn.classList.add('listening');
      if (continuousMode){
        setAiPill('analyzing', 'AI LIVE SENSING — listening for reports…');
      } else {
        karenStatus.textContent = "I'm listening. This better be important.";
        setAiPill('analyzing', 'AI LISTENING…');
      }
    });

    recognition.addEventListener('result', (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++){
        const res = e.results[i];
        if (!res.isFinal) continue;
        const transcript = res[0].transcript.trim();
        if (!transcript) continue;

        if (continuousMode){
          // every sensed utterance is treated as its own independent report
          document.getElementById('desc').value = transcript;
          setAiPill('analyzing', 'AI ANALYZING live report…');
          attemptAutoClassify(transcript);
        } else {
          const desc = document.getElementById('desc');
          desc.value = desc.value ? `${desc.value} ${transcript}` : transcript;
          clearTimeout(typingTimer);
          setAiPill('analyzing', 'AI ANALYZING voice report…');
          attemptAutoClassify(desc.value);
        }
      }
      if (!continuousMode){
        try { recognition.stop(); } catch(err){ /* already stopping */ }
      }
    });

    recognition.addEventListener('error', (e) => {
      if (!continuousMode || e.error === 'not-allowed'){
        karenStatus.textContent = e.error === 'not-allowed'
          ? "Can't hear a thing without mic permission. Fix that."
          : "Didn't catch that. Try enunciating, maybe.";
      }
      if (!continuousMode) setAiPill('', 'AI IDLE — awaiting a report');
      if (e.error === 'not-allowed'){ liveSensingBox.checked = false; continuousMode = false; liveBadge.style.display = 'none'; }
    });

    recognition.addEventListener('end', () => {
      listening = false;
      micBtn.classList.remove('listening');
      if (continuousMode){
        // browsers auto-stop after a pause even with continuous:true — keep the ear open
        try { recognition.start(); } catch(err){ /* already running */ }
      }
    });

    micBtn.addEventListener('click', () => {
      if (continuousMode) return; // live sensing already has the mic covered
      if (listening){ recognition.stop(); return; }
      try { recognition.start(); } catch(err){ /* already started */ }
    });

    liveSensingBox.addEventListener('change', () => {
      continuousMode = liveSensingBox.checked;
      liveBadge.style.display = continuousMode ? 'inline' : 'none';
      micBtn.disabled = continuousMode;
      if (continuousMode){
        karenStatus.textContent = "Live sensing on. I'll fetch and dispatch everything myself now.";
        setAiPill('analyzing', 'AI LIVE SENSING — listening for reports…');
        try { recognition.start(); } catch(err){ /* already running */ }
      } else {
        karenStatus.textContent = "Live sensing off. Back to the push-to-talk button.";
        try { recognition.stop(); } catch(err){ /* already stopped */ }
        setAiPill('', 'AI IDLE — awaiting a report');
        if (typeof onCall !== 'undefined' && onCall){
          onCall = false;
          callBtn.textContent = '📞 Call Voice AI Assistant';
          callBtn.classList.remove('on-call');
          callStatus.textContent = "Karen's off the line.";
        }
      }
    });
  } else {
    micBtn.disabled = true;
    liveSensingBox.disabled = true;
    karenStatus.textContent = "This browser can't hear me. Type it, I guess.";
  }

  // ---------- Call Voice AI Assistant (phone-style pickup for live sensing) ----------
  const callBtn = document.getElementById('callBtn');
  const callStatus = document.getElementById('callStatus');
  const CALL_GREETINGS = [
    "Karen, Voice AI Assistant. What's the emergency.",
    "You've reached the Voice AI Assistant. Talk fast.",
    "Karen here. What am I dispatching this time.",
  ];
  let onCall = false;

  callBtn.addEventListener('click', () => {
    if (!SpeechRecognitionImpl){
      callStatus.textContent = "Can't take calls — this browser can't hear me.";
      return;
    }
    if (!onCall){
      onCall = true;
      callBtn.textContent = '📴 Hang up';
      callBtn.classList.add('on-call');
      callStatus.textContent = 'Connecting…';
      setTimeout(() => {
        if (!onCall) return;
        callStatus.textContent = 'On call with Voice AI Assistant.';
        const greeting = pick(CALL_GREETINGS);
        karenStatus.textContent = greeting;
        speak(greeting);
        if (!liveSensingBox.checked){
          liveSensingBox.checked = true;
          liveSensingBox.dispatchEvent(new Event('change'));
        }
      }, 700);
    } else {
      onCall = false;
      callBtn.textContent = '📞 Call Voice AI Assistant';
      callBtn.classList.remove('on-call');
      callStatus.textContent = "Karen's off the line.";
      if (liveSensingBox.checked){
        liveSensingBox.checked = false;
        liveSensingBox.dispatchEvent(new Event('change'));
      }
    }
  });

  // ---------- Auto-fetch location (real NYC borough coordinates) ----------
  const BOROUGH_COORDS = {
    "Manhattan":     { lat: 40.7831, lng: -73.9712 },
    "Brooklyn":      { lat: 40.6782, lng: -73.9442 },
    "Queens":        { lat: 40.7282, lng: -73.7949 },
    "Bronx":         { lat: 40.8448, lng: -73.8648 },
    "Staten Island": { lat: 40.5795, lng: -74.1502 },
  };
  const locBtn = document.getElementById('locBtn');
  const locStatus = document.getElementById('locStatus');

  function nearestBorough(lat, lng){
    let best = null, bestDist = Infinity;
    Object.entries(BOROUGH_COORDS).forEach(([name, c]) => {
      const dist = Math.hypot(c.lat - lat, c.lng - lng);
      if (dist < bestDist){ bestDist = dist; best = name; }
    });
    return { name: best, dist: bestDist };
  }

  function fetchLocation(announce){
    if (!('geolocation' in navigator)){
      locStatus.textContent = "This browser won't share location.";
      if (announce) addChatMessage('bot', "This browser won't give me your location. Tell me the borough yourself.");
      return;
    }
    locBtn.classList.add('locating');
    locStatus.textContent = 'Locating…';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        locBtn.classList.remove('locating');
        const { name, dist } = nearestBorough(pos.coords.latitude, pos.coords.longitude);
        if (dist > 0.6){
          locStatus.textContent = "Outside the five boroughs.";
          if (announce) addChatMessage('bot', "You're outside the five boroughs as far as I can tell — I'll go by what each report says instead.");
          return;
        }
        selectedBorough = name;
        buildBoroughChips();
        locStatus.textContent = `Auto-detected: ${name}`;
        addChatMessage('bot', `📍 Got your location — that's ${name}. I'll route reports there unless you say otherwise.`);
      },
      () => {
        locBtn.classList.remove('locating');
        locStatus.textContent = 'Location unavailable.';
        if (announce) addChatMessage('bot', "Couldn't get your location. I'll go by what you tell me in each report instead.");
      },
      { timeout: 8000, maximumAge: 300000 }
    );
  }

  locBtn.addEventListener('click', () => fetchLocation(true));
  fetchLocation(false); // quiet attempt on load — no complaints if permission isn't granted yet

  // ---------- CCTV camera detection (real feed, real motion analysis) ----------
  // No pretrained vision model here on purpose: a published page can't fetch model
  // weights from anywhere but its own script CDNs, so a real object/threat classifier
  // would silently fail to load. Frame-difference motion analysis needs no external
  // model at all, so it's the one "detection" capability that's honestly real here.
  const cctvBtn = document.getElementById('cctvBtn');
  const cctvStatus = document.getElementById('cctvStatus');
  const cctvFrame = document.getElementById('cctvFrame');
  const cctvVideo = document.getElementById('cctvVideo');
  const motionMeterWrap = document.getElementById('motionMeterWrap');
  const motionFill = document.getElementById('motionFill');
  const motionLabel = document.getElementById('motionLabel');
  const flagActivityBtn = document.getElementById('flagActivityBtn');

  let cctvStream = null, cctvTimer = null, prevFrame = null, currentMotionLevel = 'low';
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = 48; sampleCanvas.height = 27;
  const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });

  function sampleMotion(){
    if (!cctvVideo.videoWidth) return;
    sampleCtx.drawImage(cctvVideo, 0, 0, sampleCanvas.width, sampleCanvas.height);
    const frame = sampleCtx.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height).data;
    if (prevFrame){
      let diffSum = 0;
      for (let i = 0; i < frame.length; i += 4){
        const lumaNow = (frame[i] + frame[i+1] + frame[i+2]) / 3;
        const lumaPrev = (prevFrame[i] + prevFrame[i+1] + prevFrame[i+2]) / 3;
        diffSum += Math.abs(lumaNow - lumaPrev);
      }
      const pixelCount = frame.length / 4;
      const avgDiff = diffSum / pixelCount; // 0–255 scale
      const pct = Math.min(100, Math.round((avgDiff / 40) * 100));
      motionFill.style.width = pct + '%';

      if (pct >= 45){
        currentMotionLevel = 'high';
        motionFill.style.background = 'var(--red-bright)';
        motionLabel.textContent = `High activity (${pct}%)`;
      } else if (pct >= 18){
        currentMotionLevel = 'moderate';
        motionFill.style.background = 'var(--amber)';
        motionLabel.textContent = `Moderate activity (${pct}%)`;
      } else {
        currentMotionLevel = 'low';
        motionFill.style.background = 'var(--green)';
        motionLabel.textContent = `Low activity (${pct}%)`;
      }
      flagActivityBtn.style.display = currentMotionLevel === 'low' ? 'none' : 'block';
    }
    prevFrame = frame;
  }

  async function startCctv(){
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)){
      cctvStatus.textContent = "This browser can't access a camera.";
      return;
    }
    try {
      cctvStatus.textContent = 'Requesting camera…';
      cctvStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      cctvVideo.srcObject = cctvStream;
      cctvFrame.style.display = '';
      motionMeterWrap.style.display = 'flex';
      cctvBtn.textContent = '⏹ Stop camera';
      cctvStatus.textContent = 'Live — analyzing motion.';
      prevFrame = null;
      cctvTimer = setInterval(sampleMotion, 250);
    } catch (err){
      cctvStatus.textContent = 'Camera permission denied or unavailable.';
    }
  }

  function stopCctv(){
    if (cctvTimer) clearInterval(cctvTimer);
    if (cctvStream) cctvStream.getTracks().forEach(t => t.stop());
    cctvStream = null; prevFrame = null;
    cctvFrame.style.display = 'none';
    motionMeterWrap.style.display = 'none';
    flagActivityBtn.style.display = 'none';
    cctvBtn.textContent = '📹 Start camera';
    cctvStatus.textContent = 'Camera off.';
  }

  cctvBtn.addEventListener('click', () => { cctvStream ? stopCctv() : startCctv(); });

  flagActivityBtn.addEventListener('click', () => {
    const text = currentMotionLevel === 'high'
      ? `Camera feed in ${selectedBorough} shows a sudden surge of movement, possible disturbance or crowd activity.`
      : `Camera feed in ${selectedBorough} shows a noticeable rise in movement, worth checking on.`;
    document.getElementById('desc').value = text;
    attemptAutoClassify(text);
  });

  // ---------- core logic ----------
  function categoryFor(name){ return CATEGORIES.find(c => c.name === name); }

  // ---------- vehicle fleet — multiple real vehicles per unit type per borough ----------
  const BOROUGH_ABBR = { "Brooklyn": "BK", "Bronx": "BX", "Manhattan": "MN", "Queens": "QN", "Staten Island": "SI" };
  const FLEET = {};
  Object.entries(BOROUGH_ABBR).forEach(([name, abbr]) => {
    FLEET[name] = {
      'First-Due Unit (FDNY/NYPD)': [
        { id: `Engine ${abbr}12`, busy: false },
        { id: `Ladder ${abbr}5`, busy: false },
        { id: `RMP ${abbr}2341`, busy: false },
      ],
      'NYPD ESU': [
        { id: `ESU Truck ${abbr}1`, busy: false },
        { id: `ESU Truck ${abbr}2`, busy: false },
      ],
      'FDNY EMS': [
        { id: `Ambulance ${abbr}1`, busy: false },
        { id: `Ambulance ${abbr}2`, busy: false },
        { id: `Ambulance ${abbr}3`, busy: false },
      ],
      'Second-Due Unit (Mutual Aid)': [
        { id: `Engine ${abbr}2-1`, busy: false },
        { id: `Engine ${abbr}2-2`, busy: false },
      ],
    };
  });

  // auto-fetches the next available real vehicle for a role in a borough — this
  // is the "multiple vehicles, auto-picked" layer sitting under the unit labels
  function pickVehicle(borough, role){
    const pool = FLEET[borough] && FLEET[borough][role];
    if (!pool) return null;
    const free = pool.find(v => !v.busy);
    if (!free) return null;
    free.busy = true;
    return free.id;
  }
  function releaseVehicle(borough, role, vehicleId){
    const pool = FLEET[borough] && FLEET[borough][role];
    if (!pool) return;
    const v = pool.find(x => x.id === vehicleId);
    if (v) v.busy = false;
  }
  function ensureVehicle(inc, role){
    inc.vehicles = inc.vehicles || {};
    if (!inc.vehicles[role]){
      inc.vehicles[role] = pickVehicle(inc.borough, role) || 'Mutual aid unit (fleet full)';
    }
  }
  function releaseAllVehicles(inc){
    if (!inc.vehicles) return;
    Object.entries(inc.vehicles).forEach(([role, vid]) => releaseVehicle(inc.borough, role, vid));
    inc.vehicles = {};
  }
  function vehicleLabel(inc, role){
    const SHORT_ROLE = {
      'First-Due Unit (FDNY/NYPD)': 'First-Due',
      'NYPD ESU': 'ESU',
      'FDNY EMS': 'EMS',
      'Second-Due Unit (Mutual Aid)': 'Second-Due',
    };
    const short = SHORT_ROLE[role] || role;
    return (inc.vehicles && inc.vehicles[role]) ? `${inc.vehicles[role]} (${short})` : role;
  }

  function recomputeAssignments(){
    const pending = incidents.filter(i => i.status === 'pending');
    const byBorough = {};
    pending.forEach(i => { (byBorough[i.borough] = byBorough[i.borough] || []).push(i); });

    Object.values(byBorough).forEach(list => {
      list.sort((a,b) => a.rank - b.rank || a.ts - b.ts);
      const majorPresent = list.some(i => i.rank <= 2);
      let bundleTaken = false, reserveTaken = false, primaryAloneTaken = false;

      list.forEach(inc => {
        if (inc.rank <= 2){
          if (!bundleTaken){
            inc.units = ['First-Due Unit (FDNY/NYPD)', 'NYPD ESU', 'FDNY EMS'];
            inc.units.forEach(role => ensureVehicle(inc, role));
            inc.assignmentStatus = 'Dispatched'; bundleTaken = true;
          } else { releaseAllVehicles(inc); inc.units = []; inc.assignmentStatus = 'Queued — awaiting unit bundle'; }
        } else {
          if (majorPresent){
            if (!reserveTaken){
              inc.units = ['Second-Due Unit (Mutual Aid)'];
              ensureVehicle(inc, 'Second-Due Unit (Mutual Aid)');
              inc.assignmentStatus = 'Dispatched'; reserveTaken = true;
            } else { releaseAllVehicles(inc); inc.units = []; inc.assignmentStatus = 'Queued — awaiting Second-Due Unit'; }
          } else {
            if (!primaryAloneTaken){
              inc.units = ['First-Due Unit (FDNY/NYPD)'];
              ensureVehicle(inc, 'First-Due Unit (FDNY/NYPD)');
              inc.assignmentStatus = 'Dispatched'; primaryAloneTaken = true;
            } else { releaseAllVehicles(inc); inc.units = []; inc.assignmentStatus = 'Queued — awaiting First-Due Unit'; }
          }
        }
      });
    });
  }

  function boroughUnitFlags(borough){
    const fleet = FLEET[borough];
    return Object.entries(fleet).map(([role, pool]) => ({
      role,
      short: role.includes('First-Due') ? 'First-Due' : role.includes('ESU') ? 'ESU' : role.includes('EMS') ? 'EMS' : '2nd-Due',
      available: pool.filter(v => !v.busy).length,
      total: pool.length,
    }));
  }

  // ---------- NYC map ----------
  const SVGNS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs){
    const el = document.createElementNS(SVGNS, tag);
    Object.entries(attrs || {}).forEach(([k,v]) => el.setAttribute(k, v));
    return el;
  }

  function buildMap(){
    const shapesG = document.getElementById('boroughShapes');
    const markersG = document.getElementById('dispatchMarkers');
    const ringsG = document.getElementById('webRings');
    const strandsG = document.getElementById('webStrands');
    const hubG = document.getElementById('hubNode');

    [70, 140, 210, 280].forEach(r => {
      ringsG.appendChild(svgEl('circle', { cx: HUB.x, cy: HUB.y, r, class: 'web-ring' }));
    });

    Object.entries(BOROUGHS).forEach(([name, b]) => {
      const poly = svgEl('polygon', { points: b.shape, class: 'borough-shape' });
      const title = svgEl('title', {}); title.textContent = `${name} — ${b.facility}`;
      poly.appendChild(title); shapesG.appendChild(poly);

      const label = svgEl('text', { x: b.label.x, y: b.label.y, class: 'borough-label', 'text-anchor': 'middle' });
      label.textContent = name; shapesG.appendChild(label);

      const midX = (HUB.x + b.marker.x) / 2;
      const midY = (HUB.y + b.marker.y) / 2 - 18;
      const strand = svgEl('path', {
        d: `M${HUB.x},${HUB.y} Q${midX},${midY} ${b.marker.x},${b.marker.y}`,
        class: 'web-strand'
      });
      strandsG.appendChild(strand);

      const markerG = svgEl('g', { class: 'dispatch-marker' });
      const ring = svgEl('circle', { cx: b.marker.x, cy: b.marker.y, r: 9, fill: '#ffffff' });
      const dot = svgEl('circle', { cx: b.marker.x, cy: b.marker.y, r: 4 });
      dot.setAttribute('style', 'fill:var(--blue-bright)');
      const label2 = svgEl('text', { x: b.marker.x, y: b.marker.y + 20, 'text-anchor': 'middle' });
      label2.textContent = b.facility.split(' — ')[0].split(' (')[0];
      markerG.appendChild(ring); markerG.appendChild(dot); markerG.appendChild(label2);
      markersG.appendChild(markerG);
    });

    const hubRing = svgEl('circle', { cx: HUB.x, cy: HUB.y, r: 16 });
    hubRing.setAttribute('style', 'fill:#ffffff; stroke:var(--ink); stroke-width:2;');
    const hubCore = svgEl('g', { class: 'hub-node' });
    const hubCircle = svgEl('circle', { cx: HUB.x, cy: HUB.y, r: 11 });
    const hubIcon = svgEl('text', { x: HUB.x, y: HUB.y + 1 });
    hubIcon.textContent = '\ud83d\udd77\ufe0f';
    hubCore.appendChild(hubCircle); hubCore.appendChild(hubIcon);
    const hubLabel = svgEl('text', { x: HUB.x, y: HUB.y - 24, 'text-anchor': 'middle', class: 'borough-label' });
    hubLabel.setAttribute('style', 'font-size:11px;');
    hubLabel.textContent = "KAREN'S EAR \u2014 AI CORE";
    hubG.appendChild(hubRing); hubG.appendChild(hubCore); hubG.appendChild(hubLabel);

    // road-atlas flourishes
    const hwyG = document.getElementById('highwayLines');
    HIGHWAY_LINES.forEach(h => hwyG.appendChild(svgEl('path', { d: h.d, class: 'highway-line' })));

    const shieldG = document.getElementById('highwayShields');
    HIGHWAY_SHIELDS.forEach(s => {
      const g = svgEl('g', {});
      const rect = svgEl('rect', { x: s.x - 12, y: s.y - 8, width: 24, height: 16, rx: 3, class: 'highway-shield' });
      const text = svgEl('text', { x: s.x, y: s.y + 1 });
      text.textContent = s.label;
      g.appendChild(rect); g.appendChild(text);
      shieldG.appendChild(g);
    });

    const landmarkG = document.getElementById('landmarks');
    LANDMARKS.forEach(l => {
      const dot = svgEl('circle', { cx: l.x, cy: l.y, r: 2.6, class: 'landmark-dot' });
      const label = svgEl('text', { x: l.x + 6, y: l.y + 3, class: 'landmark-label' });
      label.textContent = l.name;
      landmarkG.appendChild(dot);
      landmarkG.appendChild(label);
    });
  }

  function jitterFor(id, index){
    const angle = ((id * 53 + index * 137) % 360) * (Math.PI / 180);
    const radius = 16 + ((id * 7 + index * 11) % 14);
    return { dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius };
  }

  function renderMapMarkers(){
    const g = document.getElementById('incidentMarkers');
    g.innerHTML = '';
    const pending = incidents.filter(i => i.status === 'pending');
    const seenPerBorough = {};
    pending.forEach(inc => {
      const b = BOROUGHS[inc.borough];
      if (!b) return;
      const idx = seenPerBorough[inc.borough] = (seenPerBorough[inc.borough] || 0);
      seenPerBorough[inc.borough] = idx + 1;
      const { dx, dy } = jitterFor(inc.id, idx);
      const dot = svgEl('circle', { cx: b.marker.x + dx, cy: b.marker.y + dy, r: 6, class: 'incident-dot' + (inc.rank <= 2 ? ' major' : '') });
      dot.setAttribute('style', `fill:${RANK_COLOR[inc.rank]}`);
      const title = svgEl('title', {});
      title.textContent = `${severityLabel(inc.rank)} severity — ${inc.category} (${inc.assignmentStatus})`;
      dot.appendChild(title);
      g.appendChild(dot);
    });
  }

  // ---------- rendering ----------
  function render(){
    recomputeAssignments();
    renderAlertBar();
    renderAlertCards();
    renderBoroughStatus();
    renderMapMarkers();
  }

  function renderAlertBar(){
    const head = document.getElementById('alertBarHead');
    const list = document.getElementById('alertList');
    const pending = incidents.filter(i => i.status === 'pending').sort((a,b) => a.rank - b.rank || a.ts - b.ts);
    const majors = pending.filter(i => i.rank <= 2);
    list.innerHTML = '';

    if (pending.length === 0){
      head.className = 'alert-bar-head clear';
      head.textContent = '✅ ALL CLEAR — NO ACTIVE INCIDENTS';
      return;
    }
    if (majors.length > 0){
      head.className = 'alert-bar-head active';
      head.innerHTML = `<span class="siren">🚨</span> ${majors.length} MAJOR INCIDENT${majors.length > 1 ? 'S' : ''} ACTIVE — EMERGENCY DISPATCH IN PROGRESS`;
    } else {
      head.className = 'alert-bar-head clear';
      head.textContent = `⚠️ ${pending.length} MINOR INCIDENT${pending.length > 1 ? 'S' : ''} BEING HANDLED — NO MAJOR THREATS`;
    }
    pending.forEach(inc => {
      const line = document.createElement('div');
      line.className = 'alert-line';
      line.style.borderLeftColor = RANK_COLOR[inc.rank].replace('var(', '').replace(')', '') ? '' : '';
      line.style.borderLeftColor = getComputedColor(inc.rank);
      line.innerHTML = `<span class="lvl" style="background:${RANK_COLOR[inc.rank]}">${severityLabel(inc.rank)}</span> ${escapeHtml(inc.category)} — ${inc.borough} — ${inc.assignmentStatus}`;
      list.appendChild(line);
    });
  }

  function getComputedColor(rank){
    const map = { 1:'#e0201a', 2:'#ea7d16', 3:'#d7b100', 4:'#1f8a4c', 5:'#1c5fd6' };
    return map[rank];
  }

  function renderAlertCards(){
    const container = document.getElementById('alertCards');
    const empty = document.getElementById('queueEmpty');
    const flag = document.getElementById('queueCountFlag');
    const pending = incidents.filter(i => i.status === 'pending').slice().sort((a,b) => a.rank - b.rank || a.ts - b.ts);

    container.innerHTML = '';
    flag.textContent = `${pending.length} ACTIVE`;
    if (pending.length === 0){ container.style.display = 'none'; empty.style.display = 'block'; return; }
    container.style.display = ''; empty.style.display = 'none';

    pending.forEach(inc => {
      const card = document.createElement('div');
      card.className = 'alert-card';

      const head = document.createElement('div');
      head.className = 'alert-card-head' + (inc.rank <= 2 ? ' major' : '');
      head.style.background = inc.rank <= 2 ? '' : getComputedColor(inc.rank);
      const aiNote = (inc.baseRank && inc.baseRank !== inc.rank)
        ? ` <span style="font-family:var(--font-mono); font-size:0.62rem; opacity:0.85;">(AI ${inc.rank < inc.baseRank ? 'escalated' : 'de-escalated'} from ${severityLabel(inc.baseRank)})</span>`
        : '';
      head.innerHTML = `${inc.rank <= 2 ? '🚨' : '⚠️'} ${RANK_LABEL[inc.rank]} — ${severityLabel(inc.rank).toUpperCase()} — ${escapeHtml(inc.category)}${aiNote}`;
      card.appendChild(head);

      const body = document.createElement('div');
      body.className = 'alert-card-body';
      body.innerHTML = `
        <div class="desc-text">${escapeHtml(inc.description || '(no description given)')}</div>
        <div class="meta-row">
          <span><strong>${inc.borough}</strong></span>
          <span>${BOROUGHS[inc.borough].facility}</span>
        </div>
        <div class="units-row">
          ${inc.units.length
            ? `<span class="status-dispatched">${inc.assignmentStatus}</span>` + inc.units.map(u => `<span class="unit-tag">${escapeHtml(vehicleLabel(inc, u))}</span>`).join('')
            : `<span class="status-queued">${inc.assignmentStatus}</span>`}
        </div>
        <div class="card-actions"><button class="btn-resolve" type="button">Resolve</button></div>
      `;
      body.querySelector('.btn-resolve').addEventListener('click', () => resolveIncident(inc.id));
      card.appendChild(body);
      container.appendChild(card);
    });
  }

  function renderBoroughStatus(){
    const el = document.getElementById('boroughStatus');
    el.innerHTML = '';
    Object.keys(BOROUGHS).forEach(b => {
      const fleetFlags = boroughUnitFlags(b);
      const flagsHtml = fleetFlags.map(f =>
        `<span class="flag ${f.available === 0 ? 'busy' : ''}">${f.short} ${f.available}/${f.total}</span>`
      ).join('');
      const row = document.createElement('div');
      row.className = 'borough-row';
      row.innerHTML = `
        <div>
          <div class="borough-name">${b}</div>
          <div class="borough-facility">${BOROUGHS[b].facility}</div>
        </div>
        <div class="unit-flags">${flagsHtml}</div>`;
      el.appendChild(row);
    });
  }

  function escapeHtml(str){
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ---------- actions ----------
  function logIncident(rankOverride){
    const description = document.getElementById('desc').value.trim();
    const cat = categoryFor(selectedCategory);
    const borough = selectedBorough;
    if (!cat || !borough) return;

    const effectiveRank = rankOverride || cat.rank;
    const incident = {
      id: nextId++, description, category: cat.name, rank: effectiveRank, baseRank: cat.rank, borough,
      ts: Date.now() + Math.random(), status: 'pending', units: [], assignmentStatus: ''
    };
    incidents.push(incident);
    document.getElementById('desc').value = '';
    setAiPill('', 'AI IDLE — awaiting a report');
    render();
    announceDispatch(incident);
    return incident;
  }

  const GRUMPY_DISPATCH = ["Oh, great, another one.", "Ugh, fine, on it.", "Here we go again.", "Wonderful. Just wonderful.", "Can't catch a break, can we.", "Adding it to the pile."];
  const GRUMPY_RESOLVE = ["Finally.", "About time.", "One less thing to worry about.", "Good. Don't get used to it.", "Took long enough."];
  function pick(arr){ return arr[Math.floor(Math.random() * arr.length)]; }

  function announceDispatch(incident){
    const tier = incident.rank <= 2 ? 'Major' : 'Minor';
    let line;
    if (incident.units.length){
      const vehicleNames = incident.units.map(u => vehicleLabel(incident, u)).join(', ');
      line = `${pick(GRUMPY_DISPATCH)} ${tier} alert in ${incident.borough}. ${vehicleNames}, move.`;
    } else {
      line = `${pick(GRUMPY_DISPATCH)} ${tier} alert in ${incident.borough}, but everyone's busy — ${incident.assignmentStatus.toLowerCase()}.`;
    }
    karenStatus.textContent = line;
    speak(line);
  }

  function resolveIncident(id){
    const inc = incidents.find(i => i.id === id);
    if (inc){
      const freedVehicles = inc.units.map(u => vehicleLabel(inc, u));
      releaseAllVehicles(inc);
      inc.status = 'resolved';
      render();
      const line = freedVehicles.length
        ? `${pick(GRUMPY_RESOLVE)} ${inc.borough} alert's closed. ${freedVehicles.join(', ')} back on the bench.`
        : `${pick(GRUMPY_RESOLVE)} ${inc.borough} alert's closed.`;
      karenStatus.textContent = line;
      speak(line);
    }
  }

  document.getElementById('logBtn').addEventListener('click', () => {
    clearTimeout(typingTimer);
    attemptAutoClassify(document.getElementById('desc').value);
  });

  buildMap();
  render();
})();