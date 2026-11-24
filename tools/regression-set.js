// 대시보드 법률의견서 카드(O-)로 AI 팀 회귀시험 정답지(markdown)를 만든다.
// 사용: node tools/regression-set.js <cards.json> <out.md>
const fs = require("fs");
const [inp, out] = process.argv.slice(2);
const strip = s => String(s || "").replace(/<[^>]+>/g, "").replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const TEAM = f => /부동산등기|상속등기|공탁|임대차/.test(f) ? "부동산·등기" : /상업|법인|상법/.test(f) ? "상업·법인" : /민사집행|민사소송|개인회생/.test(f) ? "집행·소송" : /가족|후견/.test(f) ? "가사·후견" : "기타";
const LAW = /([가-힣]+(?:법|규칙|령))\s*(?:시행령|시행규칙)?\s*제\d+조(?:의\d+)?(?:\s*제\d+항)?(?:\s*제\d+호)?/g;
const cards = JSON.parse(fs.readFileSync(inp, "utf8")).filter(c => c.id.startsWith("O-")).sort((a, b) => b.id.localeCompare(a.id));
const link = c => (String(c.diagram).match(/href="(https:\/\/claude\.ai\/[^"]*artifact\/[^"]+)"/) || [])[1] || "";
let md = `# AI 팀 회귀시험 정답지 — 대시보드 법률의견서 ${cards.length}건\n\n` +
  `만든 날: ${new Date().toISOString().slice(0, 10)} · 출처: 「법률협회지 노하우 대시보드」 cards.json (상담사례 중 법률의견서 카드)\n\n` +
  `## 쓰는 법\n\n1. 지시서를 고친 뒤, 담당 팀 사례를 골라 '의견서 전문'의 Ⅰ 질의 탭(사실관계)만 작성 직원에게 입력한다. 결론·근거는 주지 않는다.\n` +
  `2. 산출물을 아래 '기대 결론'·'필수 근거'·'함정'과 대조해 채점표(AI 직원 재시험 채점표)에 적는다.\n` +
  `3. 모든 사례는 갑·을·○○로 익명화되어 있다. 원문 의견서도 실명 없이 쓰되, 실명이 보이면 시험 입력에서 지운다.\n` +
  `4. 팀 배정은 분야로 추정한 것이다(실제 팀 구성에 맞게 조정).\n\n`;
const byTeam = {};
for (const c of cards) (byTeam[TEAM(c.field)] = byTeam[TEAM(c.field)] || []).push(c);
md += `| 팀(추정) | 사례 수 |\n|---|---|\n` + Object.entries(byTeam).map(([t, a]) => `| ${t} | ${a.length} |`).join("\n") + "\n\n";
for (const [team, arr] of Object.entries(byTeam)) {
  md += `## ${team} 팀\n\n`;
  for (const c of arr) {
    const body = strip(c.body);
    const laws = [...new Set((strip(c.body + " " + (c.tips || []).join(" ")).match(LAW) || []))].slice(0, 8);
    md += `### ${c.id} · ${c.field}\n\n- **쟁점·사안:** ${body.split(/(?<=다\.|요\.)\s/)[0]}\n- **기대 결론:** ${strip(c.title)}\n` +
      `- **필수 근거:** ${laws.length ? laws.join(", ") : "(카드 근거란 참조)"}\n` +
      `- **함정(감점 포인트):**\n${(c.tips || []).map(t => "  - " + strip(t)).join("\n")}\n` +
      `- **의견서 전문(시험 입력은 Ⅰ 질의 탭):** ${link(c) || "링크 없음"}\n\n`;
  }
}
fs.writeFileSync(out, md);
console.log(cards.length, "건", Object.fromEntries(Object.entries(byTeam).map(([k, v]) => [k, v.length])), (md.length / 1024).toFixed(0) + "KB");
