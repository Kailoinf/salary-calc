import { useEffect, useMemo, useRef, useState } from "react";
import type { UserSettings } from "../utils/settings";
import { getPayrollMonth, getWorkDaysInMonth } from "../utils/date";
import {
  calcBaseHourlyRate,
  calcTax,
  SOCIAL_INSURANCE,
} from "../utils/salary";
import { num, yuanToCents } from "../utils/format";
import { Card, Field, INPUT, MoneyTable, NetPay, SmallBtn, exportSalaryImage, type Row } from "./ui";

type HourField = {
  label: string;
  step: string;
  min?: number;
  value: string;
  set: (v: string) => void;
};

export function ManualCalc({
  settings,
  onOpenSettings,
}: {
  settings: UserSettings;
  onOpenSettings: () => void;
}) {
  const [overtime, setOvertime] = useState("72");
  const [bhours, setBhours] = useState("44");
  const [chours, setChours] = useState("0");
  const [fhours, setFhours] = useState("0");
  const [nights, setNights] = useState("0");
  const [adjustment, setAdjustment] = useState("0");
  const [overrideMonth, setOverrideMonth] = useState<{ year: number; month: number } | null>(null);
  const touched = useRef(new Set<string>());

  // 核算月份：默认按发放日规则自动推导（getPayrollMonth），overrideMonth 后手动指定
  const autoMonth = useMemo(() => getPayrollMonth(new Date()), []);
  const ym = overrideMonth ?? autoMonth;

  // 根据核算月份排班自动填充工时；休息日设置变化时重新填充，夜班固定0天
  useEffect(() => {
    const stats = getWorkDaysInMonth(
      ym.year, ym.month,
      settings.restDayWeekday,
      "night", "day",
    );
    setOvertime(String(stats.aDayCount * 3));
    setBhours(String(stats.bDayCount * 11));
    setFhours(String(stats.fDayCount * 11));
    // 14休1：C班隔一个上一个（第一个C班上班），上班次数 = ceil(C班数/2)
    // ponytail: 开启=自动填，关闭=归默认0，避免关开关残留自动工时
    setChours(
      settings.cEveryOther
        ? String(Math.ceil(stats.cDayCount / 2) * 11)
        : "0",
    );
  }, [settings.restDayWeekday, settings.cEveryOther, ym.year, ym.month]);

  const r = useMemo(() => {
    const hr = calcBaseHourlyRate(settings.baseSalary);
    const ot = Math.max(0, num(overtime, 0));
    const bh = Math.max(0, num(bhours, 0));
    const ch = Math.max(0, num(chours, 0));
    const fh = Math.max(0, num(fhours, 0));
    const nd = Math.max(0, num(nights, 0));
    const fixedTotal =
      settings.baseSalary +
      settings.positionSalary +
      settings.attendanceBonus +
      settings.performanceSalary +
      yuanToCents(num(adjustment, 0));
    const otPay = Math.round(ot * 1.5 * hr);
    const bPay = Math.round(bh * 2 * hr);
    const cPay = Math.round(ch * 2 * hr);
    const fPay = Math.round(fh * 3 * hr);
    const nightPay = Math.round(nd * 2000);
    const grossPay = Math.round(fixedTotal + otPay + bPay + cPay + fPay + nightPay);
    const social = settings.noSocial ? 0 : SOCIAL_INSURANCE;
    const tax = settings.noTax ? 0 : calcTax(grossPay, social);
    const netPay = Math.round(grossPay - social - tax);
    return { ot, bh, ch, fh, nd, fixedTotal, otPay, bPay, cPay, fPay, nightPay, grossPay, social, tax, netPay };
  }, [settings, overtime, bhours, chours, fhours, nights, adjustment]);

  const hourFields: HourField[] = [
    { label: "加班小时(A班×1.5)", step: "0.5", min: 0, value: overtime, set: setOvertime },
    { label: "B班小时(×2)", step: "0.5", min: 0, value: bhours, set: setBhours },
    { label: "C班小时(×2)", step: "0.5", min: 0, value: chours, set: setChours },
    { label: "F班小时(×3)", step: "0.5", min: 0, value: fhours, set: setFhours },
    { label: "夜班天数", step: "1", min: 0, value: nights, set: setNights },
    { label: "奖励与惩罚", step: "10", value: adjustment, set: setAdjustment },
  ];

  const rows: Row[] = [
    { label: "基础工资", amount: settings.baseSalary },
    { label: "岗位工资", amount: settings.positionSalary },
    { label: "全勤奖", amount: settings.attendanceBonus },
    { label: "绩效工资", amount: settings.performanceSalary },
    { label: `A班加班(${r.ot}h×1.5)`, amount: r.otPay, kind: "income" },
    { label: `B班(${r.bh}h×2)`, amount: r.bPay, kind: "income" },
    { label: `C班(${r.ch}h×2)`, amount: r.cPay, kind: "income" },
    { label: `F班(${r.fh}h×3)`, amount: r.fPay, kind: "income" },
    { label: `夜班补贴(${r.nd}天)`, amount: r.nightPay, kind: "income" },
    { label: "税前总工资", amount: r.grossPay, kind: "total" },
    { label: "社保扣除", amount: r.social, kind: "deduction" },
    { label: "个税", amount: r.tax, kind: "deduction" },
  ];

  return (
    <div className="space-y-4">
      <Card
        title="工时与奖励"
        action={
          <SmallBtn onClick={onOpenSettings}>设置</SmallBtn>
        }
      >
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-sm text-slate-600 dark:text-slate-400">核算月份</span>
          <input
            type="month"
            value={`${ym.year}-${String(ym.month).padStart(2, "0")}`}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              const [y, m] = v.split("-").map(Number);
              if (y && m) setOverrideMonth({ year: y, month: m });
            }}
            className={INPUT.replace("w-full", "") + " flex-1 min-w-0"}
          />
          <button
            type="button"
            onClick={() => setOverrideMonth(null)}
            className="shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-black text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-black transition-colors"
          >
            自动
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {hourFields.map((f, i) => {
            const key = String(i);
            return (
              <Field key={f.label} label={f.label}>
                <input
                  type="number"
                  min={f.min}
                  step={f.step}
                  value={f.value}
                  onChange={(e) => { f.set(e.target.value); touched.current.add(key); }}
                  onBlur={(e) => {
                    if (touched.current.has(key) && (e.target as HTMLInputElement).value === "") f.set("0");
                  }}
                  onFocus={() => touched.current.add(key)}
                  className={INPUT}
                />
              </Field>
            );
          })}
        </div>
      </Card>

      <Card title="计算结果" action={<SmallBtn onClick={() => exportSalaryImage({
        title: "手动算薪",
        rows,
        netPay: r.netPay,
      })}>导出</SmallBtn>}>
        <MoneyTable rows={rows} />
        <NetPay amount={r.netPay} />
      </Card>
    </div>
  );
}
