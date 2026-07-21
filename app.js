/* Eco-System Board Game — vanilla JS, hash-routed, localStorage-backed. */
(function () {
  "use strict";

  var STORE_KEY = "ecosystem_submissions_v1";
  var app = document.getElementById("app");

  /* ---------- storage (shared cloud via Supabase, localStorage fallback) ---------- */
  var TABLE = "teams";
  var USE_CLOUD = !!(window.SB_URL && window.SB_KEY && window.supabase);
  var sb = USE_CLOUD ? window.supabase.createClient(window.SB_URL, window.SB_KEY) : null;
  var cache = []; // in-memory copy the views render from

  function lsLoad() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
    catch (e) { return []; }
  }
  function lsSave(list) { localStorage.setItem(STORE_KEY, JSON.stringify(list)); }

  // Synchronous reads used by the views — always served from the cache.
  function load() { return cache.slice(); }
  function getTeam(id) { return cache.filter(function (x) { return x.id === id; })[0]; }

  // Pull the shared list into the cache. Returns a promise.
  function fetchAll() {
    if (!USE_CLOUD) { cache = lsLoad(); return Promise.resolve(); }
    return sb.from(TABLE).select("id,data,created").order("created", { ascending: false })
      .then(function (res) {
        if (res.error) { toast("Load error — check config"); return; }
        cache = (res.data || []).map(function (r) { return r.data; });
      });
  }

  function addTeam(t) {
    if (!USE_CLOUD) { var l = lsLoad(); l.push(t); lsSave(l); return fetchAll(); }
    return sb.from(TABLE).insert({ id: t.id, data: t, created: t.created })
      .then(function (res) { if (res.error) { toast("Save failed"); } return fetchAll(); });
  }

  function removeTeam(id) {
    if (!USE_CLOUD) { lsSave(lsLoad().filter(function (x) { return x.id !== id; })); return fetchAll(); }
    return sb.from(TABLE).delete().eq("id", id).then(function () { return fetchAll(); });
  }

  function clearAll() {
    if (!USE_CLOUD) { lsSave([]); return fetchAll(); }
    return sb.from(TABLE).delete().neq("id", "").then(function () { return fetchAll(); });
  }

  function uid() { return "t" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function el(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }

  function formatMoney(raw) {
    if (raw == null || raw === "") return "";
    var s = String(raw).trim();
    var num = Number(s.replace(/[^0-9.\-]/g, ""));
    // Small game money (a few hundred). Show as a plain "$" amount.
    if (!isFinite(num) || s.replace(/[^0-9.]/g, "") === "") {
      return s.charAt(0) === "$" ? s : "$" + s;
    }
    return "$" + num.toLocaleString();
  }

  /* ---------- matching ---------- */
  // Max possible distance across 3 axes each 0-10 = sqrt(3*100) ≈ 17.32
  var MAX_DIST = Math.sqrt(3 * 100);
  function matchCountries(trust, env, econ, n) {
    var list = (window.COUNTRIES || []).map(function (c) {
      var d = Math.sqrt(
        Math.pow(c.trust - trust, 2) +
        Math.pow(c.environment - env, 2) +
        Math.pow(c.economic - econ, 2)
      );
      return { c: c, dist: d, similarity: Math.max(0, Math.round((1 - d / MAX_DIST) * 100)) };
    });
    list.sort(function (a, b) { return a.dist - b.dist; });
    return list.slice(0, n || 4);
  }

  /* ---------- toast ---------- */
  var toastEl;
  function toast(msg) {
    if (!toastEl) { toastEl = el('<div class="toast"></div>'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add("show");
    clearTimeout(toastEl._t); toastEl._t = setTimeout(function () { toastEl.classList.remove("show"); }, 1800);
  }

  /* ---------- views ---------- */
  function viewLanding() {
    app.innerHTML =
      '<section class="hero">' +
        '<h1>🌍 Eco-System Board Game</h1>' +
        '<p>Teams submit their <b>Trust</b>, <b>Environment</b> and <b>Economic</b> scores plus their richest player. The host reveals the real-world countries that match — live.</p>' +
      '</section>' +
      '<div class="choice-grid">' +
        '<a class="choice-card" href="#submit"><div class="ico">📝</div><h3>Team Submit</h3><p>Group admins enter their team\'s three values and their richest person.</p></a>' +
        '<a class="choice-card" href="#host"><div class="ico">🎤</div><h3>Host Dashboard</h3><p>See every team and reveal their matching countries on the big screen.</p></a>' +
      '</div>';
  }

  function viewSubmit() {
    app.innerHTML =
      '<div class="panel">' +
        '<h2>Team Submission</h2>' +
        '<p class="sub">Each value is 0–10. The sum (max 30) is calculated for you.</p>' +
        '<div class="field"><label for="teamName">Team name</label><input id="teamName" type="text" placeholder="e.g. The Green Foxes" maxlength="40" /></div>' +
        sliderBlock("Trust", "trust", "s-trust") +
        sliderBlock("Environment", "env", "s-env") +
        sliderBlock("Economic", "econ", "s-econ") +
        '<div class="sum-badge"><span>Total eco-system score</span><b id="sumOut">0<span style="font-size:14px;color:var(--muted)"> / 30</span></b></div>' +
        '<div class="row2">' +
          '<div class="field"><label for="rpName">Richest person (name)</label><input id="rpName" type="text" placeholder="e.g. Alex Morgan" maxlength="40" /></div>' +
          '<div class="field"><label for="rpMoney">Their money ($)</label><input id="rpMoney" type="number" min="0" step="1" placeholder="e.g. 500" maxlength="10" /></div>' +
        '</div>' +
        '<button class="btn block" id="submitBtn">✅ Submit team</button>' +
      '</div>' +
      '<div class="panel"><p class="sub" style="margin:0">' +
        (USE_CLOUD
          ? "Submissions sync to every device in real time — the host screen updates automatically."
          : "Single-device mode: submissions are saved only on this device. Add Supabase keys in data/config.js to sync.") +
      '</p></div>';

    var sliders = { trust: get("trust"), env: get("env"), econ: get("econ") };
    function get(id) { return document.getElementById("sl_" + id); }
    function refresh() {
      ["trust", "env", "econ"].forEach(function (k) {
        document.getElementById("out_" + k).textContent = sliders[k].value;
      });
      var sum = (+sliders.trust.value) + (+sliders.env.value) + (+sliders.econ.value);
      document.getElementById("sumOut").innerHTML = sum + '<span style="font-size:14px;color:var(--muted)"> / 30</span>';
    }
    ["trust", "env", "econ"].forEach(function (k) { sliders[k].addEventListener("input", refresh); });
    refresh();

    document.getElementById("submitBtn").addEventListener("click", function () {
      var name = document.getElementById("teamName").value.trim();
      if (!name) { toast("Please enter a team name"); return; }
      var team = {
        id: uid(),
        team: name,
        trust: +sliders.trust.value,
        environment: +sliders.env.value,
        economic: +sliders.econ.value,
        personName: document.getElementById("rpName").value.trim(),
        personMoney: document.getElementById("rpMoney").value.trim(),
        created: Date.now()
      };
      var btn = document.getElementById("submitBtn");
      btn.disabled = true;
      btn.textContent = "Submitting…";
      addTeam(team).then(function () {
        toast("Submitted! ✔");
        location.hash = "#host";
      });
    });
  }

  function sliderBlock(labelText, key, cls) {
    return '<div class="slider-block">' +
      '<div class="slider-head"><label style="margin:0">' + labelText + '</label><span class="val" id="out_' + key + '">0</span></div>' +
      '<input class="' + cls + '" id="sl_' + key + '" type="range" min="0" max="10" step="1" value="0" />' +
    '</div>';
  }

  function viewHost() {
    var teams = load().slice().sort(function (a, b) { return b.created - a.created; });
    var listHtml;
    if (!teams.length) {
      listHtml = '<div class="empty">No teams yet. Open the <a class="navlink active" href="#submit">Team Submit</a> tab to add one.</div>';
    } else {
      listHtml = '<div class="team-list">' + teams.map(function (t) {
        var sum = t.trust + t.environment + t.economic;
        return '<div class="team-item">' +
          '<div>' +
            '<div class="name">' + esc(t.team) + '</div>' +
            '<div class="meta">' +
              '<span class="chip trust">Trust ' + t.trust + '</span> ' +
              '<span class="chip env">Env ' + t.environment + '</span> ' +
              '<span class="chip econ">Econ ' + t.economic + '</span> ' +
              '<span class="chip sum">Σ ' + sum + '</span>' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;gap:8px">' +
            '<a class="btn" href="#reveal/' + t.id + '">Reveal ▶</a>' +
            '<button class="btn danger" data-del="' + t.id + '">✕</button>' +
          '</div>' +
        '</div>';
      }).join("") + '</div>';
    }

    app.innerHTML =
      '<div class="panel">' +
        '<div class="reveal-head"><h2>Host Dashboard</h2>' +
          '<div class="toolbar" style="margin:0">' +
            '<button class="btn secondary" id="refreshBtn">↻ Refresh</button>' +
            (teams.length ? '<button class="btn danger" id="clearBtn">Clear all</button>' : '') +
          '</div>' +
        '</div>' +
        '<p class="sub">' + teams.length + ' team(s) submitted. Click <b>Reveal</b> to show a team\'s matching countries.</p>' +
        listHtml +
      '</div>';

    var cb = document.getElementById("clearBtn");
    if (cb) cb.addEventListener("click", function () {
      if (confirm("Delete ALL submitted teams?")) { clearAll().then(function () { viewHost(); toast("Cleared"); }); }
    });
    document.getElementById("refreshBtn").addEventListener("click", function () {
      fetchAll().then(viewHost);
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-del]"), function (btn) {
      btn.addEventListener("click", function () {
        removeTeam(btn.getAttribute("data-del")).then(function () { viewHost(); toast("Removed"); });
      });
    });
  }

  function viewReveal(id) {
    var t = getTeam(id);
    if (!t) { app.innerHTML = '<div class="panel"><p class="empty">Team not found. <a href="#host">Back to host</a></p></div>'; return; }
    var sum = t.trust + t.environment + t.economic;
    var matches = matchCountries(t.trust, t.environment, t.economic, 4);

    var matchHtml = matches.map(function (m, i) {
      return '<div class="match-card' + (i === 0 ? " best" : "") + '">' +
        (i === 0 ? '<span class="best-tag">CLOSEST</span>' : '') +
        '<div class="flag">' + m.c.flag + '</div>' +
        '<div class="cn">' + esc(m.c.name) + '</div>' +
        '<div class="arch">' + esc(m.c.archetype) + '</div>' +
        '<div class="chips">' +
          '<span class="chip trust">T ' + m.c.trust + '</span>' +
          '<span class="chip env">E ' + m.c.environment + '</span>' +
          '<span class="chip econ">$ ' + m.c.economic + '</span>' +
        '</div>' +
        '<div class="simbar"><span style="width:' + m.similarity + '%"></span></div>' +
        '<div class="simpct">' + m.similarity + '% similar</div>' +
      '</div>';
    }).join("");

    var richHtml = "";
    if (t.personName || t.personMoney) {
      richHtml =
        '<div class="section-title">Richest Player</div>' +
        '<div class="rich-card">' +
          '<div class="coin">💰</div>' +
          '<div>' +
            '<div class="rp-name">' + (esc(t.personName) || "Anonymous Tycoon") + '</div>' +
            '<div class="rp-role">Wealthiest member of ' + esc(t.team) + '</div>' +
            '<div class="rp-money">' + (esc(formatMoney(t.personMoney)) || "—") + '</div>' +
          '</div>' +
        '</div>';
    }

    app.innerHTML =
      '<div class="toolbar"><a class="btn secondary" href="#host">← Back to host</a>' +
        '<button class="btn secondary" id="fsBtn">⛶ Fullscreen</button></div>' +
      '<div class="panel">' +
        '<div class="reveal-head">' +
          '<h2>' + esc(t.team) + '</h2>' +
          '<div class="chips">' +
            '<span class="chip trust">Trust ' + t.trust + '</span>' +
            '<span class="chip env">Environment ' + t.environment + '</span>' +
            '<span class="chip econ">Economic ' + t.economic + '</span>' +
            '<span class="chip sum">Total ' + sum + ' / 30</span>' +
          '</div>' +
        '</div>' +
        '<div class="section-title">Countries with similar eco-systems</div>' +
        '<div class="match-grid">' + matchHtml + '</div>' +
        richHtml +
      '</div>';

    var fsBtn = document.getElementById("fsBtn");
    if (fsBtn) fsBtn.addEventListener("click", function () {
      var d = document;
      if (!d.fullscreenElement && !d.webkitFullscreenElement) {
        var e = d.documentElement;
        (e.requestFullscreen || e.webkitRequestFullscreen || function () {}).call(e);
      } else {
        (d.exitFullscreen || d.webkitExitFullscreen || function () {}).call(d);
      }
    });
  }

  /* ---------- router ---------- */
  function setActiveNav(route) {
    Array.prototype.forEach.call(document.querySelectorAll(".navlink"), function (a) {
      a.classList.toggle("active", a.getAttribute("data-route") === route);
    });
  }
  function router() {
    var h = location.hash.replace(/^#/, "");
    var parts = h.split("/");
    window.scrollTo(0, 0);
    document.body.classList.toggle("route-reveal", parts[0] === "reveal");
    if (parts[0] === "submit") { setActiveNav("submit"); return viewSubmit(); }
    if (parts[0] === "host") { setActiveNav("host"); return viewHost(); }
    if (parts[0] === "reveal") { setActiveNav("host"); return viewReveal(parts[1]); }
    setActiveNav(""); viewLanding();
  }

  window.addEventListener("hashchange", router);

  // Load the shared list, render, then listen for changes from other devices.
  fetchAll().then(function () {
    router();
    if (USE_CLOUD) {
      sb.channel("teams-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, function () {
          fetchAll().then(router);
        })
        .subscribe();
    }
  });
})();
