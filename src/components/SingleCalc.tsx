import { useMemo, useState } from "react";
import type { ShiftType } from "../types";
import type { UserSettings } from "../utils/settings";
import { calcMonthlySalary } from "../utils/salary";
import { getADayDates, getBDayDates } from "../utils/date";
import { copyText, fmt, num, salaryConfig, WEEKDAY_NAMES } from "../utils/format";
import {
  Card,
  INPUT,
  MoneyTable,
  NetPay,
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
  const [noOtDates, setNoOtDates] = useState<number[]>([]); // 标记"不加班"的 A 班日
  const [bDay8h, setBDay8h] = useState<number[]>([]);
  const [adjustment, setAdjustment] = useState("0");
  const noSocial = settings.noSocial;
  const noTax = settings.noTax;
  const [copied, setCopied] = useState(false);

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
    const adj = num(adjustment, 0);
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

  async function copy() {
    const shiftLabel = r.shiftType === "night" ? "夜班" : "白班";
    await copyText(
      [
        `【${r.year}年${r.month}月 工资明细】`,
        `班次：${shiftLabel} | 工作日 ${r.totalWorkDays} 天 | A班 ${r.aDayCount} | B班 ${r.bDayCount} | F班(节假日) ${r.fDayCount} | 休息${WEEKDAY_NAMES[r.restDayWeekday]} | 不加班 ${r.noOvertimeCount} 天 | 夜班 ${r.nightShiftDays} 天`,
        "",
        `固定薪资：${fmt(r.fixedTotal)}`,
        `A班加班(3h×1.5)：${fmt(r.weekdayOvertime)}`,
        `B班双倍(${r.bDayCount - r.bDay8hCount}×11h ${r.bDay8hCount}×8h)：${fmt(r.tuesdayDoublePay)}`,
        `F班节假日(11h×3)：${fmt(r.holidayExtra)}`,
        `夜班补贴：${fmt(r.nightSubsidy)}`,
        `税前总工资：${fmt(r.grossPay)}`,
        `社保扣款：-${fmt(r.socialInsurance)}`,
        `个税：-${fmt(r.tax)}`,
        `到手工资：${fmt(r.netPay)}`,
      ].join("\n"),
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <Card title="📅 日期与排班">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
            年份
            <input type="number" min={2020} max={2030} value={year} onChange={(e) => setYear(e.target.value)} className={INPUT} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
            月份
            <input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(e.target.value)} className={INPUT} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
            C班(休息日)周几
            <div className={INPUT + " bg-slate-50 dark:bg-slate-900/40 cursor-not-allowed"}>{WEEKDAY_NAMES[restDayWeekday]}</div>
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
            班次
            <select value={shiftType} onChange={(e) => setShiftType(e.target.value as ShiftType)} className={INPUT}>
              <option value="day">白班</option>
              <option value="night">夜班</option>
            </select>
          </label>
        </div>
      </Card>

      <Card title="🚫 不加班 / B班8h">
        <div>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">不加班 — 按周几</h3>
          <div className="flex flex-wrap gap-3">
            {WEEKDAY_NAMES.map((n, i) => (
              <label key={i} className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                <input type="checkbox" checked={noOtWeekdays.includes(i)} onChange={() => setNoOtWeekdays((a) => toggle(a, i))} className="rounded" />
                {n}
              </label>
            ))}
          </div>
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

      <div className="grid grid-cols-1 gap-3">
        <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
          奖励/惩罚（正=奖励，负=惩罚）
          <input
            type="number"
            step="10"
            value={adjustment}
            onChange={(e) => setAdjustment(e.target.value)}
            onBlur={(e) => { if ((e.target as any).value === "") setAdjustment("0"); }}
            className={INPUT}
          />
        </label>
      </div>

      <Card title="📊 计算结果">
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="bg-slate-50 dark:bg-black rounded-lg px-2 py-2 text-center">
              <div className="text-xs text-slate-500 dark:text-slate-400">{s.label}</div>
              <div className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{s.val}</div>
            </div>
          ))}
        </div>
        <MoneyTable
          rows={[
            { label: "固定薪资合计", amount: r.fixedTotal },
            { label: "A班加班(3h×1.5倍)", amount: r.weekdayOvertime, kind: "income" },
            { label: `B班双倍(${r.bDayCount - r.bDay8hCount}×11h ${r.bDay8hCount}×8h)`, amount: r.tuesdayDoublePay, kind: "income" },
            { label: "F班节假日(11h×3倍)", amount: r.holidayExtra, kind: "income" },
            { label: "夜班补贴", amount: r.nightSubsidy, kind: "income" },
            { label: "税前总工资", amount: r.grossPay, kind: "total" },
            { label: "社保扣除", amount: r.socialInsurance, kind: "deduction" },
            { label: "个税", amount: r.tax, kind: "deduction" },
          ]}
        />
        <NetPay amount={r.netPay} />
        <button
          onClick={copy}
          className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 transition-colors"
        >
          {copied ? "✅ 已复制！" : "📋 复制薪资明细"}
        </button>
      </Card>
    </div>
  );
}
