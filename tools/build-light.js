// 단일 HTML 대시보드(3.5MB)를 경량 구조로 분리한다.
//   index.html            : 화면과 코드만
//   cards.json            : 카드 데이터 (CARDS 배열)
//   status.json           : 개정 감시·운영 현황 (예약 작업이 갱신)
//   vendor/pdf.mjs, vendor/pdf.worker.mjs : PDF 변환기(pdf.js)
// 사용: node tools/build-light.js <원본.html> <출력폴더> <status.json>
const fs = require("fs"), path = require("path"), vm = require("vm");
const [src, outDir, statusPath] = process.argv.slice(2);
let html = fs.readFileSync(src, "utf8");
fs.mkdirSync(path.join(outDir, "vendor"), { recursive: true });

// 1) PDF.js base64 → 파일
// 작업자 파일은 문자열 안에 제어문자가 있어 base64 텍스트 그대로 둔다(게시 규칙: 텍스트에 ESC 금지)
for (const [name, file, raw] of [["PDFJS_LIB_B64", "pdf.mjs", false], ["PDFJS_WORKER_B64", "pdf.worker.b64.txt", true]]) {
  const m = new RegExp(`const ${name} = "([A-Za-z0-9+/=]+)";\\n`).exec(html);
  if (!m) throw new Error(name + " 없음");
  fs.writeFileSync(path.join(outDir, "vendor", file), raw ? m[1] : Buffer.from(m[1], "base64"));
  html = html.replace(m[0], "");
}
html = html.replace('b64ToBlobUrl(PDFJS_WORKER_B64, "text/javascript")', 'await fileToBlobUrl("vendor/pdf.worker.b64.txt", true)')
           .replace('b64ToBlobUrl(PDFJS_LIB_B64, "text/javascript")', 'await fileToBlobUrl("vendor/pdf.mjs")');
if (html.includes("PDFJS_LIB_B64") || html.includes("PDFJS_WORKER_B64")) throw new Error("PDF.js 참조가 남음");
html = html.replace("  let pdfjsLibPromise = null;",
  `  async function fileToBlobUrl(p, isB64) {
    const r = await fetch(p);
    if (!r.ok) throw new Error("PDF 변환기를 불러오지 못했습니다 (" + r.status + ")");
    const t = await r.text();
    const body = isB64 ? Uint8Array.from(atob(t.trim()), c => c.charCodeAt(0)) : t;
    return URL.createObjectURL(new Blob([body], { type: "text/javascript" }));
  }
  let pdfjsLibPromise = null;`);

// 2) CARDS → cards.json
const s = html.indexOf("const CARDS = ["), e = html.indexOf("\nconst CATS", s);
const ctx = {}; vm.createContext(ctx);
vm.runInContext(html.slice(s, e).replace("const CARDS =", "globalThis.CARDS ="), ctx, { timeout: 5000 });
fs.writeFileSync(path.join(outDir, "cards.json"), "[\n" + ctx.CARDS.map(c => JSON.stringify(c)).join(",\n") + "\n]\n");
html = html.slice(0, s) + "let CARDS = [];\nlet STATUS = null;" + html.slice(e);

// 3) 초기화: 데이터 파일을 받은 뒤 그린다
const init = "buildStats();\nbuildFilters();\nbuildDoms();\nbuildTabs();\nrender();\n";
if (!html.includes(init)) throw new Error("초기화 블록 없음");
html = html.replace(init, `(async function boot() {
  const list = document.getElementById("list");
  list.innerHTML = '<div class="empty">카드를 불러오는 중…</div>';
  try {
    const r = await fetch("cards.json", { cache: "no-cache" });
    if (!r.ok) throw new Error(r.status);
    CARDS = await r.json();
  } catch (err) {
    list.innerHTML = '<div class="empty">카드 데이터를 불러오지 못했습니다. 새로고침해 주세요. (' + esc(String(err.message || err)) + ')</div>';
    return;
  }
  try { const r2 = await fetch("status.json", { cache: "no-cache" }); if (r2.ok) STATUS = await r2.json(); } catch (err) {}
  buildStats(); buildFilters(); buildDoms(); buildTabs(); render(); buildOps();
})();
`);

// 4) 운영 현황 패널(개정 감시 · 검토대기)
const panelCss = `
.ops-panel { background: var(--surface); border: 1px solid var(--border); border-radius: 9px; padding: 13px 16px; margin: 0 0 16px; }
.ops-panel h2 { font-family: var(--font-display); font-size: 16px; font-weight: 700; margin: 0 0 4px; }
.ops-sub { font-size: 12px; color: var(--ink-soft); margin: 0 0 10px; }
.ops-grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); }
.ops-grid > div { min-width: 0; }
.ops-grid h3 { font-size: 13.5px; margin: 0 0 6px; display: flex; gap: 6px; align-items: center; }
.ops-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 5px; }
.ops-list li { display: flex; gap: 8px; align-items: baseline; font-size: 12.5px; padding: 6px 9px; background: var(--surface-2); border-radius: 6px; }
.ops-list li .d { flex: none; font-weight: 700; font-variant-numeric: tabular-nums; min-width: 4.2em; }
.ops-list li .d.soon { color: var(--warn-ink); }
.ops-list li .t { min-width: 0; }
.ops-list li .t small { display: block; color: var(--ink-soft); }
.ops-list button.t { all: unset; cursor: pointer; min-width: 0; color: var(--ink); }
.ops-list button.t:hover { color: var(--accent-soft-ink); text-decoration: underline; }
.ops-list button.t:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 3px; }
.ops-n:empty { display: none; }
.ops-n { font-size: 11px; padding: 1px 8px; border-radius: 20px; background: var(--warn-soft); color: var(--warn-ink); font-weight: 600; }
.ops-foot { font-size: 11px; color: var(--ink-faint); margin-top: 8px; }
`;
html = html.replace("</style>\n</head>", panelCss + "</style>\n</head>");
html = html.replace('<div class="stats" id="stats"></div>',
`<section class="ops-panel" id="opsPanel" aria-labelledby="opsTitle" hidden>
  <h2 id="opsTitle">운영 현황</h2>
  <p class="ops-sub" id="opsSub"></p>
  <div class="ops-grid">
    <div><h3>법령 개정 감시 <span class="ops-n" id="opsLawN"></span></h3><ul class="ops-list" id="opsLaws"></ul></div>
    <div><h3>검토대기 의견서 <span class="ops-n" id="opsRevN"></span></h3><ul class="ops-list" id="opsRev"></ul></div>
  </div>
  <div class="ops-foot" id="opsFoot"></div>
</section>

<div class="stats" id="stats"></div>`);
html = html.replace("\nconst CATS =", `
function buildOps() {
  const panel = document.getElementById("opsPanel");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const laws = (STATUS && STATUS.pending) || [];
  const lawEl = document.getElementById("opsLaws");
  const rows = laws.map(p => {
    const d = new Date(p.effective + "T00:00:00"); const dd = Math.round((d - today) / 86400000);
    return { p, dd };
  }).filter(x => x.dd >= -7).sort((a, b) => a.dd - b.dd);
  const more = rows.length - 6;
  lawEl.innerHTML = rows.length ? rows.slice(0, 6).map(({ p, dd }) =>
    '<li><span class="d' + (dd <= 14 ? " soon" : "") + '">' + (dd > 0 ? "D-" + dd : dd === 0 ? "오늘" : "시행됨") + '</span><span class="t">' +
    esc(p.law) + " · " + esc(p.effective) + " 시행" + (p.changed || p.impact ? "<small>" + esc([p.changed, p.impact].filter(Boolean).join(" / ")) + "</small>" : "") + "</span></li>").join("") + (more > 0 ? '<li><span class="t">그 밖에 ' + more + '건 (' + esc(rows.slice(6).map(x => x.p.law.replace(/ 및 .*|에 관한 법률|을 위한 .*/g, "")).join(", ")) + ')</span></li>' : "")
    : '<li><span class="t">예정된 개정이 없습니다.</span></li>';
  document.getElementById("opsLawN").textContent = rows.filter(x => x.dd <= 14).length ? "14일 내 " + rows.filter(x => x.dd <= 14).length + "건" : "";
  const rev = CARDS.filter(c => /검토대기/.test(c.refs || "")).sort((a, b) => b.id.localeCompare(a.id));
  document.getElementById("opsRevN").textContent = rev.length ? rev.length + "건" : "";
  document.getElementById("opsRev").innerHTML = rev.length ? rev.slice(0, 12).map(c =>
    '<li><span class="d">' + esc(c.id.slice(2, 6) + "." + c.id.slice(6, 8) + "." + c.id.slice(8, 10)) + '</span><button type="button" class="t" data-find="' + esc(c.id) + '">' + esc(c.title) + "</button></li>").join("")
    : '<li><span class="t">검토대기 카드가 없습니다.</span></li>';
  document.getElementById("opsSub").textContent = "법령 개정 예정과, 법무사 검토 전 상태로 올라간 의견서 카드입니다.";
  document.getElementById("opsFoot").textContent = STATUS && STATUS.asOf ? "개정 감시 기준일 " + STATUS.asOf + " · 매일 아침 자동 점검" : "개정 감시 자료를 불러오지 못했습니다.";
  panel.hidden = false;
  document.getElementById("opsRev").addEventListener("click", ev => {
    const b = ev.target.closest("button[data-find]"); if (!b) return;
    const c = CARDS.find(x => x.id === b.dataset.find); if (!c) return;
    curDom = ""; curCat = c.cat; document.getElementById("q").value = c.title.slice(0, 20);
    buildDoms(); buildTabs(); render();
    document.getElementById("list").scrollIntoView({ behavior: "smooth", block: "start" });
  });
}
const CATS =`);

fs.writeFileSync(path.join(outDir, "index.html"), html);
fs.copyFileSync(statusPath, path.join(outDir, "status.json"));
for (const f of ["index.html", "cards.json", "status.json", "vendor/pdf.mjs", "vendor/pdf.worker.b64.txt"])
  console.log(f.padEnd(22), (fs.statSync(path.join(outDir, f)).size / 1024).toFixed(0) + " KB");
console.log("카드", ctx.CARDS.length, "건");
