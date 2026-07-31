import { type ReactNode, useState } from "react";
import type { UserSettings } from "../utils/settings";
import { fmt, yuanToCents } from "../utils/format";

export const INPUT =
  "px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:border-sky-500 dark:focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:focus:ring-sky-400 w-full";

/** 白色圆角分区卡片 */
export function Card({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm space-y-3">
      {title && <h2 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h2>}
      {children}
    </section>
  );
}

const SALARY_FIELDS: { key: keyof UserSettings; label: string; step: string }[] =
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
  const Toggle = ({
    label,
    checked,
    onChange,
  }: {
    label: string;
    checked: boolean;
    onChange: (b: boolean) => void;
  }) => (
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
  return (
    <div className="flex gap-4">
      <Toggle label="不交社保" checked={noSocial} onChange={onSocial} />
      <Toggle label="不交个税" checked={noTax} onChange={onTax} />
    </div>
  );
}
