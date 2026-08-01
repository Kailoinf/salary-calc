// 回归验证：核心算法 + bug 修复验证
import { getWorkDaysInMonth, getADayDates, getBDayDates, isHoliday } from "./src/utils/date.ts";
import { calcMonthlySalary, calcMultiMonth, calcBaseHourlyRate, SOCIAL_INSURANCE } from "./src/utils/salary.ts";
import { DEFAULT_SETTINGS } from "./src/utils/settings.ts";
import { getLegalHolidays } from "./src/utils/holidays.ts";
import dayjs from "dayjs";

let pass = 0, fail = 0;
function check(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; }
  else { fail++; console.log(`  FAIL ${name}: got ${g}, want ${w}`); }
}

const cfg = { baseSalary: 280000, positionPay: 20000, fullAttendanceBonus: 15000, performancePay: 20000, adjustment: 0 };

// 排班统计
{
  const st = getWorkDaysInMonth(2026, 7, 3, "night", "day", [], []);
  check("2026-07 totalDays", st.totalDays, 26);
  check("2026-07 aDayCount", st.aDayCount, 22);
  check("2026-07 bDayCount", st.bDayCount, 4);
  check("2026-07 fDayCount", st.fDayCount, 0);
  check("2026-07 nightShiftDays", st.nightShiftDays, 0);
  check("2026-07 aDays UI", getADayDates(2026, 7, 3).length, 22);
  check("2026-07 bDays UI", getBDayDates(2026, 7, 3).length, 4);
}
{
  const st = getWorkDaysInMonth(2026, 7, 3, "day", "night", [], []);
  check("2026-07 night total", st.nightShiftDays, 26);
}
{
  const st = getWorkDaysInMonth(2026, 10, 3, "day", "day", [], []);
  check("2026-10 fDayCount", st.fDayCount, 3);
  check("2026-10 aDayCount", st.aDayCount, 20); // 31-4C-4B-3F
}
{
  const st = getWorkDaysInMonth(2026, 5, 3, "day", "day", [], []);
  check("2026-05 fDayCount", st.fDayCount, 2);
}

// 节假日
check("2026-01-01 元旦", isHoliday(dayjs("2026-01-01")), true);
check("2026-02-16 除夕", isHoliday(dayjs("2026-02-16")), true);
check("2026-02-17 初一", isHoliday(dayjs("2026-02-17")), true);
check("2026-02-20 初四非假", isHoliday(dayjs("2026-02-20")), false);
check("2026-10-03 国庆", isHoliday(dayjs("2026-10-03")), true);
check("2026 节假日数", getLegalHolidays(2026).size, 13);

// 金额
{
  const r = calcMonthlySalary({ year: 2026, month: 7, restDayWeekday: 3, shiftType: "day", prevShiftType: "night", bDay8hDates: [], noOvertimeDates: [], noOvertimeWeekdays: [], config: cfg, noSocial: false, noTax: false });
  check("时薪", calcBaseHourlyRate(280000), 1609);
  check("fixedTotal", r.fixedTotal, 335000);
  check("gross", r.grossPay, Math.round(335000 + 22*3*1.5*1609 + 4*11*2*1609));
  check("social", r.socialInsurance, 44280);
  check("net", r.netPay, r.grossPay - 44280 - Math.max(0, Math.round((r.grossPay - 500000 - 44280)*0.03)));
}
{
  const r = calcMonthlySalary({ year: 2026, month: 7, restDayWeekday: 3, shiftType: "day", prevShiftType: "night", bDay8hDates: [7], noOvertimeDates: [], noOvertimeWeekdays: [], config: cfg, noSocial: true, noTax: true });
  check("bDay8hCount", r.bDay8hCount, 1);
  check("B班费", r.tuesdayDoublePay, Math.round((3*11*2 + 8*2)*1609));
}
{
  const r = calcMonthlySalary({ year: 2026, month: 7, restDayWeekday: 3, shiftType: "day", prevShiftType: "night", bDay8hDates: [], noOvertimeDates: [2], noOvertimeWeekdays: [], config: cfg, noSocial: true, noTax: true });
  check("noOvertimeCount", r.noOvertimeCount, 1);
  check("A加班", r.weekdayOvertime, Math.round(21*3*1.5*1609));
}
{
  const r = calcMonthlySalary({ year: 2026, month: 7, restDayWeekday: 3, shiftType: "day", prevShiftType: "night", bDay8hDates: [], noOvertimeDates: [], noOvertimeWeekdays: [4], config: cfg, noSocial: true, noTax: true });
  check("noOvertimeWeekdays 周四", r.noOvertimeCount, 5);
}

// 多月翻转
{
  const sum = calcMultiMonth(2026, 7, 2026, 8, cfg, 3, "day", [], [], [], true, true);
  check("多月 2 个月", sum.results.length, 2);
  check("月1 shift day", sum.results[0].shiftType, "day");
  check("月2 shift night", sum.results[1].shiftType, "night");
}

// bug 修复验证：calcMultiMonth 传长度不足的数组（restDayWeekday 越界）不应死循环
{
  const sum = calcMultiMonth(2026, 7, 2026, 9, cfg, [3], "day", [], [], [], true, true);
  check("越界数组 3 个月", sum.results.length, 3);
  check("越界数组 rwd 回退", sum.results[2].restDayWeekday, 3);
}
// shiftType 数组越界回退 day
{
  const sum = calcMultiMonth(2026, 7, 2026, 9, cfg, 3, ["day"], [], [], [], true, true);
  check("shift 越界回退 day", sum.results[2].shiftType, "day");
}
// 空数组（end < start 时 UI 传 []）不应崩
{
  const sum = calcMultiMonth(2026, 12, 2026, 1, cfg, [], [], [], [], [], true, true);
  check("空区间 0 个月", sum.results.length, 0);
}

// bDay8h 防御：日期为节假日（2026-10-01 周四不是 B 班，验证不过滤正常 B 班；用 2026 春节 2/16 周一? 不是 B 班）——直接验证 F 班日不被 bDay8h 计：
// 找一个"B 班日恰逢节假日"的用例：2026-04-07? 不用。核心是 UI 不可达，只验证不崩。
{
  const r = calcMonthlySalary({ year: 2026, month: 7, restDayWeekday: 3, shiftType: "day", prevShiftType: "night", bDay8hDates: [99], noOvertimeDates: [], noOvertimeWeekdays: [], config: cfg, noSocial: true, noTax: true });
  check("bDay8h 非法日期 0", r.bDay8hCount, 0);
}

console.log(`结果: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
