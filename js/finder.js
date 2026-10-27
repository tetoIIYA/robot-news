// 分野×種別の絞り込み（トップページ）。index.json を読み込み、条件に合うトピックを表示する
(() => {
  const RN = window.RN || {};
  const D = RN.tax.domains, T = RN.tax.types;
  const dn = k => (D.find(x => x.key === k) || {}).name || k;
  const tn = k => (T.find(x => x.key === k) || {}).name || k;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const st = { d: new Set(), t: new Set(), r: "all", p: "week", q: "", s: "rank" };
  try { const s = JSON.parse(localStorage.getItem("rn-filter") || "null"); if (s) { st.d = new Set(s.d); st.t = new Set(s.t); st.r = s.r || "all"; st.p = s.p || "week"; st.s = s.s === "new" ? "new" : "rank"; } } catch (e) {}
  const save = () => { try { localStorage.setItem("rn-filter", JSON.stringify({ d: [...st.d], t: [...st.t], r: st.r, p: st.p, s: st.s })); } catch (e) {} };
  let A = [];
  const weeks = [];
  const inPeriod = a => st.p === "all" || (st.p === "week" ? a.w === RN.week : weeks.slice(0, 4).includes(a.w));
  const match = (a, skip) => {
    if (!inPeriod(a)) return false;
    if (skip !== "d" && st.d.size && !st.d.has(a.d)) return false;
    if (skip !== "t" && st.t.size && !st.t.has(a.ty)) return false;
    if (st.r !== "all" && a.r !== st.r) return false;
    if (st.q) { const h = (a.t + a.s + dn(a.d) + tn(a.ty) + (a.c || []).join(" ") + ((a.rs || {}).affiliation || "")).toLowerCase(); if (!h.includes(st.q.toLowerCase())) return false; }
    return true;
  };
  const links = a => {
    let h = "";
    if (a.rs) {
      if (a.rs.project_url) h += `<a class="off" href="${esc(a.rs.project_url)}" target="_blank" rel="noopener">プロジェクトページ</a>`;
      if (a.rs.arxiv_url) h += `<a class="news" href="${esc(a.rs.arxiv_url)}" target="_blank" rel="noopener">arXiv ↗</a>`;
      if (a.rs.code_url) h += `<a class="news" href="${esc(a.rs.code_url)}" target="_blank" rel="noopener">コード ↗</a>`;
    } else if (a.o) h += `<a class="off" href="${esc(a.o.url)}" target="_blank" rel="noopener">${esc(a.o.publisher || "公式ページ")}</a>`;
    (a.src || []).forEach(s => h += `<a class="news" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.source)} ↗</a>`);
    return h;
  };
  const extra = a => {
    if (a.rs) { const r = a.rs; return `<div class="extra">${r.affiliation ? `<span>所属 <b>${esc(r.affiliation)}</b></span>` : ""}${r.stars_gain ? `<span>GitHub ★ <b>+${r.stars_gain}</b>（7日）</span>` : ""}${r.hf ? `<span>HF ▲ <b>${r.hf}</b></span>` : ""}${r.hn ? `<span>HN <b>${r.hn}</b></span>` : ""}</div>`; }
    if (a.ev) { const e = a.ev; return `<div class="extra"><span>日程 <b>${esc(e.start)}${e.end && e.end !== e.start ? " – " + esc(e.end) : ""}</b></span>${e.venue ? `<span>会場 <b>${esc(e.venue)}</b></span>` : ""}${e.city ? `<span>${esc(e.city)}</span>` : ""}</div>`; }
    return "";
  };
  const card = a => `<article class="card" data-href="${esc(a.u)}">
    <div class="meta"><a class="tag-d" style="--c:var(--d-${a.d})" href="/domains/${a.d}/">${esc(dn(a.d))}</a><a class="tag-t" href="/types/${a.ty}/">${esc(tn(a.ty))}</a><span class="tag-r">${a.r === "jp" ? "国内" : "海外"}</span><span class="date">${esc(a.dt)}</span></div>
    <a class="title" href="${esc(a.u)}"><h3>${esc(a.t)}</h3></a><p class="sum">${esc(a.s)}</p>${extra(a)}<div class="links">${links(a)}</div></article>`;
  const chips = () => {
    document.getElementById("domainChips").innerHTML = D.map(x => { const n = A.filter(a => a.d === x.key && match(a, "d")).length; const on = st.d.has(x.key);
      return `<button type="button" class="chip" style="--c:var(--d-${x.key})" data-d="${x.key}" aria-pressed="${on}" ${!n && !on ? "disabled" : ""} title="${esc(x.desc)}"><span class="dot"></span>${esc(x.name)}<span class="n">${n}</span></button>`; }).join("");
    document.getElementById("typeChips").innerHTML = T.map(x => { const n = A.filter(a => a.ty === x.key && match(a, "t")).length; const on = st.t.has(x.key);
      return `<button type="button" class="chip" data-t="${x.key}" aria-pressed="${on}" ${!n && !on ? "disabled" : ""} title="${esc(x.desc)}">${esc(x.name)}<span class="n">${n}</span></button>`; }).join("");
    document.querySelectorAll("#regionSeg button").forEach(b => b.setAttribute("aria-pressed", b.dataset.r === st.r));
    document.querySelectorAll("#periodSeg button").forEach(b => b.setAttribute("aria-pressed", b.dataset.p === st.p));
    document.querySelectorAll("#sortSeg button").forEach(b => b.setAttribute("aria-pressed", b.dataset.s === st.s));
  };
  const render = () => {
    chips();
    // 重要度順：週ごとに重要度の高い順／新しい順：日付の新しい順（同じ日は重要度順）
    const cmp = (a, b) => (a > b) - (a < b);
    const list = A.filter(a => match(a)).sort(st.s === "new"
      ? (x, y) => cmp(y.ds || "", x.ds || "") || (y.rk - x.rk)
      : (x, y) => cmp(y.w, x.w) || (y.rk - x.rk));
    document.getElementById("cards").innerHTML = list.length ? list.map(card).join("") : `<div class="empty">この条件に当てはまるトピックはありません。条件を減らすか、期間を広げてみてください。</div>`;
    const parts = [...[...st.d].map(dn), ...[...st.t].map(tn)];
    document.getElementById("resultLabel").textContent = `${list.length}件のトピック` + (parts.length ? `（${parts.join("・")}）` : "");
    const filtered = st.d.size || st.t.size || st.q || st.r !== "all";
    document.getElementById("streamLabel").textContent = filtered ? "絞り込み結果" : ({ week: "今週のトピック", "4w": "直近4週間のトピック", all: "すべてのトピック" }[st.p]);
    save();
  };
  document.addEventListener("click", e => {
    const c = e.target.closest("#finder .chip");
    if (c && !c.disabled) { const set = c.dataset.d ? st.d : st.t, k = c.dataset.d || c.dataset.t; set.has(k) ? set.delete(k) : set.add(k); render(); return; }
    const r = e.target.closest("#regionSeg button"); if (r) { st.r = r.dataset.r; render(); return; }
    const p = e.target.closest("#periodSeg button"); if (p) { st.p = p.dataset.p; render(); return; }
    const s = e.target.closest("#sortSeg button"); if (s) { st.s = s.dataset.s; render(); return; }
  });
  const q = document.getElementById("q");
  q.addEventListener("input", () => { st.q = q.value.trim(); render(); });
  document.getElementById("clearBtn").addEventListener("click", () => { st.d.clear(); st.t.clear(); st.r = "all"; st.p = "week"; st.q = ""; q.value = ""; render(); });
  fetch(RN.index).then(r => r.json()).then(rows => {
    A = rows || [];
    [...new Set(A.map(a => a.w))].sort().reverse().forEach(w => weeks.push(w));
    render();
  }).catch(() => { /* 読み込めない場合はサーバー側で描画した今週の一覧をそのまま表示 */ chips(); });
})();
