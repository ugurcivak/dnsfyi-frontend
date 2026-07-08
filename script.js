// ── Particles ──
const canvas = document.getElementById("particles");
const ctx = canvas.getContext("2d");
let pts = [], w, h;

function resizeCanvas() {
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

for (let i = 0; i < 60; i++) {
  pts.push({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    r: Math.random() * 1.5 + 0.5,
  });
}

function drawParticles() {
  ctx.clearRect(0, 0, w, h);
  for (const p of pts) {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
    if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(56,189,248,0.25)"; ctx.fill();
  }
  // connections
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 140) {
        ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
        ctx.strokeStyle = `rgba(56,189,248,${0.06 * (1 - dist / 140)})`;
        ctx.lineWidth = 0.5; ctx.stroke();
      }
    }
  }
  requestAnimationFrame(drawParticles);
}
drawParticles();

// ── State ──
let analyzing = false;
let currentTaskId = null;
const DEFAULT_DOMAIN = "";
function _t(tr, en) { return document.documentElement.lang === "en" ? en : tr; }
const STATUSES = [_t("DNS kayıtları sorgulanıyor","Querying DNS records"), _t("DNS güvenliği kontrol ediliyor","Checking DNS security"), _t("Email güvenliği analiz ediliyor","Analyzing email security"), _t("Subdomain keşfi yapılıyor","Discovering subdomains"), _t("Gecikme ölçülüyor","Measuring latency"), _t("Reverse DNS sorgulanıyor","Querying reverse DNS"), _t("ASN bilgisi alınıyor","Getting ASN info"), _t("Propagation kontrol ediliyor","Checking propagation"), _t("Tamamlanıyor","Finalizing")];

// ── Helper ──
function setDomain(d) {
  document.getElementById("domain-input").value = d;
  analyze();
}

function resetSearch() {
  document.getElementById("hero").classList.remove("collapsed");
  document.getElementById("results").innerHTML = "";
  document.getElementById("breadcrumb").innerHTML = "";
  const features = document.getElementById("features");
  if (features) features.style.display = "grid";
  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(() => document.getElementById("domain-input").focus(), 400);
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function updateLoadingStatus(idx) {
  const el = document.getElementById("loading-status");
  if (el && STATUSES[idx]) el.textContent = STATUSES[idx];
}

// ── Toast ──
let toastTimer;
function showToast(msg, isError) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.style.background = isError ? "var(--red-bg)" : "var(--bg-elevated)";
  t.style.color = isError ? "var(--red)" : "var(--text-primary)";
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2500);
}

// ── Favorites (localStorage) ──
function getFavorites() { return JSON.parse(localStorage.getItem("dnsFavs") || "[]"); }
function setFavorites(f) { localStorage.setItem("dnsFavs", JSON.stringify(f)); }

function isFavorite(domain) {
  return getFavorites().some((f) => f.domain === domain);
}

function toggleFavorite(domain) {
  const favs = getFavorites();
  const idx = favs.findIndex((f) => f.domain === domain);
  if (idx !== -1) {
    favs.splice(idx, 1);
    setFavorites(favs);
    showToast(_t("Favorilerden çıkarıldı","Removed from favorites"));
    updateFavStar(domain, false);
  } else {
    favs.unshift({ domain, date: new Date().toISOString().slice(0, 10) });
    if (favs.length > 20) favs.length = 20;
    setFavorites(favs);
    showToast(_t("Favorilere eklendi","Added to favorites"));
    updateFavStar(domain, true);
  }
}

function updateFavStar(domain, isFav) {
  const star = document.querySelector(`#results [data-action="toggle-fav-domain"][data-domain="${attrEsc(domain)}"]`);
  if (star) {
    star.innerHTML = isFav
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="var(--yellow)" stroke="var(--yellow)" stroke-width="2" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    star.parentElement.title = isFav ? _t("Favorilerden çıkar","Remove from favorites") : _t("Favorilere ekle","Add to favorites");
  }
  const heroBtn = document.getElementById("heroFavBtn");
  if (heroBtn) {
    heroBtn.innerHTML = isFav
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="var(--yellow)" stroke="var(--yellow)" stroke-width="2" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    heroBtn.title = isFav ? _t("Favorilerden çıkar","Remove from favorites") : _t("Favorilere ekle","Add to favorites");
  }
}

// ── Analyze (2-phase) ──
async function analyze() {
  const domain = document.getElementById("domain-input").value.trim();
  const resultsEl = document.getElementById("results");
  const loadingEl = document.getElementById("loading");
  const skeletonEl = document.getElementById("loading-skeleton");
  const featuresEl = document.getElementById("features");
  const btn = document.getElementById("analyze-btn");

  if (!domain) { showToast(_t("Domain girin","Enter a domain"), true); return; }
  if (analyzing) return;

  // Check localStorage cache
  const cacheKey = "dnsCache:" + domain;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < 300000) {
        const age = Math.floor((Date.now() - parsed.timestamp) / 60000);
        renderResults(parsed.data);
        document.getElementById("hero").classList.add("collapsed");
        const heroFavC = document.getElementById("heroFavBtn");
        if (heroFavC) heroFavC.dataset.domain = domain;
        if (featuresEl) featuresEl.style.display = "none";
        const ageText = age < 1 ? _t("az önce", "just now") : _t(`${age} dk önce`, `${age} min ago`);
        const cacheHtml = `<div style="grid-column:1/-1;display:flex;align-items:center;gap:8px;justify-content:center;padding:0 24px;font-size:0.7rem;color:var(--text-muted)">
          <span>🕐 ${_t("Önbellekten gösteriliyor","Showing from cache")} (${ageText})</span>
          <button class="new-search-btn" style="font-size:0.7rem;padding:3px 10px" data-action="refresh-cache" data-domain="${esc(domain)}">${_t("Yenile","Refresh")}</button>
        </div>`;
        resultsEl.insertAdjacentHTML("afterbegin", cacheHtml);
        if (parsed.data && parsed.data.taskId) pollTask(parsed.data.taskId);
        return;
      }
    } catch {}
  }

  analyzing = true;
  currentTaskId = null;
  visitedTabs = {}; // Reset on new analysis
  btn.disabled = true;
  btn.innerHTML = `<div class="spinner" style="width:16px;height:16px;border-width:2px;margin:0"></div>`;
  if (featuresEl) featuresEl.style.display = "none";
  resultsEl.innerHTML = "";
  loadingEl.style.display = "block";
  loadingEl.querySelector(".loading-content").style.display = "none";
  if (skeletonEl) skeletonEl.style.display = "grid";
  document.getElementById("loading-bar-fill").style.width = "0%";

  // Tab title progress
  const origTitle = document.title;

  let statusIdx = 0;
  const statusInterval = setInterval(() => {
    statusIdx++;
    if (statusIdx < STATUSES.length) updateLoadingStatus(statusIdx);
    const bar = document.getElementById("loading-bar-fill");
    const cur = parseFloat(bar.style.width || "0");
    if (cur < 85) { const pct = Math.min(85, Math.round(cur + Math.random() * 7)); bar.style.width = pct + "%"; document.title = "%" + pct + " - dnsfyi"; }
  }, 700);
  updateLoadingStatus(0);

  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain }),
    });
    const remaining = res.headers.get("X-RateLimit-Remaining");
    if (remaining !== null) updateRateLimit(parseInt(remaining));
    const data = await res.json();
    if (data.error) { clearInterval(statusInterval); loadingEl.style.display = "none"; if (skeletonEl) skeletonEl.style.display = "none"; loadingEl.querySelector(".loading-content").style.display = ""; showToast(data.error, true); return; }

    clearInterval(statusInterval);
    document.getElementById("loading-bar-fill").style.width = "100%";
    document.title = origTitle;
    await sleep(350);
    loadingEl.style.display = "none";
    if (skeletonEl) skeletonEl.style.display = "none";
    loadingEl.querySelector(".loading-content").style.display = "";

  // Collapse hero
  document.getElementById("hero").classList.add("collapsed");
  const heroFav = document.getElementById("heroFavBtn");
  if (heroFav) heroFav.dataset.domain = domain;

  // Phase 1: render partial results immediately
    renderResults(data);

    // Save to cache
    try { localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data })); } catch {}

    // Update browser URL
    history.replaceState(null, "", "/" + encodeURIComponent(domain));

    // Phase 2: poll for slow checks
    if (data.taskId) {
      currentTaskId = data.taskId;
      pollTask(data.taskId);
    }
  } catch (err) {
    clearInterval(statusInterval);
    loadingEl.style.display = "none";
    if (skeletonEl) skeletonEl.style.display = "none";
    loadingEl.querySelector(".loading-content").style.display = "";
    document.title = origTitle;
    if (featuresEl) featuresEl.style.display = "grid";
    resultsEl.innerHTML = `<div class="error-msg">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      ${esc(err.message)}
    </div>`;
  } finally {
    analyzing = false;
    btn.disabled = false;
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg> ${_t("Analiz Et","Analyze")}`;
  }
}

async function pollTask(taskId) {
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(2000);
    if (taskId !== currentTaskId) return; // Cancelled by new analysis
    try {
      const res = await fetch(`/api/analyze-poll/${taskId}`);
      const data = await res.json();
      if (data.phase === "unknown") { document.getElementById("results").innerHTML = `<div class="error-msg">${_t("Analiz süresi doldu, tekrar deneyin","Analysis expired, please try again")}</div>`; return; }
      if (data.phase === "complete") {
        if (data.dns || data.email || data.dnsSecurity) {
          renderResults(data);
          const domain = data.domain || document.getElementById("domain-input").value.trim();
          if (domain) {
            try { localStorage.setItem("dnsCache:" + domain, JSON.stringify({ timestamp: Date.now(), data })); } catch {}
          }
        } else {
          document.getElementById("results").innerHTML = `<div class="error-msg">${_t("Analiz tamamlandı ancak sonuç alınamadı","Analysis completed but no results")}</div>`;
        }
        return;
      }
    } catch {}
  }
  document.getElementById("results").innerHTML = `<div class="error-msg">${_t("Analiz zaman aşımına uğradı, lütfen tekrar deneyin","Analysis timed out, please try again")}</div>`;
}

// ── Render Results ──
function renderResults(data) {
  const el = document.getElementById("results");
  const domain = data.domain || document.getElementById("domain-input").value.trim();

  const leftItems = [], rightItems = [];

  // Left column: DNS Records, Subdomains, DNS Latency
  if (data.dns) {
    leftItems.push(renderSection(_t("DNS Kayıtları","DNS Records"), "globe", renderDNS(data.dns)));
  }
  if (data.subdomains && data.subdomains.length > 0) {
    leftItems.push(renderSection(_t(`Subdomain Keşfi`,`Subdomains`) + ` (${data.subdomains.length})`, "search", renderSubdomains(data.subdomains)));
  }
  if (data.dnsLatency && data.dnsLatency.length > 0) {
    leftItems.push(renderSection(_t("DNS Yanıt Süreleri","DNS Response Times"), "activity", renderDnsLatency(data.dnsLatency)));
  }

  // Right column: Domain Summary, DNS Security, Tech Stack, ASN
  rightItems.push(renderSection(_t("Domain Özeti","Domain Summary"), "info", renderHealthScore(data)));
  if (data.dnsSecurity) {
    rightItems.push(renderSection(_t("DNS Güvenlik","DNS Security"), "shield", renderDNSSecurity(data.dnsSecurity)));
  }
  if (data.techStack) {
    rightItems.push(renderSection(_t("Teknoloji","Tech Stack"), "code", renderTechStack(data.techStack)));
  }
  if (data.asn) {
    rightItems.push(renderSection(_t("ASN / IP Bilgisi","ASN / IP Info"), "info", renderASN(data.asn)));
  }

  let html = '<div class="col-left">' + leftItems.join('') + '</div>';
  html += '<div class="col-right">' + rightItems.join('') + '</div>';

  html += `<div style="grid-column:1/-1;display:flex;flex-direction:column;align-items:center;gap:12px;padding:10px;color:var(--text-muted);font-size:0.7rem">
    <span>${_t("Tamamlandı","Completed")} · ${data.took}ms</span>
    <div style="display:flex;gap:10px">
      <button class="export-quick-btn" data-action="share" title="${_t("Linki Kopyala","Copy Link")}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
      </button>
      <button class="export-quick-btn" data-export="pdf" title="PDF">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        PDF
      </button>
      <button class="export-quick-btn" data-export="json" title="JSON">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        JSON
      </button>
      <button class="export-quick-btn" data-export="md" title="MD">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        MD
      </button>
      <button class="export-quick-btn" data-action="toggle-fav-domain" data-domain="${esc(data.domain)}" title="${isFavorite(data.domain) ? _t("Favorilerden çıkar","Remove from favorites") : _t("Favorilere ekle","Add to favorites")}">
        ${isFavorite(data.domain)
          ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="var(--yellow)" stroke="var(--yellow)" stroke-width="2" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
          : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'}
      </button>
      <button class="new-search-btn" data-action="new-search" style="font-size:.82rem;padding:8px 20px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        ${_t("Yeni Sorgu","New Query")}
      </button>
    </div>
  </div>`;

  el.innerHTML = html;
  el.querySelectorAll(".section-header").forEach((h) => {
    h.addEventListener("click", () => h.parentElement.classList.toggle("collapsed"));
  });

  lastResult = data;
}

function renderSection(title, icon, body, gridColumn) {
  if (!body) return "";
  const gc = gridColumn ? `style="grid-column:${gridColumn}"` : "";
  const icons = {
    globe: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>`,
    radio: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><circle cx="12" cy="12" r="3"/></svg>`,
    mail: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
    lock: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`,
    code: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    file: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    shield: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    terminal: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
    search: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    info: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    refresh: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>`,
    activity: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    server: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
    lock: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`,
  };
  return `<div class="section" ${gc}>
    <div class="section-header">
      <div class="section-title">${icons[icon] || ""} ${title}</div>
      <svg class="section-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
    <div class="section-body">${body}</div>
  </div>`;
}

// ── Render helpers ──
function esc(s) { if (s == null) return ""; const d = document.createElement("div"); d.textContent = String(s); return d.innerHTML; }
function attrEsc(s) { return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function copyText(t) { navigator.clipboard.writeText(t).then(() => showToast(_t("Kopyalandı","Copied"))).catch(() => {}); }

const _l = () => document.documentElement.lang === "en";
const SERVICE_ICONS = {
  microsoft365: '<svg width="14" height="14" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" rx="1" fill="#f25022"/><rect x="11" y="1" width="9" height="9" rx="1" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" rx="1" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" rx="1" fill="#ffb900"/></svg>',
  google: '<svg width="14" height="14" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285f4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34a853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fbbc05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#ea4335"/></svg>',
  github: '<svg width="14" height="14" viewBox="0 0 24 24" fill="#6e40c9"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>',
  stripe: '<svg width="14" height="14" viewBox="0 0 24 24" fill="#635bff"><path d="M13.08 12.36c-1.47-.6-2.05-.98-2.05-1.64 0-.64.59-1.1 1.55-1.1.98 0 1.73.33 2.3.83l1.26-1.46c-.72-.68-1.78-1.18-3.29-1.18-2.05 0-3.6 1.2-3.6 2.98 0 1.88 1.38 2.68 3.18 3.45 1.38.57 1.88.96 1.88 1.66 0 .73-.68 1.23-1.76 1.23-1.16 0-2.08-.48-2.69-1.08l-1.33 1.43c.75.78 1.94 1.42 3.56 1.42 2.16 0 3.8-1.19 3.8-3.13 0-1.92-1.38-2.67-3.2-3.45h-.01zM3 12c0-4.97 4.03-9 9-9s9 4.03 9 9-4.03 9-9 9-9-4.03-9-9z"/></svg>',
  apple: '<svg width="14" height="14" viewBox="0 0 24 24" fill="#555"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>',
  facebook: '<svg width="14" height="14" viewBox="0 0 24 24" fill="#1877f2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
};

function detectTxtService(val) {
  const v = val.toLowerCase();
  if (v.includes("spf.protection.outlook.com") || v.includes("_spf.outlook.com") || /^ms=/.test(v)) return { id: "microsoft365", name: "Microsoft 365", color: "#0f6cbd" };
  if (v.includes("_spf.google.com") || v.includes("google-site-verification")) return { id: "google", name: "Google", color: "#4285f4" };
  if (v.includes("facebook-domain-verification")) return { id: "facebook", name: "Facebook", color: "#1877f2" };
  if (v.includes("atlassian-domain-verification")) return { id: "atlassian", name: "Atlassian", color: "#0052cc" };
  if (v.includes("keybase-site-verification")) return { id: "keybase", name: "Keybase", color: "#33a0ff" };
  if (v.includes("stripe-verification")) return { id: "stripe", name: "Stripe", color: "#635bff" };
  if (v.includes("haveibeenpwned") || v.includes("hibp")) return { id: "hibp", name: "HIBP", color: "#e11d48" };
  if (v.includes("globalsign-domain-verification")) return { id: "globalsign", name: "GlobalSign", color: "#e8762d" };
  if (v.includes("docusign") || v.includes("docusign-domain-verification")) return { id: "docusign", name: "DocuSign", color: "#7c3aed" };
  if (v.includes("apple-domain-verification") || v.includes("apple-domain")) return { id: "apple", name: "Apple", color: "#555" };
  if (v.includes("linkedin-domain-verification") || v.includes("linkedin")) return { id: "linkedin", name: "LinkedIn", color: "#0a66c2" };
  if (v.includes("github")) return { id: "github", name: "GitHub", color: "#6e40c9" };
  if (v.includes("shopify")) return { id: "shopify", name: "Shopify", color: "#5e8e3e" };
  if (v.includes("zendesk")) return { id: "zendesk", name: "Zendesk", color: "#03363d" };
  if (v.includes("notion")) return { id: "notion", name: "Notion", color: "#000" };
  if (v.includes("figma")) return { id: "figma", name: "Figma", color: "#f24e1e" };
  if (v.includes("zoom")) return { id: "zoom", name: "Zoom", color: "#2d8cff" };
  if (v.startsWith("v=spf1")) return { id: "spf", name: "SPF", color: "var(--accent)" };
  if (v.startsWith("v=dmarc")) return { id: "dmarc", name: "DMARC", color: "var(--accent)" };
  return null;
}

function formatDate(d) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  const locale = document.documentElement.lang === "en" ? "en-US" : "tr-TR";
  return date.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

function daysUntil(d) {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date.getTime())) return null;
  const now = new Date();
  const diff = date - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ── Event binding (no onclick in HTML) ──
document.addEventListener("DOMContentLoaded", () => {
  // Theme
  applyTheme();
  const themeBtn = document.getElementById("themeBtn");
  if (themeBtn) themeBtn.addEventListener("click", toggleTheme);
  // Lang toggle
  const langBtn = document.getElementById("langBtn");
  if (langBtn) langBtn.addEventListener("click", toggleLang);
  // Analyze
  const analyzeBtn = document.getElementById("analyze-btn");
  if (analyzeBtn) analyzeBtn.addEventListener("click", analyze);
  // Email header analyze
  const emailBtn = document.getElementById("btn-analyze-email");
  if (emailBtn) emailBtn.addEventListener("click", analyzeEmailHeaders);
  // Email header v2 analyze
  const emailBtnV2 = document.getElementById("btn-analyze-email-v2");
  if (emailBtnV2) emailBtnV2.addEventListener("click", analyzeEmailHeadersV2);
  // Domain input placeholder behavior
  const di = document.getElementById("domain-input");
  if (di) {
    di.placeholder = _t("Domain veya IP (örn. google.com)","Domain or IP (e.g. google.com)");
  }
  // Reverse IP button
  const reverseIpBtn = document.getElementById("btn-reverse-ip");
  if (reverseIpBtn) reverseIpBtn.addEventListener("click", () => analyzeReverseIp());
  const reverseIpInput = document.getElementById("reverse-ip-input");
  if (reverseIpInput) reverseIpInput.addEventListener("keydown", (e) => { if (e.key === "Enter") analyzeReverseIp(); });
});

// Click delegation for data-* attributes
document.addEventListener("click", (e) => {
  const target = e.target.closest("[data-action],[data-tab],[data-module],[data-tool],[data-domain],[data-example],[data-example-v2],[data-export],[data-copy],#port-scan-btn-custom,#port-scan-btn-reset");
  if (!target) return;

  const action = target.dataset.action;
  if (action === "lang") { toggleLang(); return; }
  if (action === "analyze-email") { analyzeEmailHeaders(); return; }
  if (action === "lang") { toggleLang(); return; }
  if (action === "toggle-fav-domain") { const d = target.dataset.domain; if (d) toggleFavorite(d); return; }
  if (action === "new-search") { resetSearch(); return; }
  if (action === "refresh-cache") { const d = target.dataset.domain; if (d) { localStorage.removeItem("dnsCache:" + d); analyze(); } return; }
  if (action === "share-email") { shareEmailResult(); return; }
  if (action === "share") { const domain = document.getElementById("domain-input").value.trim(); if (domain) shareResults(domain); return; }

  const tab = target.dataset.tab;
  if (tab) { switchTab(tab); return; }

  const tool = target.dataset.tool;
  if (tool === "port-scan") { switchTab(tool); return; }
  if (tool) {
    if (activeTab !== "fazlasi") switchTab("fazlasi");
    const domain = document.getElementById("domain-input").value.trim();
    if (!domain) { showToast(_t("Lütfen bir domain girin","Please enter a domain"), true); return; }

    const resultsEl = document.getElementById("results-propagation");
    if (!resultsEl) return;
    resultsEl.innerHTML = '<div style="text-align:center;padding:30px"><div class="spinner"></div><div style="color:var(--text-muted);margin-top:8px">' + _t("Sorgulanıyor...","Querying...") + '</div></div>';
    resultsEl.scrollIntoView({ behavior: "smooth", block: "start" });

    if (tool === "propagation") {
      // Need full analyze for propagation (Phase 2)
      fetch("/api/analyze", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({domain}) })
        .then(r=>r.json()).then(j=>{
          if (j.error) { resultsEl.innerHTML = `<div class="error-msg">${esc(j.error)}</div>`; return; }
          // Poll for full data
          const poll = async () => {
            for (let i=0; i<30; i++) {
              await new Promise(r=>setTimeout(r,2000));
              const p = await fetch("/api/analyze-poll/"+j.taskId).then(r=>r.json());
              if (p.propagation) { resultsEl.innerHTML = renderSection("DNS Propagation", "radio", renderPropagation(p.propagation)); resultsEl.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
              if (p.phase === "complete") { resultsEl.innerHTML = `<div style="color:var(--text-muted)">${_t("Propagation verisi alınamadı","Could not get propagation data")}</div>`; return; }
            }
            resultsEl.innerHTML = `<div style="color:var(--text-muted)">${_t("Zaman aşımı","Timeout")}</div>`;
          };
          poll();
        }).catch(() => resultsEl.innerHTML = '<div class="error-msg">Sorgu başarısız</div>');
      return;
    }

    const endpoints = { "reverse-ip": "/api/reverse-ip", "blacklist": "/api/blacklist" };
    const endpoint = endpoints[tool];
    if (!endpoint) return;

    fetch(endpoint, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({domain}) })
      .then(r=>r.json()).then(d=>{
        if (d.error) { resultsEl.innerHTML = `<div class="error-msg">${esc(d.error)}</div>`; resultsEl.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
        if (tool === "blacklist") resultsEl.innerHTML = renderSection(_t("Kara Liste","Blacklist") + " (DNSBL)", "shield", renderBlacklist(d.results));
        else if (tool === "port-scan") resultsEl.innerHTML = renderSection(_t("Port Tarama","Port Scan"), "terminal", renderPorts(d.ports));
        else if (tool === "reverse-ip") resultsEl.innerHTML = renderSection(_t("IP Sorgu","Reverse IP"), "globe", renderReverseIp(d));
        resultsEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }).catch(() => { resultsEl.innerHTML = '<div class="error-msg">Sorgu başarısız</div>'; resultsEl.scrollIntoView({ behavior: "smooth", block: "start" }); });
    return;
  }

  const module = target.dataset.module;
  if (module) { analyzeModule(module); return; }

  // Reset port scan
  if (target.id === "port-scan-btn-reset" || target.closest("#port-scan-btn-reset")) {
    document.getElementById("port-port-input").value = "";
    document.getElementById("port-scan-btn-custom").click();
    return;
  }

  // Custom port scan (independent panel)
  if (target.id === "port-scan-btn-custom" || target.closest("#port-scan-btn-custom")) {
    const targetIp = (document.getElementById("domain-input")?.value || "").trim();
    if (!targetIp) { showToast(_t("Önce domain/IP girin","Enter domain/IP first"), true); return; }
    const portInput = document.getElementById("port-port-input");
    const resultsEl = document.getElementById("results-port-scan");
    const loadingEl = document.getElementById("loading-port-scan");
    if (!resultsEl || !loadingEl) return;

    // Custom single port
    if (portInput?.value) {
      const port = parseInt(portInput.value, 10);
      if (port < 1 || port > 65535) { showToast("Geçerli port (1-65535) girin", true); return; }
      loadingEl.style.display = "block";
      fetch("/api/port-check", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({domain: targetIp, port}) })
        .then(r=>r.json()).then(r=>{
          loadingEl.style.display = "none";
          resultsEl.innerHTML = `<div style="margin-bottom:12px"><div class="dns-row"><span class="dns-type" style="min-width:44px">${r.port}</span><div class="dns-values"><span style="font-weight:600;font-size:0.85rem;color:${r.open ? 'var(--green)' : 'var(--text-muted)'}">${r.open ? _t("✓ Açık","✓ Open") : _t("✗ Kapalı","✗ Closed")}</span></div></div></div>`;
        }).catch(() => { loadingEl.style.display = "none"; showToast(_t("Sorgu başarısız","Query failed"), true); });
      return;
    }

    // Full scan (all common ports)
    loadingEl.style.display = "block";
    fetch("/api/port-scan", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({domain: targetIp}) })
      .then(r=>r.json()).then(d=>{
        loadingEl.style.display = "none";
        if (d.error) { resultsEl.innerHTML = `<div class="error-msg">${esc(d.error)}</div>`; return; }
        window._lastPortScanData = d;
        resultsEl.innerHTML = renderPortScan(d);
      }).catch(() => { loadingEl.style.display = "none"; showToast(_t("Tarama başarısız","Scan failed"), true); });
    return;
  }

  const domain = target.dataset.domain;
  if (domain) {
    // If clicked from reverse IP card, switch to quick analysis tab
    if (target.classList.contains("reverse-ip-card")) {
      setDomain(domain);
      switchTab("hizli");
      setTimeout(() => analyze(), 100);
      return;
    }
    setDomain(domain);
    return;
  }

  const example = target.dataset.example;
  if (example) { loadExampleHeader(example); return; }

  const exampleV2 = target.dataset.exampleV2;
  if (exampleV2) { loadExampleHeaderV2(exampleV2); return; }

  const exportFmt = target.dataset.export;
  if (exportFmt) { exportFormat(exportFmt); return; }

  const remove = target.dataset.remove;
  if (remove) { e.stopPropagation(); removeFavorite(remove); return; }

  const copy = target.dataset.copy;
  if (copy) { copyText(copy); return; }
});

function formatRecord(v) {
  if (v == null) return "";
  if (v.exchange) return `${v.priority} ${v.exchange}`;
  if (v.nsname) return v.nsname;
  if (v.host) return `${v.priority} ${v.host}`;
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") return Object.values(v).filter((x) => typeof x !== "object").join(" ");
  return String(v);
}

function renderHealthScore(d) {
  const hs = d.healthScore;
  const score = (typeof hs === "object" && hs !== null) ? hs.score : (hs ?? 0);
  const color = score >= 80 ? "var(--green)" : score >= 50 ? "var(--yellow)" : "var(--red)";
  const bg = score >= 80 ? "var(--green-bg)" : score >= 50 ? "var(--yellow-bg)" : "var(--red-bg)";
  const label = score >= 80 ? _t("Sağlıklı","Healthy") : score >= 50 ? _t("Orta","Fair") : _t("Zayıf","Weak");
  const r = 20, c = 2 * Math.PI * r, offset = c - (c * score / 100);

  const st = [];
  if (d.dns?.a || d.dns?.aaaa) st.push('<span class="health-stat" style="color:var(--green);background:var(--green-bg)">✓ DNS</span>');
  else st.push('<span class="health-stat" style="color:var(--red);background:var(--red-bg)">✗ DNS</span>');
  if (d.email?.spf) st.push('<span class="health-stat" style="color:var(--green);background:var(--green-bg)">✓ SPF</span>');
  if (d.email?.dmarc) st.push('<span class="health-stat" style="color:var(--green);background:var(--green-bg)">✓ DMARC</span>');
  if (d.ping?.reachable) st.push(`<span class="health-stat" style="color:var(--accent);background:rgba(56,189,248,0.1)">${d.ping.ms}ms</span>`);
  st.push(`<span class="health-stat" id="bl-link" style="color:var(--accent2);background:rgba(129,140,248,0.08);cursor:pointer;border-color:rgba(129,140,248,0.2)" data-tool="blacklist" title="${_t("Kara liste kontrolü için tıklayın","Click to check blacklist")}">🔍 ${_t("Kara Liste","Blacklist")}</span>`);
  if (d.ssl) {
    const sp = d.ssl.protocol || "";
    const m = (d.ssl.cipher?.name || "").match(/AES(\d{3})/);
    const sb = m ? m[1] + "bit" : "";
    st.push(`<span class="health-stat" style="color:var(--accent2);background:rgba(129,140,248,0.08);cursor:pointer;border-color:rgba(129,140,248,0.2)" data-tab="web" title="${_t("SSL detayları için tıklayın","Click for SSL details")}">🔍 ${esc(sp)} ${sb} 🔒</span>`);
  }

  // WHOIS data
  let whoisHtml = "";
  if (d.whois) {
    const w = d.whois;
    const rows = [];
    const en = _l();
    const cleanStatus = (s) => {
      if (!s) return "";
      return s.replace(/\s+https?:\/\/\S+/g, "").trim();
    };
    if (w.registrar) rows.push(`<div class="whois-label">${en ? "Registrar:" : "Kayıt:"}</div><div class="whois-value">${esc(w.registrar)}</div>`);
    if (w.creationDate) rows.push(`<div class="whois-label">${en ? "Created:" : "Oluş:"}</div><div class="whois-value">${esc(formatDate(w.creationDate))}</div>`);
    if (w.expiryDate) {
      const remaining = daysUntil(w.expiryDate);
      const expiryColor = remaining < 30 ? "var(--red)" : remaining < 90 ? "var(--yellow)" : "var(--green)";
      rows.push(`<div class="whois-label">${en ? "Expiry:" : "Bitiş:"}</div><div class="whois-value">${esc(formatDate(w.expiryDate))} <span class="whois-expiry" style="color:${expiryColor}">${remaining > 0 ? `${remaining} ${en ? "d" : "gün"}` : (en ? "Expired" : "Süresi doldu")}</span></div>`);
    }
    let statusHtml = "";
    if (w.domainStatus) {
      const statusParts = Array.isArray(w.domainStatus) ? w.domainStatus : [w.domainStatus];
      const cleaned = statusParts.map(cleanStatus).filter(Boolean);
      if (cleaned.length > 0) {
        statusHtml = `<div class="whois-statuses">${cleaned.map(s => `<span class="domain-status">${esc(s)}</span>`).join("")}</div>`;
      }
    }
    if (rows.length > 0) {
      whoisHtml = `<div class="whois-grid">${rows.join("")}</div>${statusHtml}`;
    }
  }

  // NS bilgisi
  let nsInfo = "";
  if (d.dns?.ns?.records?.length > 0) {
    nsInfo = d.dns.ns.records.map(r => {
      const val = typeof r === "string" ? r : (r.value || r.nsname || "");
      const ips = Array.isArray(r?.ips) && r.ips.length > 0 ? ` (${r.ips.join(", ")})` : "";
      return `<span style="font-size:0.78rem;color:var(--text-secondary);font-family:'JetBrains Mono',monospace;display:block;padding:3px 0;border-bottom:1px solid var(--border)}">${esc(val)}${ips ? `<span style="color:var(--text-muted)">${esc(ips)}</span>` : ""}</span>`;
    }).join("");
  }

  return `<div class="health-section">
    <div class="health-header">
      <div class="health-top-row">
        <div class="health-domain">${esc(d.domain)} ${d.ips?.[0] ? `<span class="ip-tag">${esc(d.ips[0])}</span>` : ""}</div>
        <div class="health-right">
          <span style="font-size:0.65rem;color:var(--text-muted);font-weight:600">${_t("Skor","Score")}</span>
          <div class="health-ring-wrap">
            <svg width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="4"/><circle cx="24" cy="24" r="20" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${offset}"/></svg>
            <div class="health-number" style="color:${color}">${score}</div>
          </div>
        </div>
      </div>
      ${whoisHtml ? `<div class="dns-row"><div class="dns-values">${whoisHtml}</div></div>` : ""}
      ${nsInfo ? `<div class="dns-row"><span class="dns-type" style="min-width:auto;font-size:0.7rem">NS</span><div class="dns-values" style="display:flex;flex-direction:column;gap:3px">${nsInfo}</div></div>` : ""}
      <div class="health-stats">${st.join("")}</div>
      ${renderScoreBars(d)}
    </div>
  </div>`;
}

function renderScoreBars(d) {
  const items = [];
  const dnsOk = (d.dns?.a || d.dns?.aaaa) ? 100 : 0;
  let emailOk = 0;
  if (d.email?.spf) emailOk += 35;
  if (d.email?.dkim) emailOk += 35;
  if (d.email?.dmarc) emailOk += 30;
  const blListed = d.dnsSecurity?.blacklist?.filter(b => b.listed).length || 0;
  const blTotal = d.dnsSecurity?.blacklist?.length || 1;
  const blOk = blTotal > 0 ? Math.round((1 - blListed / blTotal) * 100) : 100;
  const nsOk = d.dns?.ns?.records?.length > 0 ? 100 : 0;

  let sslOk = 0;
  if (d.ssl) {
    const sp = d.ssl.protocol || "";
    const bitsMatch = (d.ssl.cipher?.name || "").match(/AES(\d{3})/);
    const sb = bitsMatch ? parseInt(bitsMatch[1]) : 0;
    const sd = d.ssl.daysRemaining ?? 0;
    const sc = d.ssl.certChain?.length || 0;
    if (sp.includes("TLSv1.3")) sslOk += 30;
    else if (sp.includes("TLSv1.2")) sslOk += 20;
    if (sb >= 256) sslOk += 25;
    else if (sb >= 128) sslOk += 15;
    if (sd > 90) sslOk += 25;
    else if (sd > 30) sslOk += 15;
    else if (sd > 7) sslOk += 5;
    if (sc >= 2) sslOk += 20;
    else if (sc === 1) sslOk += 5;
  }

  const bars = [
    { label: "DNS", pct: Math.round((dnsOk + nsOk) / 2) },
    { label: _t("E-posta", "Email"), pct: emailOk },

    { label: _t("Kara Liste", "Blacklist"), pct: blOk },
    { label: "SSL", pct: sslOk, loading: !d.ssl },
  ];

  for (const b of bars) {
    if (b.loading) {
      items.push('<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">' +
        '<span style="font-size:0.62rem;color:var(--text-muted);min-width:50px;text-align:right;font-weight:600">' + esc(b.label) + '</span>' +
        '<div style="flex:1;height:4px;background:var(--bg-elevated);border-radius:2px;overflow:hidden">' +
        '<div class="skeleton-bar" style="height:100%;width:100%;border-radius:2px"></div></div>' +
        '<span style="font-size:0.6rem;min-width:28px;display:inline-flex;align-items:center;justify-content:center">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2.5" stroke-linecap="round" class="pulsing-ring"><circle cx="12" cy="12" r="10"/></svg></span></div>');
      continue;
    }
    const c = b.pct > 70 ? 'var(--green)' : b.pct > 40 ? 'var(--yellow)' : 'var(--red)';
    items.push('<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">' +
      '<span style="font-size:0.62rem;color:var(--text-muted);min-width:50px;text-align:right;font-weight:600">' + esc(b.label) + '</span>' +
      '<div style="flex:1;height:4px;background:var(--bg-elevated);border-radius:2px;overflow:hidden">' +
      '<div style="height:100%;width:' + b.pct + '%;background:' + c + ';border-radius:2px"></div></div>' +
      '<span style="font-size:0.6rem;color:' + c + ';min-width:28px;font-weight:700">' + b.pct + '%</span></div>');
  }
  return '<div style="padding:4px 0">' + items.join('') + '</div>';
}

function renderDNS(dns) {
  const types = ["a","aaaa","mx","ns","txt","soa","cname","caa","srv"];
  const labels = { a:"A", aaaa:"AAAA", mx:"MX", ns:"NS", txt:"TXT", soa:"SOA", cname:"CNAME", caa:"CAA", srv:"SRV" };
  let html = '<div class="dns-grid">';
  for (const t of types) {
    const r = dns[t];
    if (!r) continue;
    let vals = "";
    if (r.status === "ok" && r.records && r.records.length > 0) {
      vals = r.records.map((v) => {
        let display = "";
        let ttl = null;
        let mxPriority = null, mxExchange = null;
        if (Array.isArray(v)) {
          display = v.join(", ");
        } else if (v && typeof v === "object") {
          if (v.address) display = v.address;
          else if (v.exchange) { mxPriority = v.priority; mxExchange = v.exchange; display = mxExchange; }
          else if (v.nsname) display = v.nsname;
          else if (v.host) { mxPriority = v.priority; display = v.host; }
          else if (v.name) { mxPriority = v.priority; display = v.name; }
          else if (v.entries) display = v.entries.join("");
          else if (v.value) display = v.value;
          else {
            const vals = Object.entries(v).filter(([k, x]) => k !== "ttl" && typeof x !== "object").map(([k, x]) => x).join(" ");
            if (vals) display = vals;
          }
          if (v.ttl != null) ttl = v.ttl;
        } else if (v != null) {
          display = String(v);
        }
        const ips = Array.isArray(v?.ips) && v.ips.length > 0 ? v.ips.join(", ") : null;
        const service = t === "txt" && display ? detectTxtService(display) : null;
        const svcBadge = service ? `<span class="svc-badge" style="display:inline-flex;align-items:center;gap:4px;background:${service.color}1a;color:${service.color};border-color:${service.color}22">${SERVICE_ICONS[service.id] || ''} ${service.name}</span>` : "";
        const prioBadge = mxPriority != null ? `<span class="mx-prio">${mxPriority}</span>` : "";
        const detailParts = [];
        if (ttl != null) detailParts.push(`<span class="dns-record-ttl">TTL:${ttl}s</span>`);
        if (ips) detailParts.push(`<span class="dns-record-ip">${esc(ips)}</span>`);
        const detailLine = detailParts.length > 0 ? `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:2px">${detailParts.join(" · ")}</div>` : "";
        return `<div class="dns-record" style="align-items:${mxPriority != null ? 'center' : 'flex-start'}">${svcBadge}${prioBadge}<span class="dns-record-val">${esc(display)}</span><button class="copy-btn" data-copy="${attrEsc(mxExchange || display)}" title="Kopyala"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>${detailLine}</div>`;
      }).join("");
    } else     if (r.status === "not_found") vals = `<span style="color:var(--text-muted)">${_t("Kayıt yok","No record")}</span>`;
    else if (r.status === "error") vals = `<span style="color:var(--red)">${esc(r.error)}</span>`;
    else vals = '<span style="color:var(--text-muted)">—</span>';
    html += `<div class="dns-row"><span class="dns-type">${labels[t]}</span><div class="dns-values">${vals}</div></div>`;
  }
  html += "</div>";
  return html;
}

function renderPropagation(prop) {
  if (!prop || prop.length === 0) return "";
  const ok = prop.filter((r) => r.status === "ok").length;
  let html = `<div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap"><span class="badge badge-ok">${ok}/${prop.length} ${_t("eşleşti","matched")}</span></div><div class="prop-grid">`;
  for (const r of prop) {
    const dc = r.status === "ok" ? "var(--green)" : r.status === "error" ? "var(--red)" : r.status === "timeout" ? "var(--yellow)" : "var(--text-muted)";
    let recs = "";
    if (r.records && r.records.length > 0) recs = r.records.map((v) => `<div class="record">${esc(formatRecord(v))}</div>`).join("");
    else if (r.error) recs = `<div class="record" style="color:var(--red)">${esc(r.error)}</div>`;
    const flag = r.flag === "tr" ? `<svg width="14" height="10" viewBox="0 0 30 20" style="vertical-align:middle;margin-right:2px"><rect width="30" height="20" fill="#E30A17" rx="1"/><circle cx="12" cy="10" r="6" fill="white"/><circle cx="13.5" cy="10" r="4.8" fill="#E30A17"/><polygon points="17,6.2 17.8,8.5 20.3,8.5 18.3,10 19.1,12.3 17,11 14.9,12.3 15.7,10 13.7,8.5 16.2,8.5" fill="white"/></svg>` : "";
    const statusText = r.status === "ok" ? _t("Tamam","OK") : r.status === "timeout" ? _t("Ulaşılamadı","Unreachable") : r.status === "not_found" ? _t("Kayıt yok","Not found") : r.status === "error" ? _t("Hata","Error") : r.status;
    html += `<div class="prop-card"><h4>${flag}${esc(r.resolver || r.name)}</h4><div class="ip">${esc(r.ip||"")}</div><div style="margin:3px 0"><span class="prop-dot" style="background:${dc}"></span>${statusText}</div>${recs}</div>`;
  }
  html += "</div>";
  return html;
}

function renderEmailHealthPage(d) {
  if (d.error) return `<div class="error-msg">${esc(d.error)}</div>`;

  const parts = [];

  // Deliverability Score Card
  const hs = d.emailScore || d.healthScore;
  if (hs) {
    const score = hs.score || 0;
    const max = hs.max || 100;
    const pct = (score / max) * 100;
    const color = pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--yellow)" : "var(--red)";
    const label = pct >= 80 ? _t("İyi","Good") : pct >= 50 ? _t("Orta","Fair") : _t("Zayıf","Weak");
    const circumference = 2 * Math.PI * 40;
    const dashoffset = circumference - (pct / 100) * circumference;

    const scored = hs.breakdown?.filter(i => !i.info) || [];
    const info = hs.breakdown?.filter(i => i.info) || [];

    let html = `<div class="score-card">`;
    html += `<div class="score-circle-wrap">`;
    html += `<svg class="score-circle" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="var(--border-subtle)" stroke-width="8"/><circle cx="50" cy="50" r="40" fill="none" stroke="${color}" stroke-width="8" stroke-dasharray="${circumference}" stroke-dashoffset="${dashoffset}" stroke-linecap="round" transform="rotate(-90 50 50)"/></svg>`;
    html += `<div class="score-value" style="color:${color}">${score}</div>`;
    html += `<div class="score-label">${label} · /${max}</div>`;
    html += `</div>`;
    html += `<div class="score-right">`;

    if (scored.length > 0) {
      html += `<div class="score-breakdown">`;
      for (const item of scored) {
        const ic = item.ok ? "var(--green)" : "var(--red)";
        const icon = item.ok ? "✓" : "";
        const tip = item.tip ? `<div style="font-size:0.58rem;color:var(--text-muted);margin-top:2px;line-height:1.2">${esc(item.tip)}</div>` : "";
        html += `<div class="score-item"><span class="score-item-name">${esc(item.label)}</span><span class="score-item-pts" style="color:${ic}">${icon} ${item.score}/${item.max}</span>${tip}</div>`;
      }
      html += `</div>`;
    }

    if (info.length > 0) {
      html += `<div class="score-info-grid">`;
      for (const item of info) {
        const ic = item.ok ? "var(--green)" : "var(--text-muted)";
        const icon = item.ok ? "✓" : "—";
        html += `<div class="score-info-card"><span class="info-icon" style="color:${ic}">${icon}</span><span class="info-name">${esc(item.label)}</span><span style="font-size:0.6rem;color:var(--text-muted);cursor:help" title="${_t('Bilgi amaçlı, puana dahil değil','For information only, not scored')}">ℹ️</span><span class="info-detail">${esc(item.detail || "")}</span></div>`;
      }
      html += `</div>`;
    }

    html += `</div></div>`;
    parts.push(html);
  }

  // MX Records
  if (d.dns?.mx?.records?.length > 0) {
    parts.push(`<div style="font-size:0.75rem;font-weight:600;color:var(--text-secondary);margin:8px 0 4px">${_t("MX Kayıtları","MX Records")}</div><div class="dns-grid" id="mx-smtp-container">`);
    for (const rec of d.dns.mx.records) {
      const ips = rec.ips?.length > 0 ? rec.ips.join(", ") : "";
      const ptrs = rec.ptr?.length > 0 ? `PTR: ${esc(rec.ptr.join(", "))}` : "";
      const ttl = rec.ttl != null ? `<span class="dns-record-ttl">TTL:${rec.ttl}s</span>` : "";
      parts.push(`<div class="dns-row" data-mx-host="${esc(rec.exchange)}"><span class="dns-type" style="min-width:36px">MX</span><div class="dns-values" style="display:flex;flex-direction:column;gap:2px"><div style="display:flex;align-items:center;gap:6px"><span class="svc-badge" style="color:var(--accent2);border-color:rgba(129,140,248,0.15);background:rgba(129,140,248,0.06);font-size:0.65rem">${rec.priority}</span><span style="font-weight:600;font-size:0.85rem;color:var(--text)">${esc(rec.exchange)}</span></div>${ips ? `<div style="font-size:0.72rem;color:var(--text-muted);font-family:'JetBrains Mono',monospace">IP: ${esc(ips)}</div>` : ""}${ptrs ? `<div style="font-size:0.68rem;color:var(--text-muted);font-family:'JetBrains Mono',monospace">${ptrs}</div>` : ""}${ttl ? `<div>${ttl}</div>` : ""}<div class="mx-smtp-rows" style="margin-top:4px;font-size:0.7rem"></div></div></div>`);
    }
    parts.push(`</div>`);
  } else {
    parts.push(`<div class="dns-row"><span class="dns-type">MX</span><div class="dns-values"><span style="color:var(--red)">✗ ${_t("MX kaydı bulunamadı","No MX record found")}</span></div></div>`);
  }

  // SPF
  if (d.email) {
    parts.push(`<div class="dns-row"><span class="dns-type">SPF</span><div class="dns-values">${d.email.spf ? `<span style="color:var(--green)">✓</span> ${esc(d.email.spf)}` : `<span style="color:var(--red)">✗ ${_t("SPF kaydı yok","No SPF record")}</span>`}</div></div>`);
    parts.push(`<div class="dns-row"><span class="dns-type">DKIM</span><div class="dns-values">${d.email.dkim ? `<span style="color:var(--green)">✓</span> Selector: ${esc(d.email.dkim.selector)}` : `<span style="color:var(--red)">✗ ${_t("DKIM kaydı yok","No DKIM record")}</span>`}</div></div>`);
    parts.push(`<div class="dns-row"><span class="dns-type">DMARC</span><div class="dns-values">${d.email.dmarc ? `<span style="color:var(--green)">✓</span> ${esc(d.email.dmarc)}` : `<span style="color:var(--red)">✗ ${_t("DMARC kaydı yok","No DMARC record")}</span>`}</div></div>`);
    parts.push(`<div class="dns-row"><span class="dns-type">BIMI <span style="font-size:0.6rem;color:var(--text-muted);cursor:help" title="${_t('Bilgi amaçlı','For information only')}">ℹ️</span></span><div class="dns-values">${d.email.bimi ? `<span style="color:var(--green)">✓</span> ${esc(d.email.bimi)}` : `<span style="color:var(--text-muted)">${_t("Kayıt yok","No record")}</span>`}</div></div>`);

    // MTA-STS policy
    const mtaSts = d.emailSecurity?.mtaSts;
    if (mtaSts) {
      const policy = mtaSts.policy;
      let stsHtml = '';
      if (mtaSts.record) {
        stsHtml += '<div style="font-size:0.72rem;color:var(--green);margin-bottom:4px">✓ ' + _t("TXT Kaydı") + ': ' + esc(mtaSts.record) + '</div>';
      } else {
        stsHtml += '<div style="font-size:0.72rem;color:var(--red);margin-bottom:4px">✗ ' + _t("TXT kaydı yok") + '</div>';
      }
      if (policy) {
        const modeColor = policy.mode === 'enforce' ? 'var(--green)' : policy.mode === 'testing' ? 'var(--yellow)' : 'var(--text-muted)';
        stsHtml += '<div style="font-size:0.7rem;color:var(--text-secondary)">' + _t("Policy") + ': <span style="color:' + modeColor + ';font-weight:700">' + esc(policy.mode || 'none') + '</span>';
        if (policy.max_age) stsHtml += ' · max_age: ' + esc(policy.max_age);
        if (policy.mx && policy.mx.length > 0) stsHtml += ' · MX: ' + policy.mx.length;
        stsHtml += '</div>';
      } else if (mtaSts.record) {
        stsHtml += '<div style="font-size:0.68rem;color:var(--text-muted)">' + _t("Policy dosyası alınamadı","Could not fetch policy file") + '</div>';
      }
      parts.push('<div class="dns-row"><span class="dns-type" style="min-width:60px">MTA-STS</span><div class="dns-values">' + stsHtml + '</div></div>');
    }

    // TLS-RPT
    const tlsRpt = d.emailSecurity?.tlsRpt;
    if (tlsRpt) {
      let rptHtml = '';
      if (tlsRpt.configured) {
        rptHtml += '<span style="color:var(--green);font-size:0.72rem">✓ ' + _t("Kayıt var","Record exists") + '</span>';
        if (tlsRpt.rua) rptHtml += ' <span style="color:var(--text-muted);font-size:0.68rem">rua: ' + esc(tlsRpt.rua) + '</span>';
      } else {
        rptHtml += '<span style="color:var(--text-muted);font-size:0.72rem">' + _t("Kayıt yok","No record") + '</span>';
      }
      parts.push('<div class="dns-row"><span class="dns-type" style="min-width:60px">TLS-RPT</span><div class="dns-values">' + rptHtml + '</div></div>');
    }

    // MX TTL Consistency
    if (d.mxTtlConsistency && d.mxTtlConsistency.length > 0) {
      const inconsistent = d.mxTtlConsistency.filter(e => !e.consistent);
      let ttlHtml = '';
      if (inconsistent.length > 0) {
        ttlHtml += '<div style="color:var(--yellow);font-size:0.65rem;margin-bottom:4px">⚠ ' + _t("Tutarsız TTL tespit edildi","Inconsistent TTL detected") + ' (' + inconsistent.length + ')</div>';
      }
      for (const e of d.mxTtlConsistency) {
        const ttlList = (e.ttls || []).join('s / ') + 's';
        const icon = e.consistent ? '<span style="color:var(--green)">✓</span>' : '<span style="color:var(--yellow)">⚠</span>';
        ttlHtml += '<div style="font-size:0.65rem;color:var(--text-muted);padding:2px 0">' + icon + ' ' + esc(e.exchange) + ': ' + ttlList + '</div>';
      }
      parts.push('<div class="dns-row"><span class="dns-type" style="min-width:60px">TTL</span><div class="dns-values">' + ttlHtml + '</div></div>');
    }
  } else {
    for (const t of ["SPF", "DKIM", "DMARC", "BIMI", "MTA-STS"]) {
      parts.push(`<div class="dns-row"><span class="dns-type">${t}</span><div class="dns-values"><span style="color:var(--text-muted)">${_t("Sorgulanamadı","Could not query")}</span></div></div>`);
    }
  }

  // Port 25/465/587
  if (d.ports) {
    for (const p of [25, 465, 587]) {
      const port = d.ports.find(x => x.port === p);
      if (port) {
        const isOpen = port.open;
        parts.push(`<div class="dns-row"><span class="dns-type">Port ${p}</span><div class="dns-values"><span style="color:${isOpen ? "var(--red)" : "var(--green)"}">${isOpen ? _t("✗ Açık","✗ Open") : _t("✓ Kapalı","✓ Closed")}${p === 25 && isOpen ? _t(" (spam riski)"," (spam risk)") : ""}</span></div></div>`);
      }
    }
  }

  // Blacklist
  if (d.dnsSecurity?.blacklist) {
    const listed = d.dnsSecurity.blacklist.filter(b => b.listed);
    const clean = d.dnsSecurity.blacklist.filter(b => !b.listed);
    parts.push(`<div style="font-size:0.75rem;font-weight:600;color:var(--text-secondary);margin:10px 0 4px">DNSBL ${_t("Kara Liste","Blacklist")}</div><div class="bl-grid">`);
      for (const b of listed) {
        parts.push(`<div class="bl-item" style="background:var(--red-bg);border-color:rgba(248,113,113,0.2)"><span class="bl-name"><span style="color:var(--red)">✗</span> ${esc(b.name)}</span></div>`);
      }
      for (const b of clean) {
        parts.push(`<div class="bl-item"><span class="bl-name"><span style="color:var(--green)">✓</span> ${esc(b.name)}</span></div>`);
      }
    parts.push(`</div>`);
  }

  return `<div class="dns-grid">${parts.join("")}</div>`;
}

function renderSSL(s) {
  if (s.error) return `<div class="error-msg">${esc(s.error)}</div>`;
  const dr = s.daysRemaining ?? 0;
  const pct = Math.min(100, Math.max(0, (dr / 365) * 100));
  const color = dr < 30 ? "var(--red)" : dr < 90 ? "var(--yellow)" : "var(--green)";
  const validLabel = dr < 30 ? _t("Süre doluyor","Expiring soon") : dr < 90 ? _t("Yaklaşıyor","Approaching") : _t("Geçerli","Valid");
  const bc = dr < 30 ? "badge-error" : dr < 90 ? "badge-warning" : "badge-ok";

  // Warning badges
  const warnings = [];

  const proto = s.protocol || "";
  if (proto.includes("TLSv1.3")) warnings.push('<span class="badge badge-ok" style="font-size:0.65rem">TLS 1.3</span>');
  else if (proto.includes("TLSv1.2")) warnings.push('<span class="badge badge-warning" style="font-size:0.65rem">TLS 1.2</span>');
  else if (proto) warnings.push(`<span class="badge badge-error" style="font-size:0.65rem">${esc(proto)}</span>`);

  const bitsMatch = (s.cipher?.name || "").match(/AES(\d{3})/);
  const bits = bitsMatch ? parseInt(bitsMatch[1]) : 0;
  if (bits >= 256) warnings.push(`<span class="badge badge-ok" style="font-size:0.65rem">${bits}bit</span>`);
  else if (bits >= 128) warnings.push(`<span class="badge badge-warning" style="font-size:0.65rem">${bits}bit</span>`);
  else if (bits > 0) warnings.push(`<span class="badge badge-error" style="font-size:0.65rem">${bits}bit</span>`);

  if (s.selfSigned) warnings.push(`<span class="badge badge-error" style="font-size:0.65rem">Self-Signed</span>`);
  if (s.certChain && s.certChain.length < 2) warnings.push(`<span class="badge badge-warning" style="font-size:0.65rem">${_t("Eksik Zincir","Short Chain")}</span>`);

  // Overall status
  const hasRed = warnings.some(w => w.includes('badge-error'));
  const hasYellow = warnings.some(w => w.includes('badge-warning'));
  let overallStatus, overallLabel;
  if (hasRed) { overallStatus = 'badge-error'; overallLabel = _t("Zayıf","Weak"); }
  else if (hasYellow) { overallStatus = 'badge-warning'; overallLabel = _t("Orta","Fair"); }
  else { overallStatus = 'badge-ok'; overallLabel = _t("Güçlü","Strong"); }

  let html = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
    <span class="badge ${overallStatus}" style="font-size:0.75rem;padding:4px 14px">${overallLabel}</span>
    <div style="display:flex;flex-wrap:wrap;gap:4px">${warnings.join("")}</div>
  </div>`;

  html += `<div style="margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
      <span style="font-size:0.75rem;color:var(--text-muted);font-weight:500">${_t("Sertifika Geçerlilik","Certificate Validity")}</span>
      <span class="badge ${bc}">${validLabel} · ${dr} ${_t("gün","days")}</span>
    </div>
    <div class="ssl-progress"><div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${color}"></div></div></div>
  </div>
  <table class="detail-table"><tbody>`;
  if (s.subject) Object.entries(s.subject).forEach(([k,v]) => { html += `<tr><td>${_t("Konu","Subject")} · ${esc(k)}</td><td>${esc(v)}</td></tr>`; });
  if (s.issuer) Object.entries(s.issuer).forEach(([k,v]) => { html += `<tr><td>${_t("Düzenleyen","Issuer")} · ${esc(k)}</td><td>${esc(v)}</td></tr>`; });
  html += `<tr><td>${_t("Başlangıç","Start")}</td><td>${esc(s.validFrom||"")}</td></tr>`;
  html += `<tr><td>${_t("Bitiş","Expiry")}</td><td>${esc(s.validTo||"")}</td></tr>`;
  if (s.subjectAltName && s.subjectAltName.length) {
    const d = s.subjectAltName.length > 15 ? s.subjectAltName.slice(0,15).join("<br>") + `<br><span style="color:var(--text-muted);font-size:0.7rem">+${s.subjectAltName.length-15} ${_t("tane daha","more")}</span>` : s.subjectAltName.join("<br>");
    html += `<tr><td>SAN</td><td style="font-size:0.76rem">${d}</td></tr>`;
  }

  // TLS details
  html += `<tr><td>${_t("TLS Versiyon","TLS Version")}</td><td>${esc(s.protocol||"")}</td></tr>`;
  html += `<tr><td>${_t("Şifreleme","Cipher")}</td><td style="font-family:'JetBrains Mono',monospace;font-size:0.74rem">${esc(s.cipher?.name||"")} <span style="color:var(--text-muted);font-size:0.65rem">(${bits}bit)</span></td></tr>`;
  html += `<tr><td>${_t("Parmak İzi","Fingerprint")} (SHA-1)</td><td style="font-family:'JetBrains Mono',monospace;font-size:0.68rem;word-break:break-all">${esc(s.fingerprint||"")}</td></tr>`;
  if (s.fingerprint256) html += `<tr><td>${_t("Parmak İzi","Fingerprint")} (SHA-256)</td><td style="font-family:'JetBrains Mono',monospace;font-size:0.68rem;word-break:break-all">${esc(s.fingerprint256)}</td></tr>`;
  if (s.ocsp) html += `<tr><td>OCSP</td><td><span class="badge badge-ok">${_t("Mevcut","Available")}</span></td></tr>`;
  else html += `<tr><td>OCSP</td><td><span class="badge badge-muted">${_t("Yok","N/A")}</span></td></tr>`;

  html += "</tbody></table>";

  // Certificate chain
  if (s.certChain && s.certChain.length > 0) {
    const chainIcons = {
      root: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
      intermediate: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
      leaf: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>',
    };
    html += `<div style="margin-top:12px"><div style="font-size:0.75rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px">${_t("Sertifika Zinciri","Certificate Chain")}</div><div class="ssl-chain">`;
    for (let i = 0; i < s.certChain.length; i++) {
      const c = s.certChain[i];
      const isRoot = i === s.certChain.length - 1;
      const isLeaf = i === 0;
      const label = isRoot ? _t("Kök","Root") : isLeaf ? _t("Domain","Domain") : _t("Ara","Intermediate");
      const icon = isRoot ? chainIcons.root : isLeaf ? chainIcons.leaf : chainIcons.intermediate;
      html += `<div class="ssl-chain-item"><div style="display:flex;align-items:center;gap:6px"><span style="color:var(--accent);flex-shrink:0">${icon}</span><span class="badge badge-info" style="font-size:0.6rem;padding:1px 8px">${label}</span><span style="font-size:0.78rem;font-weight:600;color:var(--text)">${esc(c.subject)}</span></div><div style="font-size:0.65rem;color:var(--text-muted);margin-top:3px;margin-left:20px">${_t("Düzenleyen","Issuer")}: ${esc(c.issuer)}</div></div>`;
      if (i < s.certChain.length - 1) {
        html += `<div class="ssl-chain-arrow">↓</div>`;
      }
    }
    html += `</div></div>`;
  }

  // OCSP
  html += `<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px;font-size:0.68rem;color:var(--text-muted)">
    <span>${_t("OCSP Doğrulama","OCSP Stapling")}: ${s.ocsp ? _t("Mevcut","Available") : _t("Yok","Not Available")}</span>
    <span>·</span>
    <span>${_t("Zincir","Chain")}: ${s.certChain?.length||0} ${_t("halka","links")}</span>
    <span>·</span>
    <span>${_t("Seri No","Serial")}: ${esc(s.serialNumber||"")}</span>
  </div>`;

  return html;
}

function renderHTTP(h) {
  if (h.error) return `<div style="color:var(--red);font-size:0.82rem">${esc(h.error)}</div>`;
  let html = `<table class="detail-table"><tbody><tr><td>${_t("Durum","Status")}</td><td>${h.statusCode} ${esc(h.statusMessage||"")} ${h.secure ? '🔒 HTTPS' : '⚠ HTTP'}</td></tr><tr><td>${_t("Gecikme","Latency")}</td><td>${h.latency}ms</td></tr>`;
  if (h.headers) for (const [k,v] of Object.entries(h.headers)) { if (v) html += `<tr><td style="font-family:'JetBrains Mono',monospace;font-size:0.7rem">${esc(k)}</td><td style="font-size:0.76rem;word-break:break-all">${esc(v)}</td></tr>`; }
  html += "</tbody></table>";
  return html;
}

function renderWHOIS(w) {
  let html = "";
  if (w.parsed && Object.keys(w.parsed).length > 0) {
    html += '<table class="detail-table"><tbody>';
    const keys = Object.keys(w.parsed).slice(0, 25);
    for (const k of keys) {
      const v = Array.isArray(w.parsed[k]) ? w.parsed[k].join(", ") : w.parsed[k];
      if (v && v.length < 200) html += `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`;
    }
    html += "</tbody></table>";
  }
  if (w.raw) html += `<div class="whois-raw"><details><summary>${_t("Ham WHOIS çıktısı","Raw WHOIS output")}</summary><pre>${esc(w.raw)}</pre></details></div>`;
  return html || `<div style="color:var(--text-muted)">${_t("WHOIS verisi alınamadı","Could not get WHOIS data")}</div>`;
}

function renderBlacklist(bl) {
  if (!bl || bl.length === 0) return `<div style="color:var(--text-muted)">${_t("Veri yok","No data")}</div>`;
  const l = bl.filter((r) => r.listed).length;
  let html = `<div style="display:flex;gap:6px;margin-bottom:8px"><span class="badge ${l > 0 ? "badge-error" : "badge-ok"}">${l > 0 ? l + _t(" listede"," listed") : _t("Temiz","Clean")}</span><span class="badge badge-muted">${bl.length} DNSBL</span></div><div class="bl-grid">`;
  for (const r of bl) {
    html += `<div class="bl-item"><div class="bl-name">${r.listed ? '<span style="color:var(--red)">✗</span>' : '<span style="color:var(--green)">✓</span>'} ${esc(r.name)}</div><span class="bl-status ${r.listed ? "bl-listed" : "bl-clean"}">${r.listed ? _t("Listeli","Listed") : _t("Temiz","Clean")}</span></div>`;
  }
  html += "</div>";
  return html;
}

function renderPorts(ports) {
  if (!ports || ports.length === 0) return `<div style="color:var(--text-muted)">${_t("Veri yok","No data")}</div>`;
  const mxPorts = ports.filter(p => p.mxHost).map(p => ({ ...p, category: "mail", service: `SMTP (${p.mxHost})` }));
  const directPorts = ports.filter(p => !p.mxHost);
  const open = ports.filter(p => p.open).length;
  const total = ports.length;
  const badge = open > 0
    ? `<span style="font-size:0.82rem;font-weight:700;color:var(--green)">${open} ${_t("açık","open")}</span>`
    : `<span class="badge badge-ok">${_t("Tümü kapalı","All closed")}</span>`;
  let html = `<div style="display:flex;align-items:baseline;gap:10px;margin-bottom:12px;font-size:0.9rem">${badge}<span style="font-size:0.72rem;color:var(--text-muted)">${total} ${_t("portta","ports")}</span></div>`;

  const categories = [
    { key: "mail", label: _t("Mail Portları","Mail Ports"), icon: "mail" },
    { key: "web", label: _t("Web Portları","Web Ports"), icon: "globe" },
    { key: "database", label: _t("Veritabanı Portları","Database Ports"), icon: "server" },
    { key: "admin", label: _t("Yönetim Portları","Admin Ports"), icon: "lock" },
    { key: "other", label: _t("Diğer","Other"), icon: "terminal" },
  ];

  const catIcons = {
    mail: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
    globe: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>',
    server: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    lock: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>',
    terminal: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
  };

  for (const cat of categories) {
    const catPorts = [...directPorts.filter(p => p.category === cat.key), ...(cat.key === "mail" ? mxPorts : [])];
    if (catPorts.length === 0) continue;
    html += `<div style="display:flex;align-items:center;gap:6px;font-size:0.78rem;font-weight:700;color:var(--text-secondary);margin:10px 0 6px;padding:4px 10px;background:var(--bg-elevated);border-radius:var(--radius-sm);border:1px solid var(--border)"><span style="color:var(--accent)">${catIcons[cat.icon]}</span> ${cat.label}</div><div class="port-grid">`;
    for (const p of catPorts) {
      html += `<div class="port-item ${p.open ? 'port-open' : ''}">
        <div class="port-left"><span class="port-num">${p.port}</span><span class="port-svc">${esc(p.service)}</span></div>
        <span class="port-status ${p.open ? 'port-status-open' : 'port-status-closed'}">${p.open ? 'Açık' : 'Kapalı'}</span>
      </div>`;
    }
    html += `</div>`;
  }

  return html;
}

function renderPortScan(d) {
  if (d.error) return `<div class="error-msg">${esc(d.error)}</div>`;
  let html = "";
  if (d.targetIp) {
    let parts = `<span style="font-family:'JetBrains Mono',monospace;font-size:0.82rem;font-weight:600;color:var(--text)">${esc(d.targetIp)}</span>`;
    if (d.mxIps?.length) {
      parts += ` <span style="color:var(--text-muted);font-size:0.72rem">·</span> <span style="font-size:0.72rem;color:var(--text-muted)">MX</span> ${d.mxIps.map(m => `<span style="font-family:'JetBrains Mono',monospace;font-size:0.75rem;color:var(--text-secondary)">${esc(m)}</span>`).join(" ")}`;
    }
    html += `<div class="dns-row" style="margin-bottom:8px"><span class="dns-type" style="min-width:auto;font-size:0.72rem">${_t("IP","IP")}</span><div class="dns-values">${parts}</div></div>`;
  }
  html += renderPorts(d.ports);
  return html || `<div style="color:var(--text-muted)">${_t("Port verisi alınamadı","Could not get port data")}</div>`;
}

function renderSubdomains(subs) {
  if (!subs || subs.length === 0) return `<div style="color:var(--text-muted)">${_t("Subdomain bulunamadı","No subdomains found")}</div>`;
  let html = `<div style="margin-bottom:6px"><span class="badge badge-info">${subs.length} subdomain</span></div><div class="dns-grid">`;
  for (const s of subs) {
    const ips = Array.isArray(s.ips) ? s.ips.join(", ") : s.ips || "";
    html += `<div class="dns-row"><span class="dns-type" style="min-width:auto;font-size:0.7rem;cursor:pointer" data-copy="${attrEsc(s.subdomain)}">↗</span><div class="dns-values"><span style="font-family:'JetBrains Mono',monospace;font-size:0.78rem;color:var(--text)">${esc(s.subdomain)}</span>${ips ? `<div style="font-size:0.68rem;color:var(--text-muted)">${esc(ips)}</div>` : ""}</div></div>`;
  }
  html += "</div>";
  return html;
}

function renderASN(a) {
  if (!a || !a.asn) return `<div style="color:var(--text-muted)">${_t("ASN bilgisi alınamadı","Could not get ASN info")}</div>`;
  let html = '<div class="dns-grid">';
  for (const [k,v] of Object.entries(a)) { if (v) html += `<div class="dns-row"><span class="dns-type" style="min-width:auto;font-size:0.7rem;text-transform:uppercase">${esc(k)}</span><div class="dns-values"><span style="font-size:0.78rem;color:var(--text)">${esc(v)}</span></div></div>`; }
  html += "</div>";
  return html;
}

function renderReverse(r, mxRecords) {
  let html = "";
  // Target IP PTR
  if (r?.hostnames?.length > 0) {
    html += `<div style="font-size:0.72rem;font-weight:600;color:var(--text-secondary);margin-bottom:4px">${_t("Hedef IP PTR","Target IP PTR")}</div><div style="font-family:'JetBrains Mono',monospace;font-size:0.8rem;color:var(--text)">`;
    for (const h of r.hostnames) {
      html += `<div style="padding:3px 0">${esc(h)}</div>`;
    }
    html += `</div>`;
  }
  if (!r || !r.hostnames || r.hostnames.length === 0) {
    html += '<div style="color:var(--text-muted);padding:3px 0">' + _t("PTR kaydı yok","No PTR record") + '</div>';
  }
  // MX PTR
  if (mxRecords?.length > 0) {
    const mxEntries = [];
    for (const rec of mxRecords) {
      if (rec.ptr?.length > 0) {
        for (const ptr of rec.ptr) {
          mxEntries.push({ mx: rec.exchange, ptr, ips: rec.ips || [] });
        }
      }
    }
    if (mxEntries.length > 0) {
      html += `<div style="margin-top:8px;font-size:0.72rem;font-weight:600;color:var(--text-secondary);margin-bottom:4px">MX Sunucu PTR</div>`;
      for (const m of mxEntries) {
        html += `<div style="display:flex;align-items:center;gap:6px;padding:5px 8px;margin-bottom:3px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-sm)"><span style="font-size:0.62rem;font-weight:700;color:var(--accent);background:rgba(56,189,248,0.08);padding:1px 6px;border-radius:4px">MX</span><span style="font-family:'JetBrains Mono',monospace;font-size:0.78rem;color:var(--text)">${esc(m.ptr)}</span><span style="font-size:0.65rem;color:var(--text-muted)">${esc(m.mx)} (${m.ips.join(", ")})</span></div>`;
      }
    }
  }
  return html;
}

function renderPing(p) {
  if (!p || p.error) return `<div style="color:var(--text-muted)">${esc(p?.error || _t("Ulaşılamadı","Unreachable"))}</div>`;
  const color = p.ms < 50 ? "var(--green)" : p.ms < 150 ? "var(--yellow)" : "var(--red)";
  return `<div style="display:flex;align-items:center;gap:12px;padding:2px 0">
    <span style="font-size:1.2rem;font-weight:800;color:${color}">${p.ms}<span style="font-size:0.75rem">ms</span></span>
    <span style="font-size:0.72rem;color:var(--text-muted)">${_t("Hedef: 1.1.1.1","Target: 1.1.1.1")}</span>
  </div>`;
}

function renderSMTP(d) {
  if (!d.results?.length) return '<div style="color:var(--text-muted)">' + _t("SMTP bilgisi alınamadı","No SMTP info available") + '</div>';
  let html = d.mxHosts?.length ? `<div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:10px">${_t("MX sunucuları","MX servers")}: ${esc(d.mxHosts.join(", "))}</div>` : "";
  for (const r of d.results) {
    const statusIcon = r.error ? "✗" : "✓";
    const statusColor = r.error ? "var(--red)" : "var(--green)";
    html += `<div class="eh-card" style="margin-bottom:8px">
      <div class="eh-hop-card-header">
        <span style="color:${statusColor};font-weight:700">${statusIcon}</span> ${esc(r.host)}<span style="color:var(--text-muted);font-weight:400;margin-left:4px">:${r.port}</span>
        <span style="margin-left:auto;font-size:0.65rem;color:var(--text-muted)">${r.latency}ms</span>
      </div>`;
    if (r.error) {
      html += `<div style="font-size:0.72rem;color:var(--text-muted);padding:8px 0">${esc(r.error)}</div>`;
    } else {
      html += `<div style="padding:6px 0;font-size:0.72rem">`;
      if (r.banner) html += `<div><span style="color:var(--text-secondary)">Banner:</span> <code style="font-size:0.68rem">${esc(r.banner)}</code></div>`;
      if (r.starttls) html += `<div style="margin-top:3px"><span style="color:var(--green)">✓ STARTTLS</span></div>`;
      else html += `<div style="margin-top:3px"><span style="color:var(--text-muted)">— STARTTLS yok</span></div>`;
      if (r.auth?.length) html += `<div style="margin-top:3px"><span style="color:var(--text-secondary)">AUTH:</span> ${esc(r.auth.join(", "))}</div>`;
      if (r.ehlo?.length) html += `<div style="margin-top:3px"><span style="color:var(--text-secondary)">EHLO:</span> <span style="font-size:0.65rem;color:var(--text-muted)">${esc(r.ehlo.slice(0, 6).join(", "))}${r.ehlo.length > 6 ? "…" : ""}</span></div>`;
      html += `</div>`;
    }
    html += `</div>`;
  }
  return html;
}

// ── Tab System ──
let activeTab = "hizli";
let lastResult = null;
let lastEmailResult = null;
let visitedTabs = {};

const TAB_PATHS = { hizli: "hizli", web: "web", whois: "whois", "email-health": "email-health", fazlasi: "fazlasi", "port-scan": "port", "email-header": "email-header-v2", "email-header-v2": "email-header-v2", "reverse-ip": "reverse-ip" };
const PATH_TABS = { hizli: "hizli", web: "web", whois: "whois", "email-health": "email-health", fazlasi: "fazlasi", port: "port-scan", "email-header": "email-header-v2", "email-header-v2": "email-header-v2", "reverse-ip": "reverse-ip" };

function switchTab(tab, skipHistory) {
  activeTab = tab;
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab || b.textContent.trim().toLowerCase() === tab));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === "panel-" + tab));
  if (!skipHistory && TAB_PATHS[tab]) history.pushState(null, "", "/" + TAB_PATHS[tab]);

  if (tab === "fazlasi") {
    return;
  }

  // Auto-analyze module on first visit (for standalone tool panels)
  if (tab !== "hizli" && tab !== "email-header" && tab !== "email-header-v2" && tab !== "fazlasi" && !visitedTabs[tab]) {
    visitedTabs[tab] = true;
    // Auto-populate from lastResult if available
    if (tab === "port-scan" && lastResult?.ports) {
      const el = document.getElementById("results-port-scan");
      const loading = document.getElementById("loading-port-scan");
      if (el && loading) { loading.style.display = "none"; el.innerHTML = "<div class=\"module-card\"><div class=\"module-header\"><div><h3 class=\"module-title\">" + _t("Port Tarama","Port Scan") + "</h3></div></div>" + renderPorts(lastResult.ports) + "</div>"; }
    } else {
      setTimeout(() => analyzeModule(tab), 100);
    }
  }
}

function handleRoute() {
  let path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/index.html" || path === "/index-en.html") path = "/";
  const tab = PATH_TABS[path.replace("/", "")] || "hizli";
  if (tab !== activeTab) switchTab(tab, true);
}

window.addEventListener("popstate", handleRoute);

// ── Module Analysis ──
async function analyzeModule(mod) {
  const domain = document.getElementById("domain-input").value.trim();
  if (!domain) { showToast(_t("Domain girin","Enter a domain"), true); return; }

  const resultsEl = document.getElementById("results-" + mod);
  const loadingEl = document.getElementById("loading-" + mod);
  const btn = document.querySelector(`#panel-${mod} .btn-analyze`);
  if (!resultsEl || !loadingEl) return;
  if (btn) btn.disabled = true;

  resultsEl.innerHTML = "";
  loadingEl.style.display = "block";
  if (btn) btn.innerHTML = `<div class="spinner" style="width:16px;height:16px;border-width:2px;margin:0"></div>`;

  const endpoints = { "web": "/api/web", "whois": "/api/whois-data", "port-scan": "/api/port-scan", "email-health": "/api/analyze" };
  const endpoint = endpoints[mod];
  if (!endpoint) return;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain }),
    });
    const data = await res.json();
    if (data.error) { showToast(data.error, true); loadingEl.style.display = "none"; if (btn) btn.disabled = false; return; }

    loadingEl.style.display = "none";
    if (mod === "web") resultsEl.innerHTML = renderWebSecurity(data, lastResult?.propagation);
    else if (mod === "whois") resultsEl.innerHTML = renderWHOISFull(data);
    else if (mod === "port-scan") { window._lastPortScanData = data; resultsEl.innerHTML = renderPortScan(data); }
    else if (mod === "email-health") {
      resultsEl.innerHTML = renderEmailHealthPage(data);
      const smtpController = new AbortController();
      setTimeout(() => smtpController.abort(), 20000);
      fetch("/api/smtp-diagnostics", { method:"POST", signal:smtpController.signal, headers:{"Content-Type":"application/json"}, body:JSON.stringify({domain}) })
        .then(r=>r.json()).then(smtpData => {
          if (!smtpData.results?.length) return;
          // Group results by host, pick only port 25 data for display
          const byHost = {};
          for (const r of smtpData.results) {
            if (r.port !== 25) continue;
            if (!byHost[r.host]) byHost[r.host] = [];
            byHost[r.host].push(r);
          }
          for (const [host, ports] of Object.entries(byHost)) {
            const hostAttr = host.replace(/['"]/g, "");
            const row = resultsEl.querySelector(`.dns-row[data-mx-host="${hostAttr}"]`);
            if (!row) continue;
            const container = row.querySelector(".mx-smtp-rows");
            if (!container) continue;
            const r = ports[0];
            if (r.error) {
              container.innerHTML = `<span style="color:var(--text-muted);font-size:0.65rem">SMTP: ${esc(r.error)}</span>`;
            } else {
              let parts = [`<span style="color:var(--text-muted);font-size:0.65rem">SMTP ${r.latency}ms</span>`];
              if (r.banner) parts.push(`<span style="color:var(--text-muted);font-size:0.65rem">${esc(r.banner.slice(0, 50))}</span>`);
              if (r.starttls) parts.push(`<span style="color:var(--green);font-size:0.65rem;font-weight:600">STARTTLS</span>`);
              if (r.auth?.length) parts.push(`<span style="color:var(--text-secondary);font-size:0.65rem">AUTH:${esc(r.auth.join(","))}</span>`);
              container.innerHTML = parts.join('<span style="color:var(--border);margin:0 4px">·</span>');
            }
          }
          // Show a brief note if no port 25 data
          if (!Object.keys(byHost).length) {
            const firstRow = resultsEl.querySelector(".dns-row[data-mx-host]");
            if (firstRow) {
              const container = firstRow.querySelector(".mx-smtp-rows");
              if (container) container.innerHTML = `<span style="color:var(--text-muted);font-size:0.65rem">SMTP ports not available</span>`;
            }
          }
        }).catch(() => {});
    }
  } catch (err) {
    loadingEl.style.display = "none";
    resultsEl.innerHTML = `<div class="error-msg"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> ${err.message}</div>`;
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg> ${_t("Analiz Et","Analyze")}`; }
  }

  // Auto reverse IP for web module
  if (mod === "web" && data.ips && data.ips.length > 0) {
    setTimeout(() => analyzeReverseIp(data.ips[0]), 500);
  }
}

async function analyzeReverseIp(target) {
  if (!target) {
    const input = document.getElementById("reverse-ip-input");
    target = input ? input.value.trim() : "";
  }
  if (!target) { showToast(_t("IP veya domain girin","Enter IP or domain"), true); return; }

  const resultsEl = document.getElementById("results-reverse-ip");
  const loadingEl = document.getElementById("loading-reverse-ip");
  const btn = document.getElementById("btn-reverse-ip");
  if (!resultsEl || !loadingEl) return;
  if (btn) btn.disabled = true;

  resultsEl.innerHTML = "";
  loadingEl.style.display = "block";

  try {
    const res = await fetch("/api/reverse-ip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: target }),
    });
    const data = await res.json();
    if (data.error) { showToast(data.error, true); loadingEl.style.display = "none"; if (btn) btn.disabled = false; return; }

    loadingEl.style.display = "none";
    resultsEl.innerHTML = renderReverseIp(data);
  } catch (err) {
    loadingEl.style.display = "none";
    resultsEl.innerHTML = `<div class="error-msg"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> ${err.message}</div>`;
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg> Sorgula`; }
  }
}

function renderReverseIp(data) {
  if (!data.domains || data.domains.length === 0) {
    return `<div style="color:var(--text-muted);font-size:0.82rem;padding:12px">${data.error || _t("Kayıt bulunamadı","No records found")}</div>`;
  }

  let html = `<div class="reverse-ip-count">IP: <strong>${esc(data.ip)}</strong> · ${data.count} ${_t("domain bulundu","domains found")}</div>`;
  html += `<div class="reverse-ip-grid">`;
  for (const domain of data.domains) {
    html += `<div class="reverse-ip-card" data-domain="${esc(domain)}" title="${_t("Hızlı Analiz için tıkla","Click for quick analysis")}">${esc(domain)}</div>`;
  }
  html += `</div>`;
  return html;
}

// ── Module Renderers ──
function renderDNSSecurity(d) {
  if (d.error) return `<div class="error-msg">${esc(d.error)}</div>`;

  let html = '<div class="dns-grid">';

  // DNSSEC
  const ds = d.dnssec;
  html += `<div class="dns-row"><span class="dns-type" style="min-width:58px">DNSSEC</span><div class="dns-values">${ds ? (ds.supported ? '<span style="color:var(--green)">✓ ' + _t("Destekleniyor","Supported") + '</span>' : '<span style="color:var(--red)">✗ ' + _t("Desteklenmiyor","Not supported") + '</span>') : '<span style="color:var(--text-muted)">' + _t("Sorgulanamadı","Could not query") + '</span>'}</div></div>`;

  if (d.ds && d.ds.length > 0) {
    html += `<div class="dns-row"><span class="dns-type" style="min-width:58px">DS</span><div class="dns-values" style="font-size:0.7rem">`;
    for (const r of d.ds) {
      html += `<div style="margin-bottom:2px"><span class="label">${esc(r.keyTag)}</span> Alg:${esc(r.algorithm)} Tip:${esc(r.digestType)}</div>`;
    }
    html += `</div></div>`;
  }

  if (d.dnskey && d.dnskey.length > 0) {
    html += `<div class="dns-row"><span class="dns-type" style="min-width:58px">DNSKEY</span><div class="dns-values" style="font-size:0.7rem">`;
    for (const r of d.dnskey) {
      html += `<div style="margin-bottom:2px">${r.isKSK ? '<span style="color:var(--accent)" title="Key Signing Key">KSK</span>' : '<span title="Zone Signing Key">ZSK</span>'} · Alg:${esc(r.algorithm)} <span style="color:var(--text-muted);font-size:0.65rem">${esc(r.publicKey)}</span></div>`;
    }
    html += `</div></div>`;
  }

  if (d.rrsig && d.rrsig.length > 0) {
    html += `<div class="dns-row"><span class="dns-type" style="min-width:58px">RRSIG</span><div class="dns-values" style="font-size:0.7rem">`;
    for (const r of d.rrsig) {
      html += `<div style="margin-bottom:2px"><span class="label">${esc(r.typeCovered)}</span> Alg:${esc(r.algorithm)} TTL:${esc(r.originalTtl)} KT:${esc(r.keyTag)}</div>`;
    }
    html += `</div></div>`;
  }

  if (d.nsec && d.nsec.length > 0) {
    html += `<div class="dns-row"><span class="dns-type" style="min-width:58px">NSEC</span><div class="dns-values" style="font-size:0.7rem">`;
    for (const r of d.nsec) {
      html += `<div>${esc(r.raw.substring(0, 80))}</div>`;
    }
    html += `</div></div>`;
  }

  const doh = d.doh;
  html += `<div class="dns-row"><span class="dns-type" style="min-width:58px">DoH</span><div class="dns-values">${doh?.reachable ? `<span style="color:var(--green)">✓ ${_t("Erişilebilir","Reachable")}</span> <span style="color:var(--text-muted);font-size:0.68rem">(${doh.answers} ${_t("yanıt","answers")})</span>` : '<span style="color:var(--red)">✗ ' + _t("Erişilemedi","Unreachable") + '</span>'}</div></div>`;

  const v6 = d.ipv6;
  html += `<div class="dns-row"><span class="dns-type" style="min-width:58px">IPv6</span><div class="dns-values">${v6?.hasRecord ? `<span style="color:var(--green)">✓ ${_t("Kayıt var","Record exists")}</span> <span style="color:var(--text-muted);font-size:0.68rem">(${(v6.ips||[]).join(", ")})</span>${v6.reachable ? ' <span style="color:var(--text-muted)">· ${_t("Erişilebilir","Reachable")}</span>' : ' <span style="color:var(--red)">· ' + _t("Erişilemez","Unreachable") + '</span>'}` : '<span style="color:var(--text-muted)">' + _t("AAAA kaydı yok","No AAAA record") + '</span>'}</div></div>`;

  if (d.glue && d.glue.length > 0) {
    html += '<div class="dns-row"><span class="dns-type" style="min-width:58px">Glue</span><div class="dns-values" style="font-size:0.72rem">';
    for (const g of d.glue) {
      const ips = (g.ips || []).join(", ");
      if (g.independent) {
        html += '<div style="margin-bottom:3px"><strong>' + esc(g.ns) + '</strong> → ' + (ips || _t("çözümlenemedi","unresolved")) + ' <span style="color:var(--text-muted);font-size:0.62rem">(' + _t("bağımsız NS","independent NS") + ')</span></div>';
      } else if (g.missing) {
        html += '<div style="margin-bottom:3px"><strong style="color:var(--red)">' + esc(g.ns) + '</strong> <span style="color:var(--red)">⚠ ' + _t("Glue record eksik!","Missing glue record!") + '</span></div>';
      } else {
        html += '<div style="margin-bottom:3px"><strong>' + esc(g.ns) + '</strong> → ' + ips + ' <span style="color:var(--green)">✓ Glue</span></div>';
      }
    }
    html += '</div></div>';
  }

  html += "</div>";
  return html;
}

function renderTechStack(ts) {
  const h = [];
  if (ts.dns) h.push('<span class="badge badge-info" style="display:inline-flex;align-items:center;gap:4px">' + _t("DNS","DNS") + ': ' + esc(ts.dns) + '</span>');
  if (ts.email) h.push('<span class="badge badge-info" style="display:inline-flex;align-items:center;gap:4px">' + _t("E-posta","Email") + ': ' + esc(ts.email) + '</span>');
  if (ts.hosting) h.push('<span class="badge badge-info" style="display:inline-flex;align-items:center;gap:4px">' + _t("Hosting","Hosting") + ': ' + esc(ts.hosting) + '</span>');
  if (ts.cdn) h.push('<span class="badge badge-info" style="display:inline-flex;align-items:center;gap:4px">' + _t("CDN","CDN") + ': ' + esc(ts.cdn) + '</span>');
  if (h.length === 0) return '';
  return '<div style="padding:0 4px 6px;display:flex;flex-wrap:wrap;gap:6px">' + h.join('') + '</div>';
}

function renderDnsLatency(servers) {
  let h = '<div class="dns-grid">';
  for (const s of servers) {
    const ms = s.ms || 999;
    let color = ms < 50 ? 'var(--green)' : ms < 150 ? 'var(--yellow)' : 'var(--red)';
    const label = ms < 999 ? ms + ' ms' : _t("Zaman aşımı","Timeout");
    h += '<div class="dns-row"><span class="dns-type" style="min-width:80px;font-size:0.68rem">' + esc(s.name) + '</span><div class="dns-values" style="font-size:0.75rem"><span style="color:' + color + '">' + label + '</span></div></div>';
  }
  h += '</div>';
  return h;
}

function shareResults(domain) {
  const url = location.origin + '/' + encodeURIComponent(domain);
  navigator.clipboard.writeText(url).then(() => showToast(_t("Link kopyalandı!","Link copied!"))).catch(() => fallbackCopy(url));
}

function renderWebSecurity(d, propagation) {
  if (d.error) return `<div class="error-msg">${esc(d.error)}</div>`;

  let html = "";

  // SSL
  if (d.ssl) html += renderSection(_t("SSL / TLS","SSL / TLS"), "lock", renderSSL(d.ssl));

  // HTTP Headers
  if (d.http) html += renderSection(_t("HTTP Başlıkları","HTTP Headers"), "code", renderHTTP(d.http));

  // Header score
  const hs = d.headersScore;
  if (hs) {
    html += `<div class="section"><div class="section-header" style="cursor:default">
      <div class="section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> ${_t("Diğer","Other")}</div>
    </div><div class="section-body" style="display:block !important">`;
    for (const h of hs.details) {
      html += `<div class="dns-row"><span class="dns-type" style="min-width:100px;font-size:0.65rem">${esc(h.header)}</span><div class="dns-values">${h.present ? `<span style="color:var(--green)">✓</span> <span style="font-size:0.72rem">${esc(h.value)}</span>` : `<span style="color:var(--text-muted)">✗ ${_t("Eksik","Missing")}</span>`}</div></div>`;
    }
    html += `</div></div>`;
  }

  if (propagation && propagation.length > 0) {
    html += renderSection("DNS Propagation", "radio", renderPropagation(propagation));
  }

  // crt.sh certificate history (from lastResult)
  if (lastResult && lastResult.certHistory && lastResult.certHistory.certs && lastResult.certHistory.certs.length > 0) {
    html += renderSection(_t("Sertifika Geçmişi","Certificate History") + " (crt.sh)", "lock", renderCrtSh(lastResult.certHistory));
  }

  // typosquatting (from lastResult)
  if (lastResult && lastResult.typosquat && lastResult.typosquat.variations && lastResult.typosquat.variations.length > 0) {
    html += renderSection(_t("Domain Benzerliği","Domain Variations") + " ⚠️", "search", renderTyposquat(lastResult.typosquat));
  }

  return html || `<div style="color:var(--text-muted)">${_t("Veri alınamadı","Could not get data")}</div>`;
}

function renderWHOISFull(d) {
  if (d.error) return `<div class="error-msg">${esc(d.error)}</div>`;
  let html = "";
  if (d.parsed && Object.keys(d.parsed).length > 0) {
    html += '<table class="detail-table"><tbody>';
    const keys = Object.keys(d.parsed).slice(0, 30);
    for (const k of keys) {
      const v = Array.isArray(d.parsed[k]) ? d.parsed[k].join(", ") : d.parsed[k];
      if (v && v.length < 250) html += `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`;
    }
    html += "</tbody></table>";
  }
  if (d.raw) html += `<div class="whois-raw"><details><summary>${_t("Ham WHOIS çıktısı","Raw WHOIS output")}</summary><pre>${esc(d.raw)}</pre></details></div>`;
  return html || `<div style="color:var(--text-muted)">${_t("WHOIS verisi alınamadı","Could not get WHOIS data")}</div>`;
}

function renderCrtSh(data) {
  if (!data.certs || data.certs.length === 0) return '<div style="color:var(--text-muted)">' + _t("Veri bulunamadı","No data found") + '</div>';
  let h = '<div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:6px">' + _t("Son 20 sertifika","Last 20 certificates") + '</div>';
  h += '<div style="position:relative;padding-left:16px">';
  h += '<div style="position:absolute;left:4px;top:6px;bottom:6px;width:2px;background:var(--border)"></div>';
  for (const c of data.certs) {
    const color = c.valid ? 'var(--green)' : 'var(--red)';
    const status = c.valid ? _t("Geçerli","Valid") : _t("Dolmuş","Expired");
    const dateStr = (c.notBefore || '').substring(0, 10);
    h += '<div style="position:relative;padding:4px 0 4px 12px;margin-bottom:2px">';
    h += '<div style="position:absolute;left:-12px;top:8px;width:8px;height:8px;border-radius:50%;background:' + color + '"></div>';
    h += '<div style="font-size:0.78rem;font-weight:600;color:var(--text)">' + esc(c.issuer) + '</div>';
    h += '<div style="font-size:0.65rem;color:var(--text-muted)">' + dateStr + ' · <span style="color:' + color + '">' + status + '</span>';
    const san = (c.san || []).slice(0, 3).join(', ');
    if (san) h += ' · ' + esc(san);
    h += '</div></div>';
  }
  h += '</div>';
  return h;
}

function renderTyposquat(data) {
  if (!data.variations || data.variations.length === 0) return '';
  let h = '<div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:6px">' + data.variations.length + ' ' + _t("şüpheli domain bulundu","suspicious domains found") + '</div>';
  h += '<div class="dns-grid">';
  for (const v of data.variations) {
    const riskIcon = v.category === 'homoglyph' ? '🔴' : v.category === 'tld' ? '🟡' : '🟡';
    h += '<div class="dns-row" style="cursor:pointer" data-domain="' + attrEsc(v.domain) + '" title="' + _t("Analiz için tıkla","Click to analyze") + '">';
    h += '<span class="dns-type" style="min-width:50px;font-size:0.65rem">' + esc(v.category) + '</span>';
    h += '<div class="dns-values"><span style="font-weight:600">' + riskIcon + ' ' + esc(v.domain) + '</span>';
    if (v.ip) h += ' <span style="font-size:0.65rem;color:var(--text-muted);font-family:\'JetBrains Mono\',monospace">→ ' + esc(v.ip) + '</span>';
    h += '</div></div>';
  }
  h += '</div>';
  return h;
}


// ── Email Header Analysis ──
function analyzeEmailHeaders() {
  const input = document.getElementById("email-headers-input");
  const resultsEl = document.getElementById("results-email-header");
  if (!input || !resultsEl) return;

  const raw = input.value.trim();
  if (!raw) { showToast(_t("Email header yapıştırın","Paste email headers"), true); return; }

  const btn = document.querySelector("#panel-email-header .btn-analyze");
  if (btn) btn.disabled = true;

  resultsEl.innerHTML = '<div style="text-align:center;padding:30px"><div class="spinner"></div><div style="color:var(--text-muted);margin-top:8px">' + _t("Analiz ediliyor...","Analyzing...") + '</div></div>';

  fetch("/api/email-analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ headers: raw }),
  })
    .then(r => {
      if (!r.ok) return r.json().then(j => { throw new Error(j.error || _t("Header analizi başarısız","Header analysis failed")); });
      return r.json();
    })
    .then(data => {
      resultsEl.innerHTML = renderEmailHeaderPage(data);
      resultsEl.scrollIntoView({ behavior: "smooth", block: "start" });
      if (btn) btn.disabled = false;
    })
    .catch(err => {
      resultsEl.innerHTML = `<div class="error-msg">${esc(err.message)}</div>`;
      if (btn) btn.disabled = false;
    });
}

function loadExampleHeader(type) {
  const samples = {
    legit: `Return-Path: <newsletter@mail.paypal.com>
Received: from mx.example.com (198.51.100.1) by pop.example.com (8.15.2/8.15.2) with ESMTPS id A1B2C3D4E5F6 for <user@example.com>; Tue, 02 Jul 2026 14:32:18 +0300 (EEST)
Received: from mail.paypal.com (192.0.2.10) by mx.example.com (8.15.2/8.15.2) with ESMTPS id A1B2C3D4E5F6 for <user@example.com>; Tue, 02 Jul 2026 14:32:15 +0300 (EEST)
Received: from mail.paypal.com (192.0.2.10) by mail.paypal.com (8.15.2/8.15.2) with ESMTPS id A1B2C3D4E5F6; Tue, 02 Jul 2026 14:32:10 +0300 (EEST)
DKIM-Signature: v=1; a=rsa-sha256; d=paypal.com; s=pp-dkim-1; c=relaxed/simple; q=dns/txt; i=@paypal.com; t=1719915130; bh=abc123def456;
Authentication-Results: mx.example.com; spf=pass smtp.mailfrom=paypal.com; dkim=pass header.i=@paypal.com; dmarc=pass header.from=paypal.com
Received-SPF: pass (paypal.com: 192.0.2.10 is authorized)
From: "PayPal" <service@paypal.com>
To: "John Doe" <user@example.com>
Subject: Your payment of $49.99 has been sent
Date: Tue, 02 Jul 2026 14:32:10 +0300
Message-ID: <20260702143210.A1B2C3D4E5F6@paypal.com>
MIME-Version: 1.0
Content-Type: text/plain; charset="UTF-8"`,
    spam: `Return-Path: <bounce@mail.phishy-site.com>
Received: from mail.phishy-site.com (203.0.113.99) by mx.example.com (8.15.2/8.15.2) with ESMTPS id X9Y8Z7W6V5U4; Tue, 02 Jul 2026 09:15:42 +0300 (EEST)
Received: from localhost (203.0.113.99) by mail.phishy-site.com (8.15.2/8.15.2) with ESMTP id X9Y8Z7W6V5U4; Tue, 02 Jul 2026 09:15:40 +0300 (EEST)
DKIM-Signature: v=1; a=rsa-sha256; d=phishy-site.com; s=dkim-2026; c=relaxed/simple; q=dns/txt; i=@phishy-site.com; t=1719908140;
Authentication-Results: mx.example.com; spf=fail smtp.mailfrom=phishy-site.com; dkim=fail header.i=@phishy-site.com; dmarc=fail header.from=phishy-site.com
Received-SPF: fail (phishy-site.com: 203.0.113.99 is not authorized)
From: "PayPal Security" <security@paypa1.com>
Reply-To: "Phish" <verify@phishy-site.com>
To: "Victim" <user@example.com>
Subject: Your account has been limited - Verify now
Date: Tue, 02 Jul 2026 09:15:40 +0300
X-Priority: 1 (High)
X-Mailer: PHP/7.4.33
Message-ID: <20260702091540.99999@mail.phishy-site.com>
X-Originating-IP: [203.0.113.99]`,
  };
  const el = document.getElementById("email-headers-input");
  if (el) {
    el.value = samples[type] || samples.legit;
    analyzeEmailHeaders();
  }
}

function renderEmailHeaderPage(data) {
  if (data.error) return `<div class="error-msg">${esc(data.error)}</div>`;
  lastEmailResult = data;

  let html = '<div style="padding:16px;display:flex;flex-direction:column;gap:12px">';
  html += `<div style="display:flex;justify-content:flex-end;margin-bottom:4px">
    <button class="btn-analyze" data-action="share-email" style="padding:6px 14px;font-size:0.78rem;flex-shrink:0">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
      ${_t("Paylaş","Share")}
    </button>
  </div>`;

  // Card 1: Meta
  html += renderMetaCard(data.meta);

  // Card 2: Authentication (SPF/DKIM/DMARC + DNS + Alignment)
  if (data.auth) html += renderAuthCard(data.auth);

  // Card 3: ARC
  if (data.arc?.chains?.length > 0) html += renderARCCard(data.arc);

  // Card 4: Alerts (önce alert'leri göster, varsa)
  if (data.alerts?.length > 0) html += renderAlertsCard(data.alerts);

  // Card 5: Received Timeline
  if (data.received?.length > 0) html += renderTimelineCard(data.received);

  // Card 6: IP Info
  if (data.ipInfo?.length > 0) html += renderIPCard(data.ipInfo);

  // Card 7: Extra Headers
  if (data.extraHeaders && Object.keys(data.extraHeaders).length > 0) html += renderExtraCard(data.extraHeaders);

  // Card 8: Raw
  if (data.raw) html += renderRawCard(data.raw);

  html += "</div>";
  return html;
}

function renderMetaCard(meta) {
  if (!meta || !Object.values(meta).some(v => v)) return "";
  const labels = { from: _t("Gönderen","From"), to: _t("Alıcı","To"), subject: _t("Konu","Subject"), date: _t("Tarih","Date"), messageId: "Message-ID", returnPath: "Return-Path", replyTo: "Reply-To" };
  const icons = { from: "✉️", to: "📥", subject: "🏷️", date: "📅", messageId: "🆔", returnPath: "🔄", replyTo: "↩️" };
  let rows = "";
  for (const [k, v] of Object.entries(meta)) {
    if (v) rows += `<div class="eh-meta-row"><span class="eh-meta-icon">${icons[k] || "•"}</span><span class="eh-meta-label">${labels[k] || k}</span><span class="eh-meta-value">${esc(v)}</span></div>`;
  }
  return `<div class="eh-card"><h4 class="eh-card-title"><svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"stroke-width="2"stroke-linecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> ${_t("Temel Bilgiler","Basic Info")}</h4><div class="eh-meta-grid">${rows}</div></div>`;
}

function renderAuthCard(auth) {
  if (!auth) return "";
  const rows = [];

  for (const method of ["spf", "dkim", "dmarc"]) {
    const m = auth[method];
    if (!m) continue;
    const status = m.status || "none";
    const isPass = status === "pass";
    const isFail = status === "fail";
    const badgeClass = isPass ? "eh-badge-pass" : isFail ? "eh-badge-fail" : "eh-badge-none";
    const badgeText = isPass ? "✓ PASS" : isFail ? "✗ FAIL" : status.toUpperCase();

    let detail = "";
    if (method === "spf" && m.record) detail = `<div class="eh-auth-detail">DNS: ${esc(m.record)}</div>`;
    if (method === "dkim" && m.selector) detail = `<div class="eh-auth-detail">Selector: ${esc(m.selector)}${m.record ? ` · ${esc(m.record.slice(0, 80))}...` : ""}</div>`;
    if (method === "dmarc" && m.record) detail = `<div class="eh-auth-detail">${esc(m.record)}</div>`;

    const aligned = m.aligned === true;
    const alignIcon = aligned ? "<span style=\"color:var(--green)\">✓</span>" : "<span style=\"color:var(--red)\">✗</span>";
    const alignText = aligned ? "Aligned" : "Not aligned";

    rows.push(`<div class="eh-auth-row">
      <div class="eh-auth-header">
        <span class="eh-auth-label">${method.toUpperCase()}</span>
        <span class="eh-badge ${badgeClass}">${badgeText}</span>
      </div>
      <div class="eh-auth-body">
        ${detail}
        <div class="eh-auth-align">Alignment: ${alignIcon} ${alignText}</div>
      </div>
    </div>`);
  }

  return `<div class="eh-card"><h4 class="eh-card-title"><svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"stroke-width="2"stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> ${_t("Authentication (DNS Doğrulamalı)","Authentication (DNS Verified)")}</h4><div class="eh-auth-grid">${rows}</div></div>`;
}

function renderARCCard(arc) {
  if (!arc?.chains?.length) return "";
  let chains = "";
  for (const c of arc.chains) {
    const statusClass = c.status === "pass" ? "eh-badge-pass" : c.status === "fail" ? "eh-badge-fail" : "eh-badge-none";
    chains += `<div class="eh-arc-hop"><span class="eh-arc-inst">#${c.inst || "?"}</span> <span class="eh-badge ${statusClass}">${c.status || "unknown"}</span></div>`;
  }
  return `<div class="eh-card"><h4 class="eh-card-title"><svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"stroke-width="2"stroke-linecap="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg> ARC (Authenticated Received Chain)</h4><div class="eh-arc-chain">${chains}</div></div>`;
}

function renderAlertsCard(alerts) {
  if (!alerts?.length) return "";
  const sevIcon = { high: "🔴", medium: "🟡", low: "🟢" };
  const items = alerts.map(a => `<div class="eh-alert eh-alert-${a.severity}">
    <div class="eh-alert-head"><span>${sevIcon[a.severity] || "•"}</span> <strong>${esc(a.message)}</strong></div>
    ${a.detail ? `<div class="eh-alert-detail">${esc(a.detail)}</div>` : ""}
  </div>`).join("");
  return `<div class="eh-card"><h4 class="eh-card-title"><svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"stroke-width="2"stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Security Alerts</h4><div class="eh-alerts-list">${items}</div></div>`;
}

function renderTimelineCard(received) {
  if (!received?.length) return "";
  const hops = received.slice().reverse();
  const icons = ["✉", "☁", "⛅", "⚙", "🖥", "🔁"];
  const cards = hops.map((h, i) => {
    const icon = icons[i % icons.length];
    const delayStr = h.delay != null ? formatDelay(h.delay) : "";
    const delayColor = !h.delay ? "var(--text-muted)" :
      h.delay > 5000 ? "var(--red)" :
      h.delay > 1000 ? "var(--yellow)" : "var(--text-muted)";
    const tlsColor = !h.tls ? "var(--red)" : /^1\.[01]$/.test(h.tls) ? "var(--yellow)" : "var(--green)";
    const tlsLabel = h.tls ? `TLS ${h.tls}` : "Plain";
    return `<div class="eh-hop-card">
      <div class="eh-hop-card-header"><span class="eh-hop-icon">${icon}</span> ${esc(h.by || h.from || "?")}</div>
      <div class="eh-hop-card-divider"></div>
      ${h.by && h.from ? `<div class="eh-hop-card-from">← ${esc(h.from)}</div>` : ""}
      <div class="eh-hop-card-details">
        ${delayStr ? `<span class="eh-hop-lag" style="color:${delayColor}">⏱ ${delayStr}</span>` : ""}
        <span style="color:${tlsColor}">🔒 ${tlsLabel}</span>
        ${h.ip ? `<span>📍 ${h.ip}</span>` : ""}
      </div>
      ${h.timestamp ? `<div class="eh-hop-card-time">🕐 ${esc(h.timestamp)}</div>` : ""}
    </div>`;
  }).join("\n<div class=\"eh-hop-down-arrow\">↓</div>\n");

  return `<div class="eh-card"><h4 class="eh-card-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${_t("E-posta Yolu","Email Route")} (${received.length} ${_t("atlama","hops")})</h4><div class="eh-timeline-pipeline">${cards}</div></div>`;
}

function formatDelay(ms) {
  if (ms < 0) return "";
  if (ms < 1000) return `+${Math.round(ms)}ms`;
  if (ms < 60000) return `+${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60000);
  const s = Math.round((ms % 60000) / 1000);
  return `+${m}m${s}s`;
}

function renderIPCard(ipInfo) {
  if (!ipInfo?.length) return "";
  const rows = ipInfo.map(info => {
    const ptrs = info.ptr?.length > 0 ? esc(info.ptr.join(", ")) : '<span style="color:var(--text-muted)">' + _t("PTR yok","No PTR") + '</span>';
    const asn = info.asn ? `<span class="eh-ip-asn">AS${info.asn}</span>` : "";
    const country = info.country ? `<span class="eh-ip-flag">${esc(info.country)}</span>` : "";
    const org = info.org ? `<span class="eh-ip-org">${esc(info.org)}</span>` : "";
    return `<div class="eh-ip-row">
      <div class="eh-ip-addr">${esc(info.ip)}</div>
      <div class="eh-ip-detail">${asn} ${country} ${org}</div>
      <div class="eh-ip-ptr">PTR: ${ptrs}</div>
    </div>`;
  }).join("");
  return `<div class="eh-card"><h4 class="eh-card-title"><svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"stroke-width="2"stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><circle cx="12" cy="12" r="3"/></svg> ${_t("IP Bilgileri","IP Information")}</h4><div class="eh-ip-grid">${rows}</div></div>`;
}

function renderExtraCard(extra) {
  const knownLabels = { mailer: "X-Mailer", originatingIP: "X-Originating-IP", spamStatus: "X-Spam-Status", priority: "X-Priority", receivedSPF: "Received-SPF", dkimSignature: "DKIM-Signature" };
  const items = Object.entries(extra).filter(([k]) => !["receivedSPF", "dkimSignature"].includes(k)).map(([k, v]) => {
    const label = knownLabels[k] || `X-${k.charAt(0).toUpperCase() + k.slice(1)}`;
    return `<div class="eh-extra-row"><span class="eh-extra-label">${label}</span><span class="eh-extra-value">${esc(String(v).slice(0, 200))}</span></div>`;
  }).join("");
  if (!items) return "";
  return `<div class="eh-card"><h4 class="eh-card-title"><svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"stroke-width="2"stroke-linecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg> ${_t("Ek Başlıklar","Extra Headers")}</h4><div class="eh-extra-grid">${items}</div></div>`;
}

function renderRawCard(raw) {
  const highlighted = esc(raw).split(/\n/).map(line => {
    let cls = "";
    if (/^(Received|Return-Path|Received-SPF):/i.test(line)) cls = "eh-raw-received";
    else if (/^(Authentication-Results|DKIM-Signature):/i.test(line)) cls = "eh-raw-auth";
    else if (/^(From|To|Subject|Date|Message-ID|Reply-To):/i.test(line)) cls = "eh-raw-meta";
    else if (/^(X-|ARC-)/.test(line)) cls = "eh-raw-extra";
    return `<span class="${cls}">${line}</span>`;
  }).join("\n");
  return `<div class="eh-card"><h4 class="eh-card-title"><svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"stroke-width="2"stroke-linecap="round"><code>{"{}"}</code></svg> ${_t("Ham Header","Raw Headers")}</h4><div class="eh-raw"><pre>${highlighted}</pre></div></div>`;
}

// ── Export ──
async function exportFormat(fmt) {
  if (!lastResult) { showToast(_t("Önce analiz yapın","Run analysis first"), true); return; }
  const d = lastResult;
  if (fmt === "csv") {
    const rows = [["Alan", "Değer"]];
    if (d.domain) rows.push(["Domain", d.domain]);
    if (d.ips) rows.push(["IP", d.ips.join(", ")]);
    if (d.healthScore !== undefined) {
      const hs = typeof d.healthScore === "object" ? d.healthScore.score : d.healthScore;
      rows.push(["Sağlık Puanı", hs + "/100"]);
    }
    if (d.took) rows.push(["Süre", d.took + "ms"]);
    if (d.dns) {
      for (const t of ["a","aaaa","mx","ns","txt","soa","cname","caa","srv"]) {
        const r = d.dns[t];
        if (r && r.status === "ok" && r.records) {
          const vals = r.records.map(v => {
            if (v.exchange) return `${v.priority} ${v.exchange}`;
            if (v.value) return v.value;
            if (typeof v === "string") return v;
            if (Array.isArray(v)) return v.join(" ");
            return JSON.stringify(v);
          }).join("; ");
          rows.push([`DNS ${t.toUpperCase()}`, vals]);
        }
      }
    }
    if (d.ssl && !d.ssl.error) rows.push(["SSL Kalan Gün", d.ssl.daysRemaining]);
    if (d.email) {
      if (d.email.spf) rows.push(["SPF", d.email.spf]);
      if (d.email.dkim) rows.push(["DKIM", d.email.dkim.value]);
      if (d.email.dmarc) rows.push(["DMARC", d.email.dmarc]);
    }
    if (d.whois?.parsed) {
      const keys = ["domain_name","registrar","creation_date","expiration_date","name","organization","country"];
      for (const k of keys) {
        if (d.whois.parsed[k]) rows.push([k, Array.isArray(d.whois.parsed[k]) ? d.whois.parsed[k].join(", ") : d.whois.parsed[k]]);
      }
    }
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    downloadFile(csv, `${d.domain}-dns-lens.csv`, "text/csv");
  } else if (fmt === "json") {
    const out = JSON.stringify(d, null, 2);
    downloadFile(out, `${d.domain}-dns-lens.json`, "application/json");
  } else if (fmt === "md") {
    let md = `# dnsfyi — ${d.domain}\n\n`;
    md += `**Score:** ${d.healthScore?.score || "—"}/100 · **Time:** ${d.took}ms\n\n`;
    if (d.ips) md += `**IP:** ${d.ips.join(", ")}\n\n`;
    if (d.dns) {
      md += "## DNS Records\n\n";
      for (const t of ["a","aaaa","mx","ns","txt","soa","cname","caa","srv"]) {
        const r = d.dns[t];
        if (r && r.status === "ok" && r.records) {
          md += `### ${t.toUpperCase()}\n`;
          for (const v of r.records) {
            if (v.exchange) md += `- Priority ${v.priority}: \`${v.exchange}\`\n`;
            else if (v.value) md += `- \`${v.value}\`\n`;
            else if (typeof v === "string") md += `- \`${v}\`\n`;
            else if (Array.isArray(v)) md += `- ${v.map(x => "`" + x + "`").join(" ")}\n`;
          }
          md += "\n";
        }
      }
    }
    if (d.email) {
      md += "## Email Security\n\n";
      if (d.email.spf) md += `- **SPF:** ${d.email.spf}\n`;
      if (d.email.dkim) md += `- **DKIM:** ${typeof d.email.dkim === "object" ? d.email.dkim.value : d.email.dkim}\n`;
      if (d.email.dmarc) md += `- **DMARC:** ${d.email.dmarc}\n`;
    }
    if (d.whois?.parsed) {
      md += "\n## WHOIS\n\n";
      for (const [k, v] of Object.entries(d.whois.parsed).slice(0, 10)) {
        if (v) md += `- **${k}:** ${Array.isArray(v) ? v.join(", ") : v}\n`;
      }
    }
    downloadFile(md, `${d.domain}-dns-lens.md`, "text/markdown");
  } else if (fmt === "pdf") {
    const el = document.getElementById("results");
    if (!el) return;
    if (typeof html2canvas === "undefined" || typeof jspdf === "undefined") { showToast("PDF libraries loading...", true); return; }
    const canvas = await html2canvas(el, { backgroundColor: "#fff", scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfW = 210, pdfH = (canvas.height * 210) / canvas.width;
    let heightLeft = pdfH, pos = 0;
    if (heightLeft > 297) {
      const pageH = 297, ratio = 210 / canvas.width;
      const pageCanvasH = pageH / ratio;
      while (heightLeft > 0) {
        const srcY = pos * (canvas.height / (heightLeft + pos));
        const srcH = Math.min(pageCanvasH, canvas.height - pos);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width; pageCanvas.height = srcH;
        const ctx = pageCanvas.getContext("2d");
        ctx.drawImage(canvas, 0, pos, canvas.width, srcH, 0, 0, canvas.width, srcH);
        const pageData = pageCanvas.toDataURL("image/png");
        if (pos > 0) pdf.addPage();
        pdf.addImage(pageData, "PNG", 0, 0, pdfW, srcH * ratio);
        heightLeft -= pageCanvasH;
        pos += pageCanvasH;
      }
    } else {
      pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
    }
    pdf.save(`${d.domain}-dnsfyi.pdf`);
  }
}

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  showToast(`${filename} ${_t("indiriliyor","downloading")}`);
}

// ── Paylaş ──
function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); showToast(_t("Paylaşım linki kopyalandı!","Share link copied!")); }
  catch { showToast(_t("Linki manuel kopyalayın","Copy link manually") + ":\n" + text); }
  document.body.removeChild(ta);
}

function shareEmailResult() {
  if (!lastEmailResult) { showToast(_t("Önce header analizi yapın","Analyze headers first"), true); return; }
  const d = lastEmailResult;
  const share = {
    t: "email", f: d.meta?.from?.substring(0, 60) || "",
    s: d.auth?.spf?.status || "", dk: d.auth?.dkim?.status || "",
    dm: d.auth?.dmarc?.status || "", al: d.alerts?.length || 0,
  };
  try {
    const json = JSON.stringify(share);
    const base64 = btoa(unescape(encodeURIComponent(json)));
    const safe = encodeURIComponent(base64);
    const url = window.location.origin + window.location.pathname + "#share/email/" + safe;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => showToast("Paylaşım linki kopyalandı!"))
        .catch(() => fallbackCopy(url));
    } else { fallbackCopy(url); }
  } catch (e) { showToast(_t("Paylaşma başarısız","Share failed") + ": " + e.message, true); }
}

function loadSharedEmailResult() {
  const hash = window.location.hash;
  if (!hash || !hash.startsWith("#share/email/")) return;

  // Ensure we're on the hizli tab
  switchTab("hizli", true);

  const raw = hash.replace("#share/email/", "");
  let encoded = raw;
  try { encoded = decodeURIComponent(raw); } catch {}

  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    const data = JSON.parse(json);
    if (data.t !== "email") return;
    const el = document.getElementById("results");
    if (!el) return;
    document.getElementById("features").style.display = "none";
    document.getElementById("hero").classList.add("collapsed");

    const spfOk = data.s === "pass"; const dkimOk = data.dk === "pass"; const dmarcOk = data.dm === "pass";
    const alerts = data.al > 0 ? `<div style="color:var(--red);font-size:0.78rem;margin-top:6px">⚠ ${data.al} uyarı</div>` : "";
    el.innerHTML = `<div class="health-section" style="padding:16px">
      <div class="health-header">
        <div>
          <div class="health-domain">${esc(data.f)}</div>
          <div class="health-stats" style="gap:6px;margin-top:6px">
            <span class="health-stat" style="color:${spfOk ? 'var(--green)' : 'var(--red)'};background:${spfOk ? 'var(--green-bg)' : 'var(--red-bg)'}">SPF: ${data.s.toUpperCase()}</span>
            <span class="health-stat" style="color:${dkimOk ? 'var(--green)' : 'var(--red)'};background:${dkimOk ? 'var(--green-bg)' : 'var(--red-bg)'}">DKIM: ${data.dk.toUpperCase()}</span>
            <span class="health-stat" style="color:${dmarcOk ? 'var(--green)' : 'var(--red)'};background:${dmarcOk ? 'var(--green-bg)' : 'var(--red-bg)'}">DMARC: ${data.dm.toUpperCase()}</span>
            ${alerts}
          </div>
        </div>
      </div>
    </div>
    <div style="text-align:center;padding:30px;color:var(--text-muted);display:flex;flex-direction:column;align-items:center;gap:10px">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
      <span style="font-size:0.85rem">Paylaşılan email header analizi</span>
      <button class="new-search-btn" data-action="new-search" style="font-size:.82rem;padding:8px 20px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        Yeni Sorgu
      </button>
    </div>`;
  } catch (e) { console.error("Share load error:", e); }
}
async function fetchVisitorIP() {
  try {
    const res = await fetch("/api/myip");
    const data = await res.json();
    const parts = [data.ip];
    if (data.city) parts.push(data.city);
    if (data.country) parts.push(data.country);
    document.getElementById("visitorIp").innerHTML = `<span class="ip-dot"></span> ${parts.join(" · ")}`;
    showLangSuggestion(data.country);
  } catch {
    document.getElementById("visitorIp").innerHTML = `<span class="ip-dot"></span> ${document.documentElement.lang === "en" ? "Unavailable" : _t("Bağlanılamadı","Unavailable")}`;
  }
}

function showLangSuggestion(country) {
  if (!country) return;
  const existing = document.getElementById("lang-suggestion");
  if (existing) existing.remove();
  
  const isTR = document.documentElement.lang === "tr";
  const isTurkey = country === "Turkey" || country === "Türkiye";
  
  // Show suggestion: IP is Turkish but page is English, or IP is foreign but page is Turkish
  if ((isTurkey && !isTR) || (!isTurkey && isTR)) {
    const pill = document.createElement("div");
    pill.id = "lang-suggestion";
    pill.className = "lang-suggestion";
    
    if (isTurkey && !isTR) {
      pill.innerHTML = `<span>🇹🇷</span><span>${_t("Türkçe'ye Geç","Switch to Turkish")}</span><span class="lang-suggestion-close">&times;</span>`;
      pill.addEventListener("click", (e) => {
        if (e.target.classList.contains("lang-suggestion-close")) { pill.remove(); return; }
        document.cookie = "lang=tr;path=/;max-age=31536000";
        location.href = "/tr/";
      });
    } else {
      pill.innerHTML = `<span>🇬🇧</span><span>${_t("İngilizce'ye Geç","Switch to English")}</span><span class="lang-suggestion-close">&times;</span>`;
      pill.addEventListener("click", (e) => {
        if (e.target.classList.contains("lang-suggestion-close")) { pill.remove(); return; }
        document.cookie = "lang=en;path=/;max-age=31536000";
        location.href = "/";
      });
    }
    
    document.body.appendChild(pill);
    setTimeout(() => { if (pill.parentNode) pill.style.opacity = "0"; setTimeout(() => pill.remove(), 500); }, 8000);
  }
}

function updateRateLimit(remaining) {
  const el = document.getElementById("rate-limit");
  if (!el) return;
  if (remaining === undefined || remaining === null) { el.style.visibility = "hidden"; return; }
  el.style.visibility = "visible";
  el.textContent = "⏳ " + remaining + "/20";
  if (remaining < 3) el.style.color = "var(--red)";
  else if (remaining < 8) el.style.color = "var(--yellow)";
  else el.style.color = "var(--text-muted)";
}

// ── Language Toggle ──
function toggleLang() {
  const currentLang = document.documentElement.lang;
  const targetLang = currentLang === "tr" ? "en" : "tr";
  document.cookie = "lang=" + targetLang + ";path=/;max-age=31536000;SameSite=Lax";
  window.location.href = targetLang === "tr" ? "/tr/" : "/";
}

function applyTheme() {
  const saved = localStorage.getItem("theme");
  let theme = saved || "light";
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  const sun = document.querySelector(".icon-sun");
  const moon = document.querySelector(".icon-moon");
  const btn = document.getElementById("themeBtn");
  if (theme === "light") {
    if (sun) sun.style.display = "none";
    if (moon) moon.style.display = "block";
    if (btn) btn.title = _t("Koyu Tema","Dark Theme");
  } else {
    if (sun) sun.style.display = "block";
    if (moon) moon.style.display = "none";
    if (btn) btn.title = _t("Açık Tema","Light Theme");
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  localStorage.setItem("theme", next);
  applyTheme();
}

// ── Init ──
document.addEventListener("DOMContentLoaded", () => {
  fetchVisitorIP();
  handleRoute();
  loadSharedEmailResult();

  // URL auto-analyze from ?domain= or /domain.com
  const params = new URLSearchParams(window.location.search);
  let urlDomain = params.get("domain");
  if (!urlDomain) {
    const path = location.pathname.replace(/^\//, "");
    const tabValues = Object.values(TAB_PATHS);
    if (path && !tabValues.includes(path) && path.includes(".")) {
      urlDomain = path;
    }
  }
  if (urlDomain) {
    document.getElementById("domain-input").value = urlDomain;
    setTimeout(() => analyze(), 500);
  }
  document.getElementById("domain-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      if (activeTab === "hizli") analyze();
      else if (activeTab === "email-header" || activeTab === "email-header-v2") analyzeEmailHeadersV2();
      else analyzeModule(activeTab);
    }
  });
  document.getElementById("port-port-input").addEventListener("keydown", (e) => { if (e.key === "Enter") document.getElementById("port-scan-btn-custom").click(); });
});

// Scroll to top button
window.addEventListener("scroll", () => {
  const btn = document.getElementById("scrollTopBtn");
  if (btn) btn.classList.toggle("visible", window.scrollY > 400);
});
document.addEventListener("click", (e) => {
  const target = e.target.closest("#scrollTopBtn");
  if (target) window.scrollTo({ top: 0, behavior: "smooth" });
});

// ── Email Header Analysis v2 ──
let lastEmailResultV2 = null;

async function analyzeEmailHeadersV2() {
  const input = document.getElementById("email-headers-input-v2");
  const resultsEl = document.getElementById("results-email-header-v2");
  if (!input || !resultsEl) return;

  const raw = input.value.trim();
  if (!raw) { showToast(_t("Email header yapıştırın","Paste email headers"), true); return; }

  const btn = document.querySelector("#panel-email-header-v2 .btn-analyze");
  if (btn) btn.disabled = true;

  resultsEl.innerHTML = '<div style="text-align:center;padding:30px"><div class="spinner"></div><div style="color:var(--text-muted);margin-top:8px">' + _t("Analiz ediliyor...","Analyzing...") + '</div></div>';

  fetch("/api/email-analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ headers: raw }),
  })
    .then(r => {
      if (!r.ok) return r.json().then(j => { throw new Error(j.error || _t("Header analizi başarısız","Header analysis failed")); });
      return r.json();
    })
    .then(data => {
      resultsEl.innerHTML = renderEmailHeaderV2(data);
      resultsEl.scrollIntoView({ behavior: "smooth", block: "start" });
      if (btn) btn.disabled = false;
    })
    .catch(err => {
      resultsEl.innerHTML = `<div class="error-msg">${esc(err.message)}</div>`;
      if (btn) btn.disabled = false;
    });
}

function loadExampleHeaderV2(type) {
  const samples = {
    legit: `Return-Path: <newsletter@mail.paypal.com>
Received: from mx.example.com (198.51.100.1) by pop.example.com (8.15.2/8.15.2) with ESMTPS id A1B2C3D4E5F6 for <user@example.com>; Tue, 02 Jul 2026 14:32:18 +0300 (EEST)
Received: from mail.paypal.com (192.0.2.10) by mx.example.com (8.15.2/8.15.2) with ESMTPS id A1B2C3D4E5F6 for <user@example.com>; Tue, 02 Jul 2026 14:32:15 +0300 (EEST)
Received: from mail.paypal.com (192.0.2.10) by mail.paypal.com (8.15.2/8.15.2) with ESMTPS id A1B2C3D4E5F6; Tue, 02 Jul 2026 14:32:10 +0300 (EEST)
DKIM-Signature: v=1; a=rsa-sha256; d=paypal.com; s=pp-dkim-1; c=relaxed/simple; q=dns/txt; i=@paypal.com; t=1719915130; bh=abc123def456;
Authentication-Results: mx.example.com; spf=pass smtp.mailfrom=paypal.com; dkim=pass header.i=@paypal.com; dmarc=pass header.from=paypal.com
Received-SPF: pass (paypal.com: 192.0.2.10 is authorized)
From: "PayPal" <service@paypal.com>
To: "John Doe" <user@example.com>
Subject: Your payment of $49.99 has been sent
Date: Tue, 02 Jul 2026 14:32:10 +0300
Message-ID: <20260702143210.A1B2C3D4E5F6@paypal.com>
MIME-Version: 1.0
Content-Type: text/plain; charset="UTF-8"`,
    spam: `Return-Path: <bounce@mail.phishy-site.com>
Received: from mail.phishy-site.com (203.0.113.99) by mx.example.com (8.15.2/8.15.2) with ESMTPS id X9Y8Z7W6V5U4; Tue, 02 Jul 2026 09:15:42 +0300 (EEST)
Received: from localhost (203.0.113.99) by mail.phishy-site.com (8.15.2/8.15.2) with ESMTP id X9Y8Z7W6V5U4; Tue, 02 Jul 2026 09:15:40 +0300 (EEST)
DKIM-Signature: v=1; a=rsa-sha256; d=phishy-site.com; s=dkim-2026; c=relaxed/simple; q=dns/txt; i=@phishy-site.com; t=1719908140;
Authentication-Results: mx.example.com; spf=fail smtp.mailfrom=phishy-site.com; dkim=fail header.i=@phishy-site.com; dmarc=fail header.from=phishy-site.com
Received-SPF: fail (phishy-site.com: 203.0.113.99 is not authorized)
From: "PayPal Security" <security@paypa1.com>
Reply-To: "Phish" <verify@phishy-site.com>
To: "Victim" <user@example.com>
Subject: Your account has been limited - Verify now
Date: Tue, 02 Jul 2026 09:15:40 +0300
X-Priority: 1 (High)
X-Mailer: PHP/7.4.33
    Message-ID: <20260702091540.99999@mail.phishy-site.com>
X-Originating-IP: [203.0.113.99]
X-Spam-Score: 7.8
X-Spam-Status: Yes, score=7.8 required=5.0 tests=DKIM_SIGNED,HTML_MESSAGE,SPF_FAIL
Content-Type: multipart/mixed; boundary="----=_Part_12345"
Content-Disposition: attachment; filename="verify_account.exe"`,
  };
  const el = document.getElementById("email-headers-input-v2");
  if (el) {
    el.value = samples[type] || samples.legit;
    analyzeEmailHeadersV2();
  }
}

function renderEmailHeaderV2(data) {
  if (data.error) return `<div class="error-msg">${esc(data.error)}</div>`;
  lastEmailResultV2 = data;

  const score = calcEmailSecurityScore(data);
  const safetyLevel = score >= 80 ? "safe" : score >= 50 ? "caution" : "danger";

  let html = '<div style="padding:16px;display:flex;flex-direction:column;gap:16px">';

  // 1. Meta (Temel Bilgiler) - en üstte
  html += renderMetaCardV2(data.meta, data.emailClient, data.priority, data.importance);

  // 2. Calendar Invite rozeti
  if (data.isCalendarInvite) html += renderCalendarBadgeV2(data.calendarMethod);

  // 3. Newsletter rozeti
  if (data.listUnsubscribe) html += renderNewsletterBadgeV2();

  // 4. Security Score Ring
  html += renderSecurityScoreV2(score, safetyLevel, data);

  // 5. Safety Summary Banner
  html += renderSafetySummaryV2(data, safetyLevel, score);

  // 6. Spam Score
  if (data.spamScore !== null || data.spamStatus) html += renderSpamScoreV2(data.spamScore, data.spamStatus);

  // 7. Auth Cards (SPF/DKIM/DMARC) - enlarged
  if (data.auth) html += renderAuthV2(data.auth);

  // 8. Alerts
  if (data.alerts?.length > 0) html += renderAlertsV2(data.alerts);

  // 9. Attachments
  if (data.attachments?.length > 0 || data.contentType?.includes("multipart")) html += renderAttachmentsV2(data.attachments, data.contentType);

  // 10. Timeline (vertical)
  if (data.received?.length > 0) html += renderTimelineV2(data.received, data.ipInfo, data.ipReputation);

  // 11. ARC
  if (data.arc?.chains?.length > 0) html += renderARCCard(data.arc);

  // 12. IP Info
  if (data.ipInfo?.length > 0) html += renderIPCardV2(data.ipInfo);

  // 13. Extra Headers
  if (data.extraHeaders && Object.keys(data.extraHeaders).length > 0) html += renderExtraCard(data.extraHeaders);

  // 14. Raw
  if (data.raw) html += renderRawCard(data.raw);

  // 15. Share
  html += `<div style="display:flex;justify-content:flex-end;margin-top:8px">
    <button class="btn-analyze" data-action="share-email-v2" style="padding:6px 14px;font-size:0.78rem;flex-shrink:0">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
      ${_t("Paylaş","Share")}
    </button>
  </div>`;

  html += "</div>";
  return html;
}

function calcEmailSecurityScore(data) {
  let score = 0;
  const auth = data.auth;
  if (auth?.spf?.status === "pass") score += 25;
  if (auth?.dkim?.status === "pass") score += 25;
  if (auth?.dmarc?.status === "pass") score += 20;
  if (auth?.dmarc?.policy === "reject") score += 10;
  else if (auth?.dmarc?.policy === "quarantine") score += 5;

  const highAlerts = (data.alerts || []).filter(a => a.severity === "high").length;
  const medAlerts = (data.alerts || []).filter(a => a.severity === "medium").length;
  if (highAlerts === 0 && medAlerts === 0) score += 20;
  else if (highAlerts === 0) score += 10;
  else score = Math.max(0, score - highAlerts * 15);

  return Math.min(100, Math.max(0, score));
}

function renderSecurityScoreV2(score, level, data) {
  const colors = { safe: "var(--green)", caution: "var(--yellow)", danger: "var(--red)" };
  const bgs = { safe: "var(--green-bg)", caution: "var(--yellow-bg)", danger: "var(--red-bg)" };
  const labels = { safe: _t("Güvenli","Safe"), caution: _t("Dikkatli","Caution"), danger: _t("Tehlikeli","Dangerous") };
  const color = colors[level];
  const bg = bgs[level];
  const label = labels[level];

  const circumference = 2 * Math.PI * 36;
  const dashoffset = circumference - (score / 100) * circumference;

  const auth = data.auth;
  const checks = [];
  checks.push({ name: "SPF", ok: auth?.spf?.status === "pass", status: auth?.spf?.status || "none" });
  checks.push({ name: "DKIM", ok: auth?.dkim?.status === "pass", status: auth?.dkim?.status || "none" });
  checks.push({ name: "DMARC", ok: auth?.dmarc?.status === "pass", status: auth?.dmarc?.status || "none" });
  const highAlerts = (data.alerts || []).filter(a => a.severity === "high").length;
  checks.push({ name: _t("Uyarı Yok","No Alerts"), ok: highAlerts === 0, status: highAlerts > 0 ? highAlerts + " " + _t("yüksek","high") : "0" });

  const passed = checks.filter(c => c.ok).length;

  let checksHtml = "";
  for (const c of checks) {
    checksHtml += `<div class="eh-v2-check ${c.ok ? 'eh-v2-check-ok' : 'eh-v2-check-fail'}">
      <span class="eh-v2-check-icon">${c.ok ? '✓' : '✗'}</span>
      <span class="eh-v2-check-name">${esc(c.name)}</span>
      <span class="eh-v2-check-status">${esc(c.status.toUpperCase())}</span>
    </div>`;
  }

  return `<div class="eh-v2-score-card">
    <div class="eh-v2-score-left">
      <div class="eh-v2-score-ring">
        <svg width="88" height="88" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r="36" fill="none" stroke="var(--border)" stroke-width="6"/>
          <circle cx="44" cy="44" r="36" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${dashoffset}" transform="rotate(-90 44 44)"/>
        </svg>
        <div class="eh-v2-score-value" style="color:${color}">${score}</div>
      </div>
      <div>
        <div style="font-size:1.1rem;font-weight:800;color:${color}">${label}</div>
        <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px">${passed}/${checks.length} ${_t("kontrol geçti","checks passed")}</div>
      </div>
    </div>
    <div class="eh-v2-checks-grid">${checksHtml}</div>
  </div>`;
}

function renderSafetySummaryV2(data, level, score) {
  const colors = { safe: "var(--green)", caution: "var(--yellow)", danger: "var(--red)" };
  const bgs = { safe: "var(--green-bg)", caution: "var(--yellow-bg)", danger: "var(--red-bg)" };
  const borderColors = { safe: "rgba(74,222,128,0.2)", caution: "rgba(251,191,36,0.2)", danger: "rgba(248,113,113,0.2)" };
  const icons = { safe: "🛡️", caution: "⚠️", danger: "🚨" };
  const titles = {
    safe: _t("Bu email güvenilir görünüyor","This email appears safe"),
    caution: _t("Bu email şüpheli — dikkatli olun","This email is suspicious — proceed with caution"),
    danger: _t("Bu email tehlikeli olabilir — açmayın","This email may be dangerous — do not open")
  };

  const reasons = [];
  const fromDomain = extractDomainFromEmail(data.meta?.from);
  if (fromDomain) reasons.push(_t("Gönderen","From") + ": " + esc(fromDomain));

  const hopCount = data.received?.length || 0;
  const allTls = data.received?.every(h => h.tls) || false;
  reasons.push(hopCount + " " + _t("hop","hops") + (allTls ? " · " + _t("Tüm TLS güvenli","All TLS secure") : " · ⚠ TLS eksik"));

  const highAlerts = (data.alerts || []).filter(a => a.severity === "high");
  if (highAlerts.length > 0) {
    reasons.push(highAlerts.length + " " + _t("yüksek risk uyarısı","high risk alerts"));
  }

  return `<div class="eh-v2-safety-banner" style="background:${bgs[level]};border-color:${borderColors[level]}">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span style="font-size:1.3rem">${icons[level]}</span>
      <span style="font-size:0.92rem;font-weight:700;color:${colors[level]}">${titles[level]}</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:3px;font-size:0.75rem;color:var(--text-secondary)">
      ${reasons.map(r => `<div style="display:flex;align-items:center;gap:6px"><span style="color:${colors[level]}">·</span> ${r}</div>`).join("")}
    </div>
  </div>`;
}

function extractDomainFromEmail(email) {
  if (!email) return null;
  const m = email.match(/@([A-Za-z0-9][A-Za-z0-9.-]+\.[A-Za-z]{2,})/);
  return m ? m[1].toLowerCase() : email;
}

function renderAuthV2(auth) {
  if (!auth) return "";
  let html = "";

  for (const method of ["spf", "dkim", "dmarc"]) {
    const m = auth[method];
    if (!m) continue;
    const status = m.status || "none";
    const isPass = status === "pass";
    const isFail = status === "fail";
    const color = isPass ? "var(--green)" : isFail ? "var(--red)" : "var(--text-muted)";
    const bg = isPass ? "var(--green-bg)" : isFail ? "var(--red-bg)" : "rgba(148,163,184,0.08)";
    const icon = isPass ? "✓" : isFail ? "✗" : "—";
    const badgeClass = isPass ? "eh-badge-pass" : isFail ? "eh-badge-fail" : "eh-badge-none";

    const descriptions = {
      spf: _t("SPF, gönderen IP'nin domain tarafından yetkilendirilip yetkilendirilmediğini kontrol eder.","SPF checks if the sending IP is authorized by the domain."),
      dkim: _t("DKIM, email'in şifreli imzasıyla bütünlüğünü doğrular.","DKIM verifies email integrity with a cryptographic signature."),
      dmarc: _t("DMARC, SPF ve DKIM sonuçlarını birleştirip politika belirler.","DMARC combines SPF and DKIM results and sets a policy."),
    };

    let detailRows = "";
    if (method === "spf" && m.record) detailRows += `<div class="eh-v2-detail-row"><span class="eh-v2-detail-label">DNS Record</span><span class="eh-v2-detail-value" style="font-family:'JetBrains Mono',monospace;font-size:0.7rem;word-break:break-all">${esc(m.record)}</span></div>`;
    if (method === "dkim" && m.selector) detailRows += `<div class="eh-v2-detail-row"><span class="eh-v2-detail-label">Selector</span><span class="eh-v2-detail-value" style="font-family:'JetBrains Mono',monospace">${esc(m.selector)}</span></div>`;
    if (method === "dkim" && m.record) detailRows += `<div class="eh-v2-detail-row"><span class="eh-v2-detail-label">Public Key</span><span class="eh-v2-detail-value" style="font-family:'JetBrains Mono',monospace;font-size:0.65rem;word-break:break-all">${esc(m.record.slice(0, 120))}${m.record.length > 120 ? '...' : ''}</span></div>`;
    if (method === "dmarc" && m.record) detailRows += `<div class="eh-v2-detail-row"><span class="eh-v2-detail-label">Record</span><span class="eh-v2-detail-value" style="font-family:'JetBrains Mono',monospace;font-size:0.7rem;word-break:break-all">${esc(m.record)}</span></div>`;
    if (method === "dmarc" && m.policy) detailRows += `<div class="eh-v2-detail-row"><span class="eh-v2-detail-label">Policy</span><span class="eh-v2-detail-value"><span class="eh-badge ${m.policy === 'reject' ? 'eh-badge-pass' : m.policy === 'quarantine' ? 'eh-badge-none' : 'eh-badge-fail'}">${esc(m.policy.toUpperCase())}</span></span></div>`;

    const aligned = m.aligned === true;
    detailRows += `<div class="eh-v2-detail-row"><span class="eh-v2-detail-label">Alignment</span><span class="eh-v2-detail-value" style="color:${aligned ? 'var(--green)' : 'var(--red)'}">${aligned ? '✓ ' + _t("Eşleşiyor","Aligned") : '✗ ' + _t("Eşleşmiyor","Not aligned")}</span></div>`;

    html += `<div class="eh-v2-auth-card" style="border-color:${isPass ? 'rgba(74,222,128,0.15)' : isFail ? 'rgba(248,113,113,0.15)' : 'var(--border)'}">
      <div class="eh-v2-auth-header">
        <div class="eh-v2-auth-icon" style="background:${bg};color:${color}">${icon}</div>
        <div>
          <div style="font-size:0.92rem;font-weight:700">${method.toUpperCase()}</div>
          <div style="font-size:0.68rem;color:var(--text-muted)">${descriptions[method]}</div>
        </div>
        <span class="eh-badge ${badgeClass}" style="margin-left:auto;font-size:0.7rem;padding:3px 12px">${isPass ? '✓ PASS' : isFail ? '✗ FAIL' : status.toUpperCase()}</span>
      </div>
      <div class="eh-v2-auth-details">${detailRows}</div>
    </div>`;
  }

  return html;
}

function renderAlertsV2(alerts) {
  if (!alerts?.length) return "";
  const sevColors = { high: "var(--red)", medium: "var(--yellow)", low: "var(--green)" };
  const sevBgs = { high: "var(--red-bg)", medium: "var(--yellow-bg)", low: "var(--green-bg)" };
  const sevIcons = { high: "🔴", medium: "🟡", low: "🟢" };

  let html = `<div class="eh-v2-alerts-section">
    <div style="font-size:0.85rem;font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:6px">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      ${_t("Güvenlik Uyarıları","Security Alerts")} (${alerts.length})
    </div>`;

  for (const a of alerts) {
    html += `<div class="eh-v2-alert" style="background:${sevBgs[a.severity]};border-left-color:${sevColors[a.severity]}">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">
        <span>${sevIcons[a.severity] || "•"}</span>
        <strong style="font-size:0.8rem;color:${sevColors[a.severity]}">${esc(a.message)}</strong>
      </div>
      ${a.detail ? `<div style="font-size:0.72rem;color:var(--text-muted);margin-left:26px">${esc(a.detail)}</div>` : ""}
    </div>`;
  }

  html += "</div>";
  return html;
}

function renderTimelineV2(received, ipInfo, ipReputation) {
  if (!received?.length) return "";
  const hops = received.slice().reverse();

  // Calculate summary stats
  const totalHops = hops.length;
  const timestamps = hops.filter(h => h.ts).map(h => h.ts);
  const totalDuration = timestamps.length >= 2 ? Math.max(...timestamps) - Math.min(...timestamps) : 0;
  const maxDelay = Math.max(...hops.map(h => h.delay || 0), 0);
  const tlsCount = hops.filter(h => h.tls && !/^1\.[01]$/.test(h.tls)).length;
  const encryptedHops = hops.filter(h => h.tls).length;

  let html = `<div class="eh-v2-timeline-section">
    <div style="font-size:0.85rem;font-weight:700;margin-bottom:16px;display:flex;align-items:center;gap:6px">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      ${_t("Email Yolculuğu","Email Journey")}
    </div>`;

  // Journey Summary Bar
  const totalDurationStr = totalDuration > 0 ? formatDelayV2(totalDuration) : "0s";
  const maxDelayStr = maxDelay > 0 ? formatDelayV2(maxDelay) : "0s";
  const maxDelayColor = maxDelay > 5000 ? "danger" : maxDelay > 1000 ? "warning" : "";
  const tlsColor = encryptedHops === totalHops ? "success" : encryptedHops > totalHops / 2 ? "warning" : "danger";
  
  html += `<div class="eh-v2-journey-summary">
    <div class="eh-v2-journey-stat">
      <div class="eh-v2-journey-stat-value">${totalHops}</div>
      <div class="eh-v2-journey-stat-label">${_t("Toplam Hop","Total Hops")}</div>
    </div>
    <div class="eh-v2-journey-stat">
      <div class="eh-v2-journey-stat-value">${totalDurationStr}</div>
      <div class="eh-v2-journey-stat-label">${_t("Toplam Süre","Total Time")}</div>
    </div>
    <div class="eh-v2-journey-stat">
      <div class="eh-v2-journey-stat-value ${maxDelayColor}">${maxDelayStr}</div>
      <div class="eh-v2-journey-stat-label">${_t("En Yavaş Hop","Slowest Hop")}</div>
    </div>
    <div class="eh-v2-journey-stat">
      <div class="eh-v2-journey-stat-value ${tlsColor}">${encryptedHops}/${totalHops}</div>
      <div class="eh-v2-journey-stat-label">${_t("TLS Şifreli","TLS Encrypted")}</div>
    </div>
  </div>`;

  html += `<ol class="eh-v2-journey">`;

  // Gönderen
  const sender = getEmailSender(hops);
  if (sender) {
    html += `<li class="eh-v2-endpoint eh-v2-endpoint-sender" style="animation: eh-v2-hop-fade-in 0.2s ease both">
      <div class="eh-v2-endpoint-marker" aria-hidden="true"><span>✉️</span></div>
      <div class="eh-v2-endpoint-content">
        <div class="eh-v2-endpoint-text">
          <div class="eh-v2-endpoint-label">${_t("GÖNDEREN","SENDER")}</div>
          <div class="eh-v2-endpoint-addr">${esc(sender)}</div>
        </div>
      </div>
    </li>`;
  }

  // Hop'lar
  for (let i = 0; i < hops.length; i++) {
    const h = hops[i];
    const isLast = i === hops.length - 1;
    const hopNumber = i + 1;
    const nextHop = hops[i + 1];

    const tlsColor = !h.tls ? "var(--red)" : /^1\.[01]$/.test(h.tls) ? "var(--yellow)" : "var(--green)";
    const tlsLabel = h.tls ? `TLS ${h.tls}` : _t("Şifresiz","Plain");
    const tlsIcon = !h.tls ? "✗" : /^1\.[01]$/.test(h.tls) ? "⚠" : "✓";
    const cipherShort = h.cipher ? h.cipher.replace(/TLS_/g, "").replace(/_/g, " ") : "";

    const ipData = ipInfo?.find(ip => ip.ip === h.ip);
    const asn = ipData?.asn ? `AS${ipData.asn}` : "";
    const org = ipData?.org || "";
    const country = ipData?.country || "";

    const delayStr = h.delay != null ? formatDelayV2(h.delay) : "";
    const delayColor = !h.delay ? "var(--text-muted)" : h.delay > 5000 ? "var(--red)" : h.delay > 1000 ? "var(--yellow)" : "var(--green)";

    const repData = ipReputation?.find(r => r.ip === h.ip);
    const anomaly = detectTimeAnomaly(h, hops[i - 1]);
    
    const utcTime = h.ts ? new Date(h.ts).toISOString().replace("T", " ").replace(".000Z", " UTC") : "";

    // Classify hop as internal or external
    const hopType = classifyHop(h, hops, i);
    const hopTypeLabel = hopType === "internal" ? _t("Dahili","Internal") : _t("Harici","External");
    const hopTypeClass = hopType === "internal" ? "internal" : "external";

    // Country flag emoji
    const flagEmoji = countryToFlag(country);

    html += `<li class="eh-v2-hop-card" style="animation: eh-v2-hop-fade-in 0.2s ease ${i * 0.03}s both">
      <div class="eh-v2-hop-card-left">
        <div class="eh-v2-hop-card-num eh-v2-hop-num-${hopTypeClass}" style="border-color:${tlsColor};color:${tlsColor}">${hopNumber}</div>
      </div>
      <div class="eh-v2-hop-card-body">
        <div class="eh-v2-hop-card-header">
          <span class="eh-v2-hop-card-name">${esc(h.from || "?")}</span>
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round"><path d="M1 4h10M8 1l3 3-3 3"/></svg>
          <span class="eh-v2-hop-card-name">${esc(h.by || "?")}</span>
          <span class="eh-v2-hop-type-badge eh-v2-hop-type-badge-${hopTypeClass}">${hopTypeLabel}</span>
        </div>
        <div class="eh-v2-hop-card-badges">
          <span class="eh-v2-hop-chip" style="color:${tlsColor}">${tlsIcon} ${tlsLabel}</span>
          ${cipherShort ? `<span class="eh-v2-hop-chip eh-v2-hop-chip-cipher">${esc(cipherShort)}</span>` : ""}
          ${delayStr ? `<span class="eh-v2-hop-chip eh-v2-hop-chip-delay" style="color:${delayColor}">⏱ ${delayStr}</span>` : ""}
          ${flagEmoji ? `<span class="eh-v2-hop-chip eh-v2-hop-chip-geo">${flagEmoji} ${esc(country)}</span>` : ""}
          ${asn ? `<span class="eh-v2-hop-chip eh-v2-hop-chip-asn">${esc(asn)}</span>` : ""}
          ${repData && !repData.error ? `<span class="eh-v2-hop-chip" style="color:${repData.clean ? 'var(--green)' : 'var(--red)'}">${repData.clean ? '✓' : '⚠'} IP ${repData.clean ? _t("Temiz","Clean") : repData.listedCount + "/" + repData.totalLists}</span>` : ""}
        </div>
        <div class="eh-v2-hop-card-meta">
          ${utcTime ? `<span>🕐 ${utcTime}</span>` : ""}
          ${org ? `<span>${esc(org)}</span>` : ""}
        </div>
        ${anomaly ? `<div class="eh-v2-hop-card-warn">⚠ ${anomaly}</div>` : ""}
      </div>
    </li>`;

    // Hop'lar arası ok + gecikme
    if (!isLast && h.delay != null) {
      const nd = h.delay;
      const ndColor = nd > 5000 ? "var(--red)" : nd > 1000 ? "var(--yellow)" : "var(--green)";
      const ndStr = formatDelayV2(nd);
      html += `<li class="eh-v2-hop-arrow" style="animation: eh-v2-hop-fade-in 0.2s ease ${(i + 0.5) * 0.03}s both">
        <div class="eh-v2-hop-arrow-spacer" aria-hidden="true"></div>
        <div class="eh-v2-hop-arrow-content">
          <svg width="14" height="20" viewBox="0 0 14 20"><line x1="7" y1="0" x2="7" y2="12" stroke="var(--border)" stroke-width="2"/><polyline points="3 8 7 12 11 8" fill="none" stroke="var(--border)" stroke-width="2" stroke-linecap="round"/></svg>
          <span class="eh-v2-hop-arrow-label" style="color:${ndColor}">${ndStr}</span>
        </div>
      </li>`;
    }
  }

  // Alıcı
  const receiver = getEmailReceiver(hops);
  if (receiver) {
    html += `<li class="eh-v2-endpoint eh-v2-endpoint-receiver" style="animation: eh-v2-hop-fade-in 0.2s ease both">
      <div class="eh-v2-endpoint-marker" aria-hidden="true"><span>📥</span></div>
      <div class="eh-v2-endpoint-content">
        <div class="eh-v2-endpoint-text">
          <div class="eh-v2-endpoint-label">${_t("ALICI","RECEIVER")}</div>
          <div class="eh-v2-endpoint-addr">${esc(receiver)}</div>
        </div>
      </div>
    </li>`;
  }

  html += "</ol></div>";
  return html;
}

function getEmailSender(hops) {
  if (!hops || hops.length === 0) return null;
  const first = hops[0];
  const byHost = first.by || "";
  if (byHost && byHost.includes(".")) return byHost;
  return first.from || null;
}
function getEmailReceiver(hops) {
  if (!hops || hops.length === 0) return null;
  const last = hops[hops.length - 1];
  return last.by || last.from || null;
}

function detectTimeAnomaly(currentHop, prevHop) {
  if (!currentHop?.delay || !prevHop) return null;
  if (currentHop.delay < 0) {
    return _t("Zaman paradoksu: Önceki hop'tan önce geldi","Time paradox: Arrived before previous hop");
  }
  if (currentHop.delay > 3600000) {
    const hours = Math.floor(currentHop.delay / 3600000);
    return _t("Çok uzun gecikme","Very long delay") + ` (${hours}+ ${_t("saat","hours")})`;
  }
  return null;
}

function formatDelayV2(ms) {
  if (ms < 0) return "";
  if (ms < 1000) return `+${Math.round(ms)}ms`;
  if (ms < 60000) return `+${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60000);
  const s = Math.round((ms % 60000) / 1000);
  return `+${m}m${s}s`;
}

function renderMetaCardV2(meta, emailClient, priority, importance) {
  if (!meta || !Object.values(meta).some(v => v)) return "";
  const labels = { from: _t("Gönderen","From"), to: _t("Alıcı","To"), subject: _t("Konu","Subject"), date: _t("Tarih","Date"), messageId: "Message-ID", returnPath: "Return-Path", replyTo: "Reply-To" };
  const icons = { from: "✉️", to: "📥", subject: "🏷️", date: "📅", messageId: "🆔", returnPath: "🔄", replyTo: "↩️" };
  let rows = "";
  for (const [k, v] of Object.entries(meta)) {
    if (v) rows += `<div class="eh-meta-row"><span class="eh-meta-icon">${icons[k] || "•"}</span><span class="eh-meta-label">${labels[k] || k}</span><span class="eh-meta-value">${esc(v)}</span></div>`;
  }

  // Email client bilgisi
  if (emailClient) {
    const clientInfo = detectEmailClient(emailClient);
    rows += `<div class="eh-meta-row"><span class="eh-meta-icon">💻</span><span class="eh-meta-label">${_t("Email İstemcisi","Email Client")}</span><span class="eh-meta-value">${clientInfo.icon} ${esc(clientInfo.name)}</span></div>`;
  }

  // Priority/Importance
  if (priority || importance) {
    const isUrgent = priority?.includes("1") || priority?.toLowerCase().includes("high") || importance?.toLowerCase() === "high";
    const urgentIcon = isUrgent ? "🚨" : "📌";
    const urgentColor = isUrgent ? "var(--red)" : "var(--yellow)";
    rows += `<div class="eh-meta-row"><span class="eh-meta-icon">${urgentIcon}</span><span class="eh-meta-label">${_t("Öncelik","Priority")}</span><span class="eh-meta-value" style="color:${urgentColor};font-weight:600">${esc(priority || importance)}</span></div>`;
  }

  return `<div class="eh-card"><h4 class="eh-card-title"><svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"stroke-width="2"stroke-linecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> ${_t("Temel Bilgiler","Basic Info")}</h4><div class="eh-meta-grid">${rows}</div></div>`;
}

function detectEmailClient(client) {
  const c = client.toLowerCase();
  if (c.includes("outlook")) return { name: "Microsoft Outlook", icon: "📧" };
  if (c.includes("thunderbird")) return { name: "Mozilla Thunderbird", icon: "🐦" };
  if (c.includes("apple mail") || c.includes("mac os x")) return { name: "Apple Mail", icon: "🍎" };
  if (c.includes("gmail") || c.includes("google")) return { name: "Gmail", icon: "📮" };
  if (c.includes("yahoo")) return { name: "Yahoo Mail", icon: "📬" };
  if (c.includes("protonmail")) return { name: "ProtonMail", icon: "🔒" };
  if (c.includes("lotus")) return { name: "IBM Lotus Notes", icon: "📋" };
  if (c.includes("postfix") || c.includes("sendmail")) return { name: "MTA Server", icon: "🖥️" };
  if (c.includes("php")) return { name: "PHP Mail", icon: "🐘" };
  return { name: client.substring(0, 40), icon: "💻" };
}

function renderIPCardV2(ipInfo) {
  if (!ipInfo?.length) return "";
  let html = `<div class="eh-card"><h4 class="eh-card-title"><svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"stroke-width="2"stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><circle cx="12" cy="12" r="3"/></svg> ${_t("IP Bilgileri","IP Information")}</h4><div class="eh-v2-ip-grid">`;
  for (const info of ipInfo) {
    const ptrs = info.ptr?.length > 0 ? esc(info.ptr.join(", ")) : '<span style="color:var(--text-muted)">' + _t("PTR yok","No PTR") + '</span>';
    const asn = info.asn ? `<span class="eh-v2-badge" style="color:var(--accent);background:rgba(56,189,248,0.08);border-color:rgba(56,189,248,0.15)">AS${info.asn}</span>` : "";
    const country = info.country ? `<span class="eh-v2-badge" style="color:var(--text-secondary);background:var(--bg-elevated);border-color:var(--border)">${esc(info.country)}</span>` : "";
    const org = info.org || "";

    html += `<div class="eh-v2-ip-card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="font-family:'JetBrains Mono',monospace;font-weight:700;font-size:0.85rem">${esc(info.ip)}</span>
        ${asn}${country}
      </div>
      ${org ? `<div style="font-size:0.72rem;color:var(--text-secondary);margin-bottom:4px">${esc(org)}</div>` : ""}
      <div style="font-size:0.68rem;color:var(--text-muted)">PTR: ${ptrs}</div>
    </div>`;
  }
  html += "</div></div>";
  return html;
}

function renderAttachmentsV2(attachments, contentType) {
  if (!attachments || attachments.length === 0) {
    if (contentType && contentType.includes("multipart")) {
      return `<div class="eh-v2-attachment-card eh-v2-attachment-none">
        <span style="font-size:1.2rem">📎</span>
        <div style="font-size:0.78rem;color:var(--text-secondary)">${_t("Multipart email — ek dosya bilgisi header'da görünmüyor","Multipart email — attachment details not visible in headers")}</div>
      </div>`;
    }
    return "";
  }

  let html = `<div class="eh-v2-attachment-section">
    <div style="font-size:0.85rem;font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:6px">
      <span>📎</span> ${_t("Ek Dosyalar","Attachments")} (${attachments.length})
    </div>
    <div class="eh-v2-attachment-grid">`;

  for (const att of attachments) {
    const ext = att.filename.split('.').pop().toLowerCase();
    const suspicious = ['exe', 'scr', 'bat', 'cmd', 'pif', 'vbs', 'js', 'wsf', 'msi', 'dll', 'com', 'hta', 'cpl'].includes(ext);
    const icon = getFileIcon(ext);

    html += `<div class="eh-v2-attachment-item ${suspicious ? 'eh-v2-attachment-danger' : ''}">
      <span class="eh-v2-attachment-icon">${icon}</span>
      <div class="eh-v2-attachment-info">
        <div class="eh-v2-attachment-name">${esc(att.filename)}</div>
        <div class="eh-v2-attachment-meta">${esc(ext.toUpperCase())}</div>
      </div>
      ${suspicious ? '<span class="eh-v2-attachment-warning">⚠️ ' + _t("Şüpheli","Suspicious") + '</span>' : ''}
    </div>`;
  }

  html += "</div></div>";
  return html;
}

function getFileIcon(ext) {
  const icons = {
    pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
    ppt: '📽️', pptx: '📽️', zip: '🗜️', rar: '🗜️', '7z': '🗜️',
    jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', svg: '🖼️', bmp: '🖼️',
    mp3: '🎵', wav: '🎵', flac: '🎵', mp4: '🎬', avi: '🎬', mov: '🎬', mkv: '🎬',
    txt: '📃', csv: '📃', rtf: '📃',
    html: '🌐', htm: '🌐', xml: '🌐', json: '🌐',
    exe: '⚙️', msi: '⚙️', dmg: '⚙️',
    iso: '💿', img: '💿',
  };
  return icons[ext] || '📎';
}

function renderSpamScoreV2(spamScore, spamStatus) {
  if (spamScore === null && !spamStatus) return "";

  const score = spamScore ?? 0;
  const maxScore = 10;
  const pct = Math.min(100, Math.max(0, (score / maxScore) * 100));

  let color, bg, label;
  if (score < 2) {
    color = "var(--green)"; bg = "var(--green-bg)"; label = _t("Düşük Spam Riski","Low Spam Risk");
  } else if (score < 5) {
    color = "var(--yellow)"; bg = "var(--yellow-bg)"; label = _t("Orta Spam Riski","Medium Spam Risk");
  } else {
    color = "var(--red)"; bg = "var(--red-bg)"; label = _t("Yüksek Spam Riski","High Spam Risk");
  }

  return `<div class="eh-v2-spam-card" style="background:${bg};border-color:${color}30">
    <div class="eh-v2-spam-header">
      <span style="font-size:1.2rem">🛡️</span>
      <span style="font-size:0.85rem;font-weight:700;color:${color}">${label}</span>
    </div>
    <div class="eh-v2-spam-bar">
      <div class="eh-v2-spam-fill" style="width:${pct}%;background:${color}"></div>
    </div>
    <div class="eh-v2-spam-details">
      <span>${_t("Spam Skoru","Spam Score")}: <strong style="color:${color}">${score.toFixed(1)}</strong> / ${maxScore}</span>
      ${spamStatus ? `<span style="margin-left:auto;font-size:0.7rem;color:var(--text-muted);max-width:50%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(spamStatus)}</span>` : ''}
    </div>
  </div>`;
}

function renderCalendarBadgeV2(method) {
  const methodLabels = {
    "REQUEST": _t("Toplantı Daveti","Meeting Invite"),
    "REPLY": _t("Toplantı Yanıtı","Meeting Reply"),
    "CANCEL": _t("Toplantı İptali","Meeting Cancel"),
    "ADD": _t("Toplantı Güncellemesi","Meeting Update"),
  };
  const label = methodLabels[method] || _t("Takvim Daveti","Calendar Invite");

  return `<div class="eh-v2-calendar-badge">
    <span>📅</span>
    <span>${label}</span>
    ${method ? `<span style="margin-left:auto;font-size:0.65rem;color:var(--text-muted)">${esc(method)}</span>` : ''}
  </div>`;
}

function renderNewsletterBadgeV2() {
  return `<div class="eh-v2-newsletter-badge">
    <span>📧</span>
    <span>${_t("Newsletter / Marketing Email","Newsletter / Marketing Email")}</span>
    <span style="margin-left:auto;font-size:0.65rem;color:var(--text-muted)">List-Unsubscribe ${_t("mevcut","present")}</span>
  </div>`;
}

function countryToFlag(iso) {
  if (!iso || iso.length !== 2) return "";
  return iso.toUpperCase().replace(/./g, c => String.fromCodePoint(0x1F1A5 + c.charCodeAt(0)));
}

function classifyHop(hop, hops, index) {
  const ip = hop.ip || "";
  const from = (hop.from || "").toLowerCase();
  const by = (hop.by || "").toLowerCase();
  
  // Check if IP is private/internal
  const isPrivate = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|169\.254\.)/.test(ip) || 
                    /^fe80:/i.test(ip) || /^::1$/.test(ip) ||
                    /local|internal|corp|intranet|private/i.test(from) ||
                    /local|internal|corp|intranet|private/i.test(by);
  
  if (isPrivate) return "internal";
  
  // Check if from and by domains are the same (internal relay)
  if (from && by) {
    const fromDomain = extractDomain(from);
    const byDomain = extractDomain(by);
    if (fromDomain && byDomain && fromDomain === byDomain) return "internal";
  }
  
  return "external";
}

function extractDomain(email) {
  if (!email) return null;
  const match = email.match(/@([a-z0-9.-]+\.[a-z]{2,})$/i);
  return match ? match[1].toLowerCase() : null;
}
