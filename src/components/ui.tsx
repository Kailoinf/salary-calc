import { type ReactNode, useState } from "react";
import dayjs from "dayjs";
import { UAParser } from "ua-parser-js";
import QRCode from "qrcode";
import type { UserSettings } from "../utils/settings";
import { fmt, WEEKDAY_NAMES, yuanToCents } from "../utils/format";

export const INPUT =
  "px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-black text-sm focus:border-sky-500 dark:focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:focus:ring-sky-400 w-full";

/** 白色圆角分区卡片，可带右上角操作按钮 */
export function Card({
  title,
  action,
  children,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm dark:shadow-none space-y-3">
      {title && (
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const SALARY_FIELDS: { key: "baseSalary" | "positionSalary" | "attendanceBonus" | "performanceSalary"; label: string; step: string }[] =
  [
    { key: "baseSalary", label: "基础工资", step: "100" },
    { key: "positionSalary", label: "岗位工资", step: "10" },
    { key: "attendanceBonus", label: "全勤奖", step: "10" },
    { key: "performanceSalary", label: "绩效工资", step: "10" },
  ];

/** 4 项薪资构成输入，焦点时本地编辑不干扰，失焦提交到 settings */
function SalaryFields({
  settings,
  onSettings,
}: {
  settings: UserSettings;
  onSettings: (s: UserSettings) => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, string | null>>({});

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {SALARY_FIELDS.map((f) => {
        const draft = drafts[f.key];
        const display = draft !== null && draft !== undefined ? draft : String(settings[f.key] / 100);
        return (
          <label
            key={f.key}
            className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400"
          >
            {f.label}
            <input
              type="number"
              min={0}
              step={f.step}
              value={display}
              onFocus={() => setDrafts((prev) => ({ ...prev, [f.key]: String(settings[f.key] / 100) }))}
              onChange={(e) => setDrafts((prev) => ({ ...prev, [f.key]: e.target.value }))}
              onBlur={() => {
                const raw = drafts[f.key];
                if (raw === null || raw === undefined || raw === "") return;
                const v = Number(raw);
                if (Number.isFinite(v) && v >= 0)
                  onSettings({ ...settings, [f.key]: yuanToCents(v) });
                setDrafts((prev) => ({ ...prev, [f.key]: null }));
              }}
              className={INPUT}
            />
          </label>
        );
      })}
    </div>
  );
}

export type Row = {
  label: string;
  amount: number;
  kind?: "income" | "deduction" | "total";
};

/** 收支明细表：income 绿、deduction 红(带 -)、total 加粗 */
export function MoneyTable({ rows }: { rows: Row[] }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map((r) => (
          <tr
            key={r.label}
            className={
              r.kind === "total" ? "border-y border-slate-200 dark:border-slate-700 font-bold" : ""
            }
          >
            <td className="py-1.5 text-slate-700 dark:text-slate-300">{r.label}</td>
            <td
              className={
                "py-1.5 text-right tabular-nums " +
                (r.kind === "income"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : r.kind === "deduction"
                    ? "text-rose-500 dark:text-rose-400"
                    : r.kind === "total"
                      ? "text-slate-900 dark:text-slate-100"
                      : "text-slate-800 dark:text-slate-200")
              }
            >
              {r.kind === "deduction" ? "-" : ""}
              {fmt(r.amount)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** 到手工资高亮框 */
export function NetPay({
  label = "到手工资",
  amount,
}: {
  label?: string;
  amount: number;
}) {
  return (
    <div className="flex items-center justify-between bg-emerald-50 dark:bg-black border border-emerald-200 dark:border-emerald-900 rounded-lg px-4 py-3">
      <span className="font-medium text-emerald-800 dark:text-emerald-300">{label}</span>
      <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
        {fmt(amount)}
      </span>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (b: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded"
      />
      {label}
    </label>
  );
}

/** 不交社保 / 不交个税 / 上13休1 开关 */
function DeductionToggles({
  noSocial,
  noTax,
  cEveryOther,
  onSocial,
  onTax,
  onEveryOther,
}: {
  noSocial: boolean;
  noTax: boolean;
  cEveryOther: boolean;
  onSocial: (b: boolean) => void;
  onTax: (b: boolean) => void;
  onEveryOther: (b: boolean) => void;
}) {
  return (
    <div className="flex gap-4">
      <Toggle label="不交社保" checked={noSocial} onChange={onSocial} />
      <Toggle label="不交个税" checked={noTax} onChange={onTax} />
      <Toggle label="上13休1" checked={cEveryOther} onChange={onEveryOther} />
    </div>
  );
}

/** 通用输入字段：label + 任意 input/select 子元素 */
export function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={"flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400" + (className ? " " + className : "")}>
      {label}
      {children}
    </label>
  );
}

/** 全局设置字段组：薪资构成 + C班休息日 + 社保/个税开关（设置页与欢迎弹窗共用） */
export function GlobalSettingsFields({
  settings,
  onSettings,
}: {
  settings: UserSettings;
  onSettings: (s: UserSettings) => void;
}) {
  return (
    <>
      <SalaryFields settings={settings} onSettings={onSettings} />
      <Field label="C班休息日">
        <select
          value={settings.restDayWeekday}
          onChange={(e) => onSettings({ ...settings, restDayWeekday: Number(e.target.value) })}
          className={INPUT}
        >
          {WEEKDAY_NAMES.map((n, i) => (<option key={i} value={i}>{n}</option>))}
        </select>
      </Field>
      <DeductionToggles
        noSocial={settings.noSocial}
        noTax={settings.noTax}
        cEveryOther={settings.cEveryOther}
        onSocial={(b) => onSettings({ ...settings, noSocial: b })}
        onTax={(b) => onSettings({ ...settings, noTax: b })}
        onEveryOther={(b) => onSettings({ ...settings, cEveryOther: b })}
      />
    </>
  );
}

/** 高分辨率图片导出：传入行数据 + 到手金额，下载为 PNG */
export async function exportSalaryImage(params: {
  title: string;
  rows: Row[];
  netPay: number;
  shareUrl?: string;
}) {
  const { title, rows, netPay, shareUrl } = params;
  const scale = 5;
  const fontFam = '"Inter", "Noto Sans SC", system-ui, sans-serif';
  const pad = 32 * scale;
  const rowH = 28 * scale;
  const col1 = 300 * scale;
  const col2 = 180 * scale;
  const w = col1 + col2 + pad * 2;
  const visible = rows.filter(r => r.amount !== 0);

  // 分组块：按 kind 切分区，标题插在每区首行前（total 行跟随上一块不另起）
  type Item =
    | { kind: "section"; text: string; color: string }
    | { kind: "row"; label: string; amount: number; k?: string };
  const items: Item[] = [];
  const secMeta: Record<string, { text: string; color: string }> = {
    fixed: { text: "薪资构成", color: "#0284c7" },
    income: { text: "加班与补贴", color: "#059669" },
    deduction: { text: "扣款", color: "#e11d48" },
  };
  let lastGrp = "";
  for (const r of visible) {
    // total 行(税前)跟随上一分区，不触发新分区标题
    if (r.kind === "total") {
      items.push({ kind: "row", label: r.label, amount: r.amount, k: r.kind });
      continue;
    }
    const grp = r.kind === "income" ? "income" : r.kind === "deduction" ? "deduction" : "fixed";
    if (grp !== lastGrp) { items.push({ kind: "section", ...secMeta[grp] }); lastGrp = grp; }
    items.push({ kind: "row", label: r.label, amount: r.amount, k: r.kind });
  }

  const bannerH = 28 * scale;
  const sectionH = 36 * scale;
  const netH = 50 * scale;
  const disclaimH = 30 * scale;
  const footerH = 130 * scale; // 底部「软件链接+邮箱+二维码」区
  const h = bannerH + 22 * scale + items.reduce((a, it) => a + (it.kind === "section" ? sectionH : rowH), 0) + 8 * scale + netH + disclaimH + footerH + 16 * scale;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  // 白底（否则 PNG 透明）
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  // 顶部色带横幅：主蓝 #0028AA 拉长(占多数)，后 4 块等分(每块相等宽度)，无渐变
  const bannerColors = ["#0028AA", "#015286", "#027B62", "#03A53D", "#04CE19"];
  const mainSeg = w * 0.55; // 主色块拉长
  const restSeg = (w - mainSeg) / (bannerColors.length - 1); // 后4块等分
  ctx.fillStyle = bannerColors[0];
  ctx.fillRect(0, 0, mainSeg, bannerH);
  for (let i = 1; i < bannerColors.length; i++) {
    ctx.fillStyle = bannerColors[i];
    ctx.fillRect(mainSeg + (i - 1) * restSeg, 0, restSeg, bannerH);
  }
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${18 * scale}px ${fontFam}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(title, 24 * scale, bannerH / 2);

  let y = bannerH + 22 * scale;
  ctx.textBaseline = "middle";

  for (const it of items) {
    if (it.kind === "section") {
      ctx.fillStyle = it.color;
      ctx.fillRect(pad, y - 10 * scale, 4 * scale, 20 * scale);
      ctx.fillStyle = "#334155";
      ctx.font = `bold ${13 * scale}px ${fontFam}`;
      ctx.textAlign = "left";
      ctx.fillText(it.text, pad + 13 * scale, y);
      y += sectionH;
    } else {
      const emph = it.k === "total";
      if (emph) {
        ctx.fillStyle = "#f1f5f9";
        ctx.fillRect(pad - 10 * scale, y - 18 * scale, w - pad * 2 + 20 * scale, 36 * scale);
      }
      ctx.fillStyle = emph ? "#0f172a" : "#475569";
      ctx.font = `${emph ? "bold " : ""}${14 * scale}px ${fontFam}`;
      ctx.textAlign = "left";
      ctx.fillText(it.label, pad, y);
      const amt = it.k === "deduction" ? "-" + fmt(it.amount) : fmt(it.amount);
      ctx.textAlign = "right";
      ctx.fillStyle = it.k === "deduction" ? "#e11d48" : it.k === "income" ? "#059669" : "#0f172a";
      ctx.font = `${emph ? "bold " : ""}${14 * scale}px ${fontFam}`;
      ctx.fillText(amt, w - pad, y);
      y += rowH;
    }
  }

  // 到手工资高亮
  y += 8 * scale;
  ctx.fillStyle = "#ecfdf5";
  ctx.fillRect(pad - 10 * scale, y, w - pad * 2 + 20 * scale, netH);
  const midY = y + netH / 2;
  ctx.fillStyle = "#065f46";
  ctx.font = `bold ${16 * scale}px ${fontFam}`;
  ctx.textAlign = "left";
  ctx.fillText("到手工资", pad, midY);
  ctx.textAlign = "right";
  ctx.fillStyle = "#059669";
  ctx.font = `bold ${18 * scale}px ${fontFam}`;
  ctx.fillText(fmt(netPay), w - pad, midY);

  // 免责声明（精简版，小字、低调但清晰）
  const disY = y + netH + disclaimH / 2;
  ctx.fillStyle = "#64748b";
  ctx.font = `${10 * scale}px ${fontFam}`;
  ctx.textAlign = "center";
  ctx.fillText("以上数据由用户录入，结果仅供参考。", w / 2, disY);

  // 底部「软件链接 + 邮箱 + 二维码」区：左=链接+邮箱，右=小标题「扫码计算薪资」+ 上方二维码
  if (shareUrl) {
    const fy = y + netH + disclaimH; // footer 区顶
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = Math.max(1, 1 * scale);
    ctx.beginPath();
    ctx.moveTo(pad, fy);
    ctx.lineTo(w - pad, fy);
    ctx.stroke();
    const qSize = 70 * scale; // 二维码调小
    const qx = w - pad - qSize;
    const labelH = 22 * scale; // 标题「扫码计算薪资」占高
    const qy = fy + 16 * scale + labelH; // 标题下方再放二维码
    const qcx = qx + qSize / 2; // 二维码中轴线
    // 右侧：标题居中于二维码中轴线上方（文字 + 二维码垂直对齐成整体）
    ctx.textAlign = "center";
    ctx.fillStyle = "#334155";
    ctx.font = `${11 * scale}px ${fontFam}`; // 缩小，让标题宽度不超过二维码
    ctx.fillText("扫码计算薪资", qcx, fy + 16 * scale + labelH / 2);
    // 二维码块：先白底占位，实际码异步画入
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(qx, qy, qSize, qSize);
    ctx.strokeStyle = "#e2e8f0";
    ctx.strokeRect(qx, qy, qSize, qSize);
    // 左侧：软件链接 + 邮箱（垂直居中）——必须重置 textAlign，否则继承上面的 center 会偏出左边缘
    const midY = fy + footerH / 2 - 4 * scale;
    ctx.textAlign = "left";
    ctx.fillStyle = "#0284c7";
    ctx.font = `${13 * scale}px ${fontFam}`;
    ctx.fillText("https://salary.gkux.cn", pad, midY - 18 * scale);
    ctx.fillStyle = "#64748b";
    ctx.font = `${12 * scale}px ${fontFam}`;
    ctx.fillText("gaoxuejun@wuit.edu.cn", pad, midY + 18 * scale);
    // 保持引用避免 ts unused（实际二维码在下方 await 后画入）
  }

  // 导出水印：设备信息 + 导出时间，淡色小字斜排平铺
  const ua = new UAParser(navigator.userAgent).getResult();
  const devicePart = [ua.device?.model, ua.os?.name, ua.os?.version].filter(Boolean).join(" · ");
  const ts = dayjs().format("YYYY-MM-DD HH:mm");
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate((-22 * Math.PI) / 180);
  ctx.fillStyle = "rgba(100, 116, 139, 0.18)";
  ctx.font = `${11 * scale}px ${fontFam}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const stepX = 320 * scale;
  const stepY = 150 * scale;
  for (let row = 0; row < Math.ceil(h / stepY) + 2; row++) {
    for (let col = 0; col < Math.ceil(w / stepX) + 2; col++) {
      const x = (col - Math.floor((w / stepX) / 2) - 1) * stepX;
      const y2 = (row - Math.floor((h / stepY) / 2)) * stepY;
      if (devicePart) ctx.fillText(devicePart, x, y2 - 12 * scale);
      ctx.fillText(ts, x, y2 + 12 * scale);
    }
  }
  ctx.restore();

  // 异步画二维码到占位块（shareUrl 存在时）
  if (shareUrl) {
    const qSize = 70 * scale;
    const fy = y + netH + disclaimH;
    const labelH = 22 * scale;
    const qx = w - pad - qSize;
    const qy = fy + 16 * scale + labelH;
    const qCanvas = document.createElement("canvas");
    qCanvas.width = qSize;
    qCanvas.height = qSize;
    try {
      await QRCode.toCanvas(qCanvas, shareUrl, {
        width: qSize,
        margin: 1,
        errorCorrectionLevel: "L",
      });
      ctx.drawImage(qCanvas, qx, qy, qSize, qSize);
    } catch {
      /* 生成失败则保留占位空块 */
    }
  }

  canvas.toBlob((b) => {
    if (!b) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `薪资_${dayjs().format("YYYY-MM-DD")}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, "image/png");
}

/** 卡片右上角小按钮（设置/导出） */
export function SmallBtn({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-black transition-colors"
    >
      {children}
    </button>
  );
}
