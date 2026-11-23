// 대시보드 .dg 클래스용 만화 6컷(3줄×2컷) SVG 생성기
// panels: [{t:"① 제목", who:"L"|"R", lines:["…"], end?:true}] × 6, names: [왼쪽 인물, 오른쪽 인물]
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function person(cx, name, happy) {
  const m = happy ? `M${cx - 5},211 Q${cx},216 ${cx + 5},211` : `M${cx - 4},212 L${cx + 4},212`;
  return `<path d="M${cx},220 L${cx},254 M${cx - 16},234 L${cx},228 L${cx + 16},234 M${cx},254 L${cx - 11},278 M${cx},254 L${cx + 11},278" stroke="var(--ink-soft)" stroke-width="2.5" fill="none" stroke-linecap="round"/>` +
    `<circle class="hd" cx="${cx}" cy="204" r="16"/><circle cx="${cx - 5}" cy="202" r="3.5" fill="none" stroke="var(--ink)" stroke-width="1.5"/><circle cx="${cx + 5}" cy="202" r="3.5" fill="none" stroke="var(--ink)" stroke-width="1.5"/>` +
    `<path class="mouth" d="${m}"/><text class="nm" x="${cx}" y="292" text-anchor="middle">${esc(name)}</text>`;
}
function panel(p, i, names) {
  const x = i % 2 ? 390 : 10, y = 10 + Math.floor(i / 2) * 310;
  const h = 22 + 19 * p.lines.length, by = 42, left = p.who === "L";
  const bx = left ? 50 : 10, bw = 300;
  const tail = left ? `${bx + 14},${by + h - 1} ${bx + 30},${by + h - 1} 40,186` : `${bx + bw - 30},${by + h - 1} ${bx + bw - 14},${by + h - 1} 322,186`;
  const patch = left ? `<rect x="${bx + 15}" y="${by + h - 3}" width="14" height="4" fill="var(--surface)"/>` : `<rect x="${bx + bw - 29}" y="${by + h - 3}" width="14" height="4" fill="var(--surface)"/>`;
  const txt = p.lines.map((l, k) => `<text class="tx${p.end && k === 0 ? " b" : ""}" x="${bx + 12}" y="${by + 24 + k * 19}" text-anchor="start">${esc(l)}</text>`).join("");
  return `<g transform="translate(${x},${y})"><rect class="pn" x="0" y="0" width="360" height="300" rx="6"/><rect class="cap" x="0" y="0" width="360" height="30"/>` +
    `<text class="tx b" x="12" y="20" text-anchor="start">${esc(p.t)}</text>` +
    person(40, names[0], p.end) + person(322, names[1], p.end) +
    `<rect class="bub${p.end ? "" : ""}" x="${bx}" y="${by}" width="${bw}" height="${h}" rx="10"/><polygon class="bubt" points="${tail}"/>${patch}${txt}</g>`;
}
function comic(spec) {
  if (spec.panels.length !== 6) throw new Error("6컷이 아님: " + spec.panels.length);
  for (const p of spec.panels) for (const l of p.lines) if (l.length > 21) throw new Error("말풍선 줄이 너무 김(21자 초과): " + l);
  return `<div class="tx b" style="font-weight:700;margin:14px 0 6px">만화 6컷</div><figure class="dgfig"><svg class="dg" style="width:100%;height:auto" viewBox="0 0 760 940" role="img" aria-label="6컷 만화: ${esc(spec.label)}">` +
    spec.panels.map((p, i) => panel(p, i, spec.names)).join("") + `</svg></figure>`;
}
module.exports = { comic };

// 세로 판단 흐름도: steps = [{cls:"info|safe|warn|acc|", t:"제목", s:"설명"}]
function flow(label, steps) {
  const W = 760, bh = 62, gap = 26; let y = 10, out = "";
  steps.forEach((st, i) => {
    out += `<rect class="bx${st.cls ? " " + st.cls : ""}" x="60" y="${y}" width="${W - 120}" height="${bh}" rx="8"/>` +
      `<text class="tx b" x="${W / 2}" y="${y + 26}" text-anchor="middle">${esc(st.t)}</text>` +
      `<text class="tx s" x="${W / 2}" y="${y + 47}" text-anchor="middle">${esc(st.s || "")}</text>`;
    if (i < steps.length - 1) out += `<path class="ar" d="M${W / 2},${y + bh} V${y + bh + gap - 4}"/><polygon class="ahp" points="${W / 2 - 5},${y + bh + gap - 8} ${W / 2 + 5},${y + bh + gap - 8} ${W / 2},${y + bh + gap - 1}"/>`;
    y += bh + gap;
  });
  return `<div class="tx b" style="font-weight:700;margin:4px 0 6px">판단 흐름도</div><figure class="dgfig"><svg class="dg" style="width:100%;height:auto" viewBox="0 0 ${W} ${y}" role="img" aria-label="${esc(label)}">${out}</svg></figure>`;
}
module.exports.flow = flow;
