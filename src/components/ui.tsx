import { type ReactNode, useState } from "react";
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
                if (raw === null || raw === undefined) return;
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
    <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 rounded-lg px-4 py-3">
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

/** 不交社保 / 不交个税 开关 */
export function DeductionToggles({
  noSocial,
  noTax,
  onSocial,
  onTax,
}: {
  noSocial: boolean;
  noTax: boolean;
  onSocial: (b: boolean) => void;
  onTax: (b: boolean) => void;
}) {
  return (
    <div className="flex gap-4">
      <Toggle label="不交社保" checked={noSocial} onChange={onSocial} />
      <Toggle label="不交个税" checked={noTax} onChange={onTax} />
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
        onSocial={(b) => onSettings({ ...settings, noSocial: b })}
        onTax={(b) => onSettings({ ...settings, noTax: b })}
      />
    </>
  );
}

/** 高分辨率图片导出：传入行数据 + 到手金额，下载为 PNG */
export function exportSalaryImage(params: {
  title: string;
  rows: { label: string; amount: number; kind?: "income" | "deduction" | "total" }[];
  netPay: number;
}) {
  const { title, rows, netPay } = params;
  const scale = 3;
  const fontFam = '"Inter", "Noto Sans SC", system-ui, sans-serif';
  const pad = 32 * scale;
  const rowH = 28 * scale;
  const col1 = 260 * scale;
  const col2 = 160 * scale;
  const w = col1 + col2 + pad * 2;
  // filter out zero rows
  const visibleRows = rows.filter(r => r.amount !== 0);
  const h = pad + 40 * scale + rowH + rowH * visibleRows.length + rowH + rowH + pad;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // bg
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  let y = pad;
  // title
  ctx.fillStyle = "#0f172a";
  ctx.font = `bold ${18*scale}px ${fontFam}`;
  ctx.textAlign = "left";
  ctx.fillText(title, pad, y);

  // divider
  y += 12 * scale;
  ctx.strokeStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(w - pad, y);
  ctx.stroke();
  y += 16 * scale;

  // table
  const drawRow = (label: string, amount: string, kind?: string) => {
    ctx.font = `${14*scale}px ${fontFam}`;
    ctx.textAlign = "left";
    ctx.fillStyle = kind === "total" ? "#0f172a" : "#475569";
    if (kind === "total") ctx.font = `bold ${14*scale}px ${fontFam}`;
    ctx.fillText(label, pad, y);
    ctx.textAlign = "right";
    if (kind === "income") ctx.fillStyle = "#059669";
    else if (kind === "deduction") ctx.fillStyle = "#e11d48";
    else ctx.fillStyle = "#0f172a";
    if (kind === "total") ctx.font = `bold ${14*scale}px ${fontFam}`;
    ctx.fillText(amount, w - pad, y);
  };

  // alternating bg for rows
  visibleRows.forEach((r, i) => {
    if (i % 2 === 0 && r.kind !== "total") {
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(pad - 4 * scale, y - 18 * scale, w - pad * 2 + 8 * scale, rowH);
    }
    drawRow(r.label, fmt(r.amount), r.kind);
    y += rowH;
  });

  // divider before net
  y += 4 * scale;
  ctx.strokeStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(w - pad, y);
  ctx.stroke();
  y += 12 * scale;

  // net pay highlight
  ctx.fillStyle = "#ecfdf5";
  ctx.fillRect(pad - 4 * scale, y - 18 * scale, w - pad * 2 + 8 * scale, rowH);
  ctx.font = `bold ${16*scale}px ${fontFam}`;
  ctx.textAlign = "left";
  ctx.fillStyle = "#0f172a";
  ctx.fillText("到手工资", pad, y);
  ctx.textAlign = "right";
  ctx.fillStyle = "#059669";
  ctx.fillText(fmt(netPay), w - pad, y);

  canvas.toBlob((b) => {
    if (!b) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `薪资_${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  }, "image/png");
}

/** 导出按钮 */
export function ExportBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
    >
      导出
    </button>
  );
}
