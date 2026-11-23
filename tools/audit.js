// 대시보드 카드 무결성 점검 + 인용 법령 목록(개정 감시용) 생성
// 사용: node tools/audit.js [data/cards.json]
const fs = require("fs");
const cards = JSON.parse(fs.readFileSync(process.argv[2] || "data/cards.json", "utf8"));
const R = { total: cards.length, byCat: {}, dupIds: [], dupTitles: [], opinionNoDiagram: [], opinionNoComic: [], unverified: 0, laws: {} };
const seenId = {}, seenTitle = {};
const LAW_RE = /([가-힣]+(?:법|령|규칙|예규))\s*(?:시행령|시행규칙)?\s*제(\d+)조(?:의(\d+))?/g;
for (const c of cards) {
  R.byCat[c.cat] = (R.byCat[c.cat] || 0) + 1;
  (seenId[c.id] = seenId[c.id] || []).push(c.title.slice(0, 40));
  const t = c.title.replace(/\s+/g, "");
  (seenTitle[t] = seenTitle[t] || []).push(c.id);
  if (c.tier !== "검증됨" && c.tier !== "y") R.unverified++;
  if (c.id.startsWith("O-")) {
    const d = c.diagram || "";
    // 6컷 판정: 6컷 표지가 있는 그림, 또는 패널(.pn)·컷(cut) 6개 이상, 또는 svg 6개 이상
    const panels = Math.max((d.match(/class="pn"/g) || []).length, (d.match(/class="(?:cut|opn-cut)"/g) || []).length, (d.match(/<svg/g) || []).length - 1);
    if (!d) R.opinionNoDiagram.push(c.id);
    else if (!/aria-label="6컷/.test(d) && panels < 6) R.opinionNoComic.push(c.id);
  }
  const text = [c.body, c.refs, (c.tips || []).join(" ")].join(" ").replace(/<[^>]+>/g, " ");
  for (const m of text.matchAll(LAW_RE)) {
    const law = m[1];
    if (law.length < 2 || /^(같은|동|본|위|구|이|해당)/.test(law)) continue;
    (R.laws[law] = R.laws[law] || new Set()).add(c.id);
  }
}
for (const [id, v] of Object.entries(seenId)) if (v.length > 1) R.dupIds.push({ id, n: v.length, titles: v });
for (const [, v] of Object.entries(seenTitle)) if (v.length > 1) R.dupTitles.push(v);
const lawList = Object.entries(R.laws).map(([law, s]) => ({ law, cards: s.size })).sort((a, b) => b.cards - a.cards);
const tiers = {}; cards.forEach(c => tiers[c.tier] = (tiers[c.tier] || 0) + 1);
fs.writeFileSync("data/cited-laws.json", JSON.stringify(lawList, null, 1));
console.log(JSON.stringify({ total: R.total, byCat: R.byCat, tiers, dupIds: R.dupIds, dupTitles: R.dupTitles,
  opinionNoDiagram: R.opinionNoDiagram, opinionNoComic: R.opinionNoComic, citedLaws: lawList.length, top: lawList.slice(0, 15) }, null, 1));
