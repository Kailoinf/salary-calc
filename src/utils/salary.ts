import type { MonthlyInput, MonthlyResult } from "../types";
import dayjs from "dayjs";
import { getWorkDaysInMonth, isHoliday } from "./date";
import { DEFAULT_SETTINGS, type UserSettings } from "./settings";

/** 当前生效的个税参数（社保 + 个税），由 App 在启动/修改设置时写入 */
export function setCurrentSettings(s: UserSettings): void {
  TAX_THRESHOLD = s.taxThreshold;
  TAX_RATE = s.taxRate;
}

// ponytail: 社保固定扣款，不再按基数×费率计算
export const SOCIAL_INSURANCE = 44280; // 442.80 元

let TAX_THRESHOLD = DEFAULT_SETTINGS.taxThreshold; // 个税起征点
let TAX_RATE = DEFAULT_SETTINGS.taxRate; // 个税税率

const STANDARD_WORK_DAYS = 21.75;
const STANDARD_WORK_HOURS = 8;

// 金额一律以「分」参与运算；涉及比例/除法产生小数时，最终结果用 Math.round 取整为分。
// 比例类（养老/医疗/失业/税率）保持小数不变，整数 × 小数 仍在分域。

/** 基础时薪 = Math.round(底薪 / 21.75 / 8)，取整到分 */
export function calcBaseHourlyRate(baseSalary: number): number {
  return Math.round(baseSalary / STANDARD_WORK_DAYS / STANDARD_WORK_HOURS);
}

/**
 * 个税：计税基数 = 税前工资 - 起征点 - 社保（均为分）；
 * 计税基数 ≤ 0 时免征，否则 × 税率，结果取整为分。
 */
export function calcTax(grossPay: number, socialTotal: number): number {
  const taxable = grossPay - TAX_THRESHOLD - socialTotal;
  if (taxable <= 0) return 0;
  return Math.round(taxable * TAX_RATE);
}

/** 月度薪资计算 */
export function calcMonthlySalary(input: MonthlyInput): MonthlyResult {
  const { year, month, restDayWeekday, shiftType, prevShiftType, bDay8hDates, noOvertimeDates, noOvertimeWeekdays, config, noSocial, noTax } =
    input;

  // a. 当月排班统计（A/B/F 班分类 + 逐日白/夜班 + 不加班计数）
  const stats = getWorkDaysInMonth(
    year,
    month,
    restDayWeekday,
    prevShiftType,
    shiftType,
    noOvertimeDates,
    noOvertimeWeekdays,
  );

  // b. 基础时薪（分/小时，含小数）
  const baseHourlyRate = calcBaseHourlyRate(config.baseSalary);

  // c. 固定薪资合计（各项均为分，求和即分；含全局奖励/惩罚 adjustment）
  const fixedTotal =
    config.baseSalary +
    config.positionPay +
    config.fullAttendanceBonus +
    config.performancePay +
    config.adjustment;

  // d. A 班加班费：加班 3h × 1.5 倍（不加班的 A 班日不计）
  const weekdayOvertime = Math.round(
    (stats.aDayCount - stats.noOvertimeCount) * 3 * 1.5 * baseHourlyRate,
  );

  // e. B 班双倍加班费：默认11h×2，勾选8h的B班日按8h×2
  // ponytail: 只计真正是B班日的8h标记，防御性过滤
  let bDay8hCount = 0;
  for (const d of bDay8hDates) {
    if ((new Date(year, month - 1, d).getDay() + 1) % 7 === restDayWeekday && !isHoliday(dayjs(new Date(year, month - 1, d)))) bDay8hCount++;
  }
  const tuesdayDoublePay = Math.round(
    (stats.bDayCount - bDay8hCount) * 11 * 2 * baseHourlyRate +
    bDay8hCount * 8 * 2 * baseHourlyRate,
  );

  // f. F 班节假日（全天 11h × 3 倍）
  const holidayExtra = Math.round(stats.fDayCount * 11 * 3 * baseHourlyRate);

  // g. 夜班补贴：逐日判定，20元(=2000分)/夜班出勤日
  const nightSubsidy = Math.round(2000 * stats.nightShiftDays);

  // h. 税前总工资
  const grossPay = Math.round(
    fixedTotal + weekdayOvertime + tuesdayDoublePay + holidayExtra + nightSubsidy,
  );

  // i. 社保（不交社保则跳过）
  const socialDeduction = noSocial ? 0 : SOCIAL_INSURANCE;
  // j. 个税（不交个税则跳过）
  const tax = noTax ? 0 : calcTax(grossPay, socialDeduction);
  // k. 到手工资
  const netPay = Math.round(grossPay - socialDeduction - tax);

  return {
    year,
    month,
    totalWorkDays: stats.totalDays,
    aDayCount: stats.aDayCount,
    bDayCount: stats.bDayCount,
    fDayCount: stats.fDayCount,
    restDayWeekday,
    noOvertimeCount: stats.noOvertimeCount,
    nightShiftDays: stats.nightShiftDays,
    fixedTotal,
    weekdayOvertime,
    tuesdayDoublePay,
    holidayExtra,
    nightSubsidy,
    grossPay,
    socialInsurance: socialDeduction,
    tax,
    netPay,
    shiftType,
    bDay8hCount,
    baseHourlyRate: Math.round(baseHourlyRate),
  };
}
