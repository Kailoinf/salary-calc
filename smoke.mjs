// 端到端冒烟：SSR 渲染 App，核对默认手动算薪的到手工资 = utils 自算值。
import { createServer } from "vite";

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
try {
  // 全部经 vite 加载，保证 React 单实例（否则 hooks 报错）
  const { renderToString } = await vite.ssrLoadModule("react-dom/server.browser");
  const App = (await vite.ssrLoadModule("/src/App.tsx")).default;
  const html = renderToString(App());

  const salary = await vite.ssrLoadModule("/src/utils/salary.ts");
  const { fmt } = await vite.ssrLoadModule("/src/utils/format.ts");

  // 默认手动算薪：72/44/0/0 + 2800/200/150/200，交社保个税
  const hr = salary.calcBaseHourlyRate(280000);
  const fixed = 280000 + 20000 + 15000 + 20000;
  const gross = Math.round(fixed + Math.round(72 * 1.5 * hr) + Math.round(44 * 2 * hr));
  const social = salary.SOCIAL_INSURANCE;
  const tax = salary.calcTax(gross, social);
  const net = Math.round(gross - social - tax);

  const checks = {
    "标题存在": html.includes("工资计算器"),
    "手动tab默认激活": html.includes("工时输入") && html.includes("加班小时(A班×1.5)"),
    "单月tab未渲染": !html.includes("日期与排班"),
    "到手工资正确": html.includes(fmt(net)),
  };

  let ok = true;
  for (const [k, v] of Object.entries(checks)) {
    console.log(`${v ? "✅" : "❌"} ${k}${k.includes("正确") ? ` (期望 ${fmt(net)})` : ""}`);
    if (!v) ok = false;
  }
  console.log(`\nbaseHourly=${hr/100}元/h  gross=${fmt(gross)}  tax=${fmt(tax)}  net=${fmt(net)}`);
  process.exit(ok ? 0 : 1);
} finally {
  await vite.close();
}
