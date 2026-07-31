import { useMemo, useState } from "react";
import type { ShiftType } from "../types";
import type { UserSettings } from "../utils/settings";
import { calcMultiMonth } from "../utils/salary";
import { fmt, salaryConfig, WEEKDAY_NAMES } from "../utils/format";
import { Card, ExportBtn, INPUT, exportSalaryImage } from "./ui";

interface YearMonth {
  year: number;
  month: number;
}

function parseYM(s: string, fy: number, fm: number): YearMonth {
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  return m ? { year: Number(m[1]), month: Number(m[2]) } : { year: fy, month: fm };
}

const ymKey = (y: number, m: number) => `${y}-${m}`;

/** 枚举 start→end（含）所有月份；end 早于 start 时返回空数组 */
function enumerateMonths(start: YearMonth, end: YearMonth): YearMonth[] {
  const out: YearMonth[] = [];
  let { year: y, month: m } = start;
  let guard = 0;
  while ((y < end.year || (y === end.year && m <= end.month)) && guard < 600) {
    out.push({ year: y, month: m });
    if (++m > 12) {
      m = 1;
      y++;
    }
    guard++;
  }
  return out;
}

const PAGE_SIZE = 6;

export function MultiCalc({
  settings,
  onSettings,
}: {
  settings: UserSettings;
  onSettings: (s: UserSettings) => void;
}) {
  const [start, setStart] = useState("2026-01");
  const [end, setEnd] = useState("2026-12");
  const [restdayMode, setRestdayMode] = useState<"uniform" | "individual">("uniform");
  const restdayUniform = settings.restDayWeekday;
  const [restdayInd, setRestdayInd] = useState<Record<string, number>>({});
  const [shiftMode, setShiftMode] = useState<"flip" | "individual">("flip");
  const [shiftFlipFirst, setShiftFlipFirst] = useState<ShiftType>("day");
  const [shiftInd, setShiftInd] = useState<Record<string, ShiftType>>({});
  const [noOtWeekdays, setNoOtWeekdays] = useState<number[]>([]);
  const noSocial = settings.noSocial;
  const noTax = settings.noTax;
  const [page, setPage] = useState(0);

  const s = parseYM(start, 2026, 1);
  const e = parseYM(end, 2026, 12);
  const months = useMemo(() => enumerateMonths(s, e), [s.year, s.month, e.year, e.month]);

  const summary = useMemo(() => {
    const restDayWeekday: number | number[] =
      restdayMode === "uniform"
        ? restdayUniform
        : months.map((mm) => restdayInd[ymKey(mm.year, mm.month)] ?? restdayUniform);
    const shiftType: ShiftType | ShiftType[] =
      shiftMode === "flip"
        ? shiftFlipFirst
        : months.map((mm) => shiftInd[ymKey(mm.year, mm.month)] ?? "day");
    return calcMultiMonth(
      s.year, s.month, e.year, e.month,
      salaryConfig(settings),
      restDayWeekday,
      shiftType,
      [],          // 多月无 B班8h 配置
      noOtWeekdays,
      [],          // 多月无"按日期"不加班
      noSocial,
      noTax,
    );
  }, [s.year, s.month, e.year, e.month, restdayMode, restdayUniform, restdayInd, shiftMode, shiftFlipFirst, shiftInd, noOtWeekdays, settings, noSocial, noTax, months]);

  const pageCount = Math.max(1, Math.ceil(summary.results.length / PAGE_SIZE));
  const cur = page < pageCount ? page : 0;
  const pageItems = summary.results.slice(cur * PAGE_SIZE, cur * PAGE_SIZE + PAGE_SIZE);

  const summaryItems: { label: string; amount: number; kind?: "income" | "deduction"; big?: boolean }[] = [
    { label: "总税前", amount: summary.totalGross },
    { label: "总社保", amount: summary.totalSocial, kind: "deduction" },
    { label: "总个税", amount: summary.totalTax, kind: "deduction" },
    { label: "总到手", amount: summary.totalNet, kind: "income" },
    { label: "月均到手", amount: summary.averageNet, kind: "income", big: true },
  ];

  function saveImage() {
    const rows = summary.results.map(r => ({
      label: `${r.year}/${String(r.month).padStart(2,"0")}`,
      data: [String(r.totalWorkDays), String(r.aDayCount), String(r.bDayCount), String(r.fDayCount), r.shiftType==="night"?"夜班":"白班", fmt(r.grossPay), "-"+fmt(r.socialInsurance), "-"+fmt(r.tax), fmt(r.netPay)]
    }));
    exportSalaryImage({
      title: `${s.year}年${s.month}月 — ${e.year}年${e.month}月 工资汇总`,
      rows: [
        ...summary.results.map(r => ({ label: `${r.year}/${String(r.month).padStart(2,"0")}  税前${fmt(r.grossPay)}  到手${fmt(r.netPay)}`, amount: r.grossPay })),
        { label: "总税前", amount: summary.totalGross, kind: "total" as const },
        { label: "总社保", amount: summary.totalSocial, kind: "deduction" as const },
        { label: "总个税", amount: summary.totalTax, kind: "deduction" as const },
        { label: "总到手", amount: summary.totalNet, kind: "income" as const },
        { label: "月均到手", amount: summary.averageNet, kind: "income" as const },
      ],
      netPay: summary.totalNet,
    });
  }

  return (
    <div className="space-y-4">
      <Card title="日期区间">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
            起始年月
            <input type="month" value={start} onChange={(e) => setStart(e.target.value)} className={INPUT + " w-auto"} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
            结束年月
            <input type="month" value={end} onChange={(e) => setEnd(e.target.value)} className={INPUT + " w-auto"} />
          </label>
        </div>
      </Card>

      <Card title="排班配置">
        <div className="space-y-2">
          <label className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
            <input type="radio" checked={restdayMode === "uniform"} onChange={() => setRestdayMode("uniform")} />
            所有月份统一
          </label>
          <label className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
            <input type="radio" checked={restdayMode === "individual"} onChange={() => setRestdayMode("individual")} />
            每月单独编辑
          </label>
        </div>
        {restdayMode === "uniform" ? (
          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400 sm:w-48">
            C班(休息日)周几
            <div className={INPUT + " bg-slate-50 dark:bg-slate-900/40 cursor-not-allowed"}>{WEEKDAY_NAMES[restdayUniform]}</div>
            <span className="text-xs text-slate-400 dark:text-slate-500">（在「设置」中统一调整）</span>
          </label>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {months.map((mm) => (
              <label key={ymKey(mm.year, mm.month)} className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-400">
                {mm.year}年{mm.month}月
                <select
                  value={restdayInd[ymKey(mm.year, mm.month)] ?? restdayUniform}
                  onChange={(e) => setRestdayInd((a) => ({ ...a, [ymKey(mm.year, mm.month)]: Number(e.target.value) }))}
                  className={INPUT}
                >
                  {WEEKDAY_NAMES.map((n, i) => (<option key={i} value={i}>{n}</option>))}
                </select>
              </label>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <label className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
            <input type="radio" checked={shiftMode === "flip"} onChange={() => setShiftMode("flip")} />
            自动轮换（白→夜→白→夜）
          </label>
          <label className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
            <input type="radio" checked={shiftMode === "individual"} onChange={() => setShiftMode("individual")} />
            每月自定义
          </label>
        </div>
        {shiftMode === "flip" ? (
          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400 sm:w-48">
            起始班次
            <select value={shiftFlipFirst} onChange={(e) => setShiftFlipFirst(e.target.value as ShiftType)} className={INPUT}>
              <option value="day">白班</option>
              <option value="night">夜班</option>
            </select>
            <span className="text-xs text-slate-400 dark:text-slate-500">（之后每月自动翻转）</span>
          </label>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {months.map((mm) => (
              <label key={ymKey(mm.year, mm.month)} className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-400">
                {mm.year}年{mm.month}月
                <select
                  value={shiftInd[ymKey(mm.year, mm.month)] ?? "day"}
                  onChange={(e) => setShiftInd((a) => ({ ...a, [ymKey(mm.year, mm.month)]: e.target.value as ShiftType }))}
                  className={INPUT}
                >
                  <option value="day">白班</option>
                  <option value="night">夜班</option>
                </select>
              </label>
            ))}
          </div>
        )}

        <div>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">不加班周几</h3>
          <div className="flex flex-wrap gap-3">
            {WEEKDAY_NAMES.map((n, i) => (
              <label key={i} className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={noOtWeekdays.includes(i)}
                  onChange={() => setNoOtWeekdays((a) => (a.includes(i) ? a.filter((x) => x !== i) : [...a, i]))}
                  className="rounded"
                />
                {n}
              </label>
            ))}
          </div>
        </div>
      </Card>

      <Card title="多月汇总" action={<ExportBtn onClick={saveImage} />}>
        {summary.results.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">请选择有效的日期区间（结束月份需不早于起始月份）。</p>
        ) : (
          <>
            <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">
                    <th className="py-1.5 text-left font-medium">月份</th>
                    <th className="py-1.5 text-center font-medium">工作日</th>
                    <th className="py-1.5 text-center font-medium">A班</th>
                    <th className="py-1.5 text-center font-medium">B班</th>
                    <th className="py-1.5 text-center font-medium">F班</th>
                    <th className="py-1.5 text-center font-medium">班次</th>
                    <th className="py-1.5 text-right font-medium">税前</th>
                    <th className="py-1.5 text-right font-medium">社保</th>
                    <th className="py-1.5 text-right font-medium">个税</th>
                    <th className="py-1.5 text-right font-medium">到手</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((r) => (
                    <tr key={`${r.year}-${r.month}`} className="border-b border-slate-100 dark:border-slate-800 whitespace-nowrap">
                      <td className="py-1.5">{r.year}/{String(r.month).padStart(2, "0")}</td>
                      <td className="py-1.5 text-center">{r.totalWorkDays}</td>
                      <td className="py-1.5 text-center">{r.aDayCount}</td>
                      <td className="py-1.5 text-center">{r.bDayCount}</td>
                      <td className="py-1.5 text-center">{r.fDayCount}</td>
                      <td className="py-1.5 text-center">{r.shiftType === "night" ? "夜班" : "白班"}</td>
                      <td className="py-1.5 text-right tabular-nums">{fmt(r.grossPay)}</td>
                      <td className="py-1.5 text-right tabular-nums text-rose-500 dark:text-rose-400">-{fmt(r.socialInsurance)}</td>
                      <td className="py-1.5 text-right tabular-nums text-rose-500 dark:text-rose-400">-{fmt(r.tax)}</td>
                      <td className="py-1.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{fmt(r.netPay)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pageCount > 1 && (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: pageCount }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={
                      "px-3 py-1 rounded-md text-xs " +
                      (i === cur ? "bg-sky-600 border border-sky-600 text-white" : "border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-black text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800")
                    }
                  >
                    第 {i + 1} 页
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {summaryItems.map((it) => (
                <div key={it.label} className="bg-slate-50 dark:bg-black rounded-lg px-3 py-2 text-center">
                  <div className="text-xs text-slate-500 dark:text-slate-400">{it.label}</div>
                  <div
                    className={
                      "font-semibold tabular-nums " +
                      (it.kind === "income" ? "text-emerald-600 dark:text-emerald-400" : it.kind === "deduction" ? "text-rose-500 dark:text-rose-400" : "text-slate-800 dark:text-slate-200") +
                      (it.big ? " text-lg" : "")
                    }
                  >
                    {fmt(it.amount)}
                  </div>
                </div>
              ))}
            </div>

          </>
        )}
      </Card>
    </div>
  );
}
