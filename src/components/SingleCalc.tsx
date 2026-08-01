import { useMemo, useState } from "react";
import type { ShiftType } from "../types";
import type { UserSettings } from "../utils/settings";
import { calcMonthlySalary } from "../utils/salary";
import { getADayDates, getBDayDates } from "../utils/date";
import { fmt, num, salaryConfig, WEEKDAY_NAMES, yuanToCents } from "../utils/format";
import {
  Card,
  ExportBtn,
  Field,
  INPUT,
  MoneyTable,
  NetPay,
  WeekdayToggles,
  exportSalaryImage,
} from "./ui";

const toggle = (arr: number[], v: number) =>
  arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

export function SingleCalc({
  settings,
  onSettings,
}: {
  settings: UserSettings;
  onSettings: (s: UserSettings) => void;
}) {
  const [year, setYear] = useState("2026");
  const [month, setMonth] = useState("7");
  const restDayWeekday = settings.restDayWeekday;
  const [shiftType, setShiftType] = useState<ShiftType>("day");
  const [noOtWeekdays, setNoOtWeekdays] = useState<number[]>([]);
  const [noOtDates, setNoOtDates] = useState<number[]>([]);
  const [bDay8h, setBDay8h] = useState<number[]>([]);
  const [adjustment, setAdjustment] = useState("0");
  const noSocial = settings.noSocial;
  const noTax = settings.noTax;

  const y = num(year, 2026);
  const m = num(month, 7);

  const { aDays, bDays } = useMemo(
    () => ({
      aDays: getADayDates(y, m, restDayWeekday),
      bDays: getBDayDates(y, m, restDayWeekday),
    }),
    [y, m, restDayWeekday],
  );

  const r = useMemo(() => {
    const prevShiftType: ShiftType = shiftType === "night" ? "day" : "night";
    const adj = yuanToCents(num(adjustment, 0));
    return calcMonthlySalary({
      year: y,
      month: m,
      restDayWeekday,
      shiftType,
      prevShiftType,
      bDay8hDates: bDay8h,
      noOvertimeDates: noOtDates,
      noOvertimeWeekdays: noOtWeekdays,
      config: { ...salaryConfig(settings), adjustment: adj },
      noSocial,
      noTax,
    });
  }, [y, m, restDayWeekday, shiftType, bDay8h, noOtDates, noOtWeekdays, settings, adjustment, noSocial, noTax]);

  const stats: { label: string; val: string | number }[] = [
    { label: "工作日", val: r.totalWorkDays },
    { label: "A班", val: r.aDayCount },
    { label: "B班", val: r.bDayCount },
    { label: "B班8h", val: r.bDay8hCount },
    { label: "F班(节假日)", val: r.fDayCount },
    { label: "休息", val: WEEKDAY_NAMES[r.restDayWeekday] },
    { label: "不加班", val: r.noOvertimeCount },
    { label: "白班", val: r.totalWorkDays - r.nightShiftDays },
    { label: "夜班", val: r.nightShiftDays },
    { label: "班次", val: r.shiftType === "night" ? "夜班" : "白班" },
  ];

  const cfg = salaryConfig(settings);
  const imgRows = [
    { label: "基础工资", amount: cfg.baseSalary },
    { label: "岗位工资", amount: cfg.positionPay },
    { label: "全勤奖", amount: cfg.fullAttendanceBonus },
    { label: "绩效工资", amount: cfg.performancePay },
    { label: `A班加班(${(r.aDayCount - r.noOvertimeCount) * 3}h×1.5)`, amount: r.weekdayOvertime, kind: "income" as const },
    { label: `B班双倍(${r.bDayCount - r.bDay8hCount}×11h ${r.bDay8hCount}×8h)`, amount: r.tuesdayDoublePay, kind: "income" as const },
    { label: `F班节假日(${r.fDayCount * 11}h×3)`, amount: r.holidayExtra, kind: "income" as const },
    { label: "夜班补贴", amount: r.nightSubsidy, kind: "income" as const },
    { label: "税前总工资", amount: r.grossPay, kind: "total" as const },
    { label: "社保扣除", amount: r.socialInsurance, kind: "deduction" as const },
    { label: "个税", amount: r.tax, kind: "deduction" as const },
  ];

  return (
    <div className="space-y-4">
      <Card title="日期与排班">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="年份">
            <input type="number" min={2020} max={2030} value={year} onChange={(e) => { setYear(e.target.value); setNoOtDates([]); setBDay8h([]); }} className={INPUT} />
          </Field>
          <Field label="月份">
            <input type="number" min={1} max={12} value={month} onChange={(e) => { setMonth(e.target.value); setNoOtDates([]); setBDay8h([]); }} className={INPUT} />
          </Field>
          <Field label="班次">
            <select value={shiftType} onChange={(e) => setShiftType(e.target.value as ShiftType)} className={INPUT}>
              <option value="day">白班</option>
              <option value="night">夜班</option>
            </select>
          </Field>
        </div>
        <Field label="奖励与惩罚" className="pt-3">
          <input
            type="number"
            step="10"
            value={adjustment}
            onChange={(e) => setAdjustment(e.target.value)}
            onBlur={(e) => { if ((e.target as any).value === "") setAdjustment("0"); }}
            className={INPUT}
          />
        </Field>
      </Card>

      <Card title="不加班 / B班8h">
        <div>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">不加班 — 按周几（仅对A班日生效）</h3>
          <WeekdayToggles selected={noOtWeekdays} onChange={setNoOtWeekdays} />
        </div>
        <div>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">不加班 — 按日期（取消勾选=不加班）</h3>
          {aDays.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">本月无 A 班日。</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {aDays.map((d) => {
                const date = d.date();
                const overtime = !noOtDates.includes(date);
                return (
                  <label key={date} className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={overtime}
                      onChange={() =>
                        setNoOtDates((a) => (overtime ? a.filter((x) => x !== date) : [...a, date]))
                      }
                      className="rounded"
                    />
                    {date}日({WEEKDAY_NAMES[d.day()]})
                  </label>
                );
              })}
            </div>
          )}
        </div>
        <div>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">B班仅8h（默认11h）</h3>
          {bDays.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">本月无 B 班日。</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {bDays.map((d) => {
                const date = d.date();
                return (
                  <label key={date} className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                    <input type="checkbox" checked={bDay8h.includes(date)} onChange={() => setBDay8h((a) => toggle(a, date))} className="rounded" />
                    {date}日({WEEKDAY_NAMES[d.day()]})
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      <Card title="计算结果" action={<ExportBtn onClick={() => exportSalaryImage({
        title: `${r.year}年${r.month}月 工资明细`,
        rows: imgRows,
        netPay: r.netPay,
      })} />}>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="bg-slate-50 dark:bg-black rounded-lg px-2 py-2 text-center">
              <div className="text-xs text-slate-500 dark:text-slate-400">{s.label}</div>
              <div className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{s.val}</div>
            </div>
          ))}
        </div>
        <MoneyTable rows={imgRows} />
        <NetPay amount={r.netPay} />
      </Card>
    </div>
  );
}
