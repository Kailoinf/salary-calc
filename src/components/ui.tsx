import { type ReactNode, useState } from "react";
import dayjs from "dayjs";
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
export function SalaryFields({
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

/** 不交社保 / 不交个税 / 14休1 开关 */
export function DeductionToggles({
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
      <Toggle label="14休1" checked={cEveryOther} onChange={onEveryOther} />
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
export function exportSalaryImage(params: {
  title: string;
  rows: Row[];
  netPay: number;
}) {
  const { title, rows, netPay } = params;
  const scale = 3;
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
    fixed: { text: "固定薪资", color: "#0284c7" },
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
  const h = bannerH + 22 * scale + items.reduce((a, it) => a + (it.kind === "section" ? sectionH : rowH), 0) + 8 * scale + netH + 26 * scale;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  // 白底（否则 PNG 透明）
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  // 顶部渐变横幅
  const grad = ctx.createLinearGradient(0, 0, w, bannerH);
  grad.addColorStop(0, "#1e40af");
  grad.addColorStop(1, "#3b82f6");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, bannerH);
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${18 * scale}px ${fontFam}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(title, pad, bannerH / 2);

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
        ctx.fillRect(pad, y - 18 * scale, w - pad * 2, 36 * scale);
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
  ctx.fillRect(pad, y, w - pad * 2, netH);
  const midY = y + netH / 2;
  ctx.fillStyle = "#065f46";
  ctx.font = `bold ${16 * scale}px ${fontFam}`;
  ctx.textAlign = "left";
  ctx.fillText("到手工资", pad, midY);
  ctx.textAlign = "right";
  ctx.fillStyle = "#059669";
  ctx.font = `bold ${18 * scale}px ${fontFam}`;
  ctx.fillText(fmt(netPay), w - pad, midY);

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
