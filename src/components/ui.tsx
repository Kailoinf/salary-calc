import type { ReactNode } from "react";
import type { UserSettings } from "../utils/settings";
import { fmt, yuanToCents } from "../utils/format";

const INPUT =
  "px-2 py-1.5 rounded-md border border-slate-300 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 w-full";

/** 白色圆角分区卡片 */
export function Card({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
      {title && <h2 className="font-semibold text-slate-900">{title}</h2>}
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

/** 4 项薪资构成输入，受控于共享 settings（分↔元），四处同步 */
export function SalaryFields({
  settings,
  onSettings,
}: {
  settings: UserSettings;
  onSettings: (s: UserSettings) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {SALARY_FIELDS.map((f) => (
        <label
          key={f.key}
          className="flex flex-col gap-1 text-sm text-slate-600"
        >
          {f.label}
          <input
            type="number"
            min={0}
            step={f.step}
            value={settings[f.key] / 100}
            onChange={(e) => {
              const raw = e.target.value;
              const v = raw === "" ? 0 : Number(raw);
              if (Number.isFinite(v))
                onSettings({ ...settings, [f.key]: yuanToCents(v) });
            }}
            className={INPUT}
          />
        </label>
      ))}
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
              r.kind === "total" ? "border-y border-slate-200 font-bold" : ""
            }
          >
            <td className="py-1.5 text-slate-700">{r.label}</td>
            <td
              className={
                "py-1.5 text-right tabular-nums " +
                (r.kind === "income"
                  ? "text-emerald-600"
                  : r.kind === "deduction"
                    ? "text-rose-500"
                    : r.kind === "total"
                      ? "text-slate-900"
                      : "text-slate-800")
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
    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
      <span className="font-medium text-emerald-800">{label}</span>
      <span className="text-xl font-bold text-emerald-700 tabular-nums">
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
    <label className="inline-flex items-center gap-1.5 text-sm text-slate-600">
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
