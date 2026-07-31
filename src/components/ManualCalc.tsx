import { useEffect, useMemo, useRef, useState } from "react";
import type { UserSettings } from "../utils/settings";
import type { ShiftType } from "../types";
import {
  calcBaseHourlyRate,
  calcMonthlySalary,
  calcTax,
  SOCIAL_INSURANCE,
} from "../utils/salary";
import { num, salaryConfig } from "../utils/format";
import { Card, INPUT, MoneyTable, NetPay } from "./ui";

export function ManualCalc({
  settings,
  onSettings,
}: {
  settings: UserSettings;
  onSettings: (s: UserSettings) => void;
}) {
  const [overtime, setOvertime] = useState("72");
  const [bhours, setBhours] = useState("44");
  const [fhours, setFhours] = useState("0");
  const [nights, setNights] = useState("0");
  const [adjustment, setAdjustment] = useState("0");
  const touched = useRef(new Set<string>());

  // 首次打开根据当月排班自动填充工时，夜班固定0天
  useEffect(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const prevShift: ShiftType = "night";
    const result = calcMonthlySalary({
      year: y, month: m,
      restDayWeekday: settings.restDayWeekday,
      shiftType: "day",
      prevShiftType: prevShift,
      bDay8hDates: [],
      noOvertimeDates: [],
      noOvertimeWeekdays: [],
      config: salaryConfig(settings),
      noSocial: settings.noSocial,
      noTax: settings.noTax,
    });
    setOvertime(String(result.aDayCount * 3));
    setBhours(String(result.bDayCount * 11));
    setFhours(String(result.fDayCount * 11));
    // ponytail: 夜班固定0，不根据当月排班计算
  }, []);

  const r = useMemo(() => {
    const config = salaryConfig(settings);
    const hr = calcBaseHourlyRate(config.baseSalary);
    const ot = Math.max(0, num(overtime, 0));
    const bh = Math.max(0, num(bhours, 0));
    const fh = Math.max(0, num(fhours, 0));
    const nd = Math.max(0, num(nights, 0));
    const fixedTotal =
      config.baseSalary +
      config.positionPay +
      config.fullAttendanceBonus +
      config.performancePay +
      num(adjustment, 0);
    const otPay = Math.round(ot * 1.5 * hr);
    const bPay = Math.round(bh * 2 * hr);
    const fPay = Math.round(fh * 3 * hr);
    const nightPay = Math.round(nd * 2000);
    const grossPay = Math.round(fixedTotal + otPay + bPay + fPay + nightPay);
    const social = settings.noSocial ? 0 : SOCIAL_INSURANCE;
    const tax = settings.noTax ? 0 : calcTax(grossPay, social);
    const netPay = Math.round(grossPay - social - tax);
    return { ot, bh, fh, nd, fixedTotal, otPay, bPay, fPay, nightPay, grossPay, social, tax, netPay };
  }, [settings, overtime, bhours, fhours, nights, adjustment]);

  const hourFields = [
    { label: "加班小时(A班×1.5)", step: "0.5", value: overtime, set: setOvertime },
    { label: "B班小时(×2)", step: "0.5", value: bhours, set: setBhours },
    { label: "F班小时(×3)", step: "0.5", value: fhours, set: setFhours },
    { label: "夜班天数", step: "1", value: nights, set: setNights },
  ];

  return (
    <div className="space-y-4">
      <Card title="工时与奖励">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {hourFields.map((f, i) => {
            const key = String(i);
            return (
              <label key={f.label} className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
                {f.label}
                <input
                  type="number"
                  min={0}
                  step={f.step}
                  value={f.value}
                  onChange={(e) => { f.set(e.target.value); touched.current.add(key); }}
                  onBlur={(e) => {
                    if (touched.current.has(key) && (e.target as any).value === "") f.set("0");
                  }}
                  onFocus={() => touched.current.add(key)}
                  className={INPUT}
                />
              </label>
            );
          })}
        </div>
        <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400 pt-3">
          奖励与惩罚
          <input
            type="number"
            step="10"
            value={adjustment}
            onChange={(e) => { setAdjustment(e.target.value); touched.current.add("adj"); }}
            onBlur={(e) => {
              if (touched.current.has("adj") && (e.target as any).value === "") setAdjustment("0");
            }}
            onFocus={() => touched.current.add("adj")}
            className={INPUT}
          />
        </label>
      </Card>

      <Card title="计算结果">
        <MoneyTable
          rows={[
            { label: "固定薪资合计", amount: r.fixedTotal },
            { label: `A班加班(${r.ot}h×1.5)`, amount: r.otPay, kind: "income" },
            { label: `B班(${r.bh}h×2)`, amount: r.bPay, kind: "income" },
            { label: `F班(${r.fh}h×3)`, amount: r.fPay, kind: "income" },
            { label: `夜班补贴(${r.nd}天)`, amount: r.nightPay, kind: "income" },
            { label: "税前总工资", amount: r.grossPay, kind: "total" },
            { label: "社保扣除", amount: r.social, kind: "deduction" },
            { label: "个税", amount: r.tax, kind: "deduction" },
          ]}
        />
        <NetPay amount={r.netPay} />
      </Card>
    </div>
  );
}
