// 새 카드를 기준 카드 앞에 삽입한다.
// 경량 구조(2026-11-24~): node tools/add-cards.js <cards.json> <cards.json> <new-cards.js> <기준id>
// 옛 단일 HTML 구조:       node tools/add-cards.js <in.html> <out.html> <new-cards.js> <기준id>
const fs = require("fs"), path = require("path"), { comic, flow } = require("./comic");
const [inp, out, specPath, anchorId] = process.argv.slice(2);
let src = fs.readFileSync(inp, "utf8");
const cards = require(path.resolve(specPath));
function build(c) {
  const diagram = flow(c.flowLabel, c.flow) + comic(c.comic) +
    `<p style="margin:8px 0 0"><a href="${c.link}" target="_blank" rel="noopener">법률의견서 전문 보기 →</a></p>`;
  return { id: c.id, issue: c.issue, cat: "상담사례", field: c.field, corner: "법률의견서 · 도식과 만화로 보기", author: "이상희",
    title: c.title, body: c.body, tips: c.tips, refs: c.refs, tier: c.tier || "n", diagram };
}
if (inp.endsWith(".json")) {
  const arr = JSON.parse(src);
  for (const c of cards) if (arr.some(x => x.id === c.id)) throw new Error("이미 있는 ID: " + c.id);
  let at = arr.findIndex(x => x.id === anchorId); if (at < 0) at = 0;
  arr.splice(at, 0, ...cards.map(build));
  fs.writeFileSync(out, "[\n" + arr.map(c => JSON.stringify(c)).join(",\n") + "\n]\n");
  console.log("삽입:", cards.map(c => c.id).join(", "), "→", anchorId, "앞 · 총", arr.length, "건");
  process.exit(0);
}
const start = src.indexOf("const CARDS = ["), end = src.indexOf("\nconst CATS", start);
const re = new RegExp(`\\n[ \\t]*\\{\\s*["']?id["']?\\s*:\\s*["']${anchorId}["']`); const m = re.exec(src.slice(start, end));
if (!m) throw new Error("기준 카드 없음: " + anchorId);
const at = start + m.index + 1;
const objs = cards.map(c => {
  if (src.includes(`"${c.id}"`)) throw new Error("이미 있는 ID: " + c.id);
  const diagram = flow(c.flowLabel, c.flow) + comic(c.comic) +
    `<p style="margin:8px 0 0"><a href="${c.link}" target="_blank" rel="noopener">법률의견서 전문 보기 →</a></p>`;
  const o = { id: c.id, issue: c.issue, cat: "상담사례", field: c.field, corner: "법률의견서 · 도식과 만화로 보기", author: "이상희",
    title: c.title, body: c.body, tips: c.tips, refs: c.refs, tier: c.tier || "n", diagram };
  return JSON.stringify(o) + ",\n";
}).join("");
src = src.slice(0, at) + objs + src.slice(at);
fs.writeFileSync(out, src); console.log("삽입:", cards.map(c => c.id).join(", "), "→", anchorId, "앞");
