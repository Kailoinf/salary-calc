import { useMemo, useRef, useState } from "react";
import type { UserSettings } from "../utils/settings";
import {
  calcBaseHourlyRate,
  calcTax,
  SOCIAL_INSURANCE,
} from "../utils/salary";
import { num, salaryConfig } from "../utils/format";
import { Card, DeductionToggles, INPUT, MoneyTable, NetPay, SalaryFields } from "./ui";

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
  const [noSocial, setNoSocial] = useState(false);
  const [noTax, setNoTax] = useState(false);
  const touched = useRef(new Set<string>());

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
      config.performancePay;
    const otPay = Math.round(ot * 1.5 * hr);
    const bPay = Math.round(bh * 2 * hr);
    const fPay = Math.round(fh * 3 * hr);
    const nightPay = Math.round(nd * 2000);
    const grossPay = Math.round(fixedTotal + otPay + bPay + fPay + nightPay);
    const social = noSocial ? 0 : SOCIAL_INSURANCE;
    const tax = noTax ? 0 : calcTax(grossPay, social);
    const netPay = Math.round(grossPay - social - tax);
    return { ot, bh, fh, nd, fixedTotal, otPay, bPay, fPay, nightPay, grossPay, social, tax, netPay };
  }, [settings, overtime, bhours, fhours, nights, noSocial, noTax]);

  const hourFields = [
    { label: "加班小时(A班×1.5)", step: "0.5", value: overtime, set: setOvertime },
    { label: "B班小时(×2)", step: "0.5", value: bhours, set: setBhours },
    { label: "F班小时(×3)", step: "0.5", value: fhours, set: setFhours },
    { label: "夜班天数", step: "1", value: nights, set: setNights },
  ];

  return (
    <div className="space-y-4">
      <Card title="⏱️ 工时输入">
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
      </Card>

      <Card title="💰 基础薪资">
        <SalaryFields settings={settings} onSettings={onSettings} />
        <DeductionToggles
          noSocial={noSocial}
          noTax={noTax}
          onSocial={setNoSocial}
          onTax={setNoTax}
        />
      </Card>

      <Card title="📊 计算结果">
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
