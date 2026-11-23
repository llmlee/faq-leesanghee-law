// 대시보드 HTML 원본의 CARDS 소스에서 특정 카드의 diagram 끝에 마크업을 덧붙이고, 필요하면 id를 바꾼다.
// 사용: node tools/patch-cards.js <in.html> <out.html> <spec.js>
const fs = require("fs"), path = require("path"), { comic } = require("./comic");
const [inp, out, specPath] = process.argv.slice(2);
let src = fs.readFileSync(inp, "utf8");
const specs = require(path.resolve(specPath));
const cardsStart = src.indexOf("const CARDS = ["), cardsEnd = src.indexOf("\nconst CATS", cardsStart);
function findCard(id, match) {
  const re = new RegExp(`["']?id["']?\\s*:\\s*["']${id}["']`, "g"); let m;
  while ((m = re.exec(src))) {
    if (m.index < cardsStart || m.index > cardsEnd) continue;
    const near = src.slice(m.index, m.index + 3000);
    if (!match || near.includes(match)) return m.index;
  }
  throw new Error(`카드를 찾지 못함: ${id} / ${match}`);
}
function diagramLiteralEnd(from) {
  const re = /["']?diagram["']?\s*:\s*/g; re.lastIndex = from; const m = re.exec(src);
  if (!m) throw new Error("diagram 키 없음");
  let i = m.index + m[0].length; const q = src[i];
  if (!["`", '"', "'"].includes(q)) throw new Error("diagram 값이 문자열 리터럴이 아님: " + src.slice(i, i + 30));
  for (let j = i + 1; j < src.length; j++) { if (src[j] === "\\") { j++; continue; } if (src[j] === q) return { end: j, q }; }
  throw new Error("문자열 끝을 찾지 못함");
}
function quoteFor(q, s) {
  if (q === "`") return s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  return s.replace(/\\/g, "\\\\").replace(new RegExp(q, "g"), "\\" + q).replace(/\n/g, "\\n");
}
for (const s of specs) {
  const at = findCard(s.id, s.match);
  // 다음 카드 시작 전의 diagram 이어야 한다
  const nextId = src.slice(at + 10).search(/["']?id["']?\s*:\s*["']/) + at + 10;
  const { end, q } = diagramLiteralEnd(at);
  if (end > nextId) throw new Error(`${s.id}: diagram이 다른 카드에 속함`);
  if (s.panels) { const add = comic(s); src = src.slice(0, end) + quoteFor(q, add) + src.slice(end); }
  if (s.newId) { const idAt = findCard(s.id, s.match); src = src.slice(0, idAt) + src.slice(idAt).replace(s.id, s.newId); }
  console.log("패치:", s.id, s.newId ? "→ " + s.newId : "", s.panels ? "+6컷" : "");
}
fs.writeFileSync(out, src);
