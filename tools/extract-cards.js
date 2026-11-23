// 대시보드 HTML에서 CARDS 배열을 추출해 data/cards.json 으로 저장한다.
// 사용: node tools/extract-cards.js <dashboard.html> [out.json]
const fs = require("fs");
const vm = require("vm");
const [src, out = "data/cards.json"] = process.argv.slice(2);
if (!src) { console.error("usage: node tools/extract-cards.js <dashboard.html> [out.json]"); process.exit(1); }
const html = fs.readFileSync(src, "utf8");
const start = html.indexOf("const CARDS = [");
const end = html.indexOf("\nconst CATS", start);
if (start < 0 || end < 0) { console.error("CARDS 배열을 찾지 못했습니다."); process.exit(1); }
const code = html.slice(start, end).replace("const CARDS =", "globalThis.CARDS =");
const ctx = {}; vm.createContext(ctx); vm.runInContext(code, ctx, { timeout: 5000 });
fs.writeFileSync(out, JSON.stringify(ctx.CARDS, null, 1));
console.log(`추출 ${ctx.CARDS.length}건 → ${out}`);
