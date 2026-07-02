import type {
  SalaryConfig,
  SocialInsurance,
  MonthlyInput,
  MonthlyResult,
  MultiMonthSummary,
} from "../types";
import dayjs from "dayjs";
import {
  getWorkDaysInMonth,
  getShiftType,
  getWeekdayType,
  isRestDay,
} from "./date";

/** 社保参数（固定值） */
export const SOCIAL_INSURANCE: SocialInsurance = {
  pensionRate: 0.08,
  medicalRate: 0.02,
  unemploymentRate: 0.003,
  fixedDeduction: 14.95,
  base: 4299,
};

export const TAX_THRESHOLD = 5000; // 个税起征点
export const TAX_RATE = 0.03; // 税率 3%

export const STANDARD_WORK_DAYS = 21.75;
export const STANDARD_WORK_HOURS = 8;

/** 金额按分（两位小数）四舍五入，避免浮点误差 */
const round2 = (n: number): number => Math.round(n * 100) / 100;

/** 基础时薪 = 底薪 / 21.75 / 8 */
export function calcBaseHourlyRate(baseSalary: number): number {
  return baseSalary / STANDARD_WORK_DAYS / STANDARD_WORK_HOURS;
}

/** 按社保基数 × 比例计算各项 + 固定 14.95 */
export function calcSocialInsurance(): {
  pension: number;
  medical: number;
  unemployment: number;
  fixed: number;
  total: number;
} {
  const pension = round2(SOCIAL_INSURANCE.base * SOCIAL_INSURANCE.pensionRate);
  const medical = round2(SOCIAL_INSURANCE.base * SOCIAL_INSURANCE.medicalRate);
  const unemployment = round2(
    SOCIAL_INSURANCE.base * SOCIAL_INSURANCE.unemploymentRate,
  );
  const fixed = round2(SOCIAL_INSURANCE.fixedDeduction);
  const total = round2(pension + medical + unemployment + fixed);
  return { pension, medical, unemployment, fixed, total };
}

/**
 * 个税：计税基数 = 税前工资 - 起征点 - 社保；
 * 计税基数 ≤ 0 时免征，否则 × 3%。
 */
export function calcTax(grossPay: number, socialTotal: number): number {
  const taxable = grossPay - TAX_THRESHOLD - socialTotal;
  if (taxable <= 0) return 0;
  return round2(taxable * TAX_RATE);
}

/**
 * 统计当月出勤的周一 / 周四 / 周五天数（跳过休息日）。
 * 这三天每天额外加班 3h，按 1.5 倍时薪计算。
 */
function countWeekdayOvertimeDays(
  year: number,
  month: number,
  firstRestDay: number,
): { monCount: number; thuCount: number; friCount: number } {
  const start = dayjs(new Date(year, month - 1, 1));
  const daysInMonth = start.daysInMonth();
  let monCount = 0;
  let thuCount = 0;
  let friCount = 0;
  for (let i = 0; i < daysInMonth; i++) {
    const d = start.add(i, "day");
    if (isRestDay(d, firstRestDay)) continue;
    const wd = getWeekdayType(d);
    if (wd === "mon") monCount++;
    else if (wd === "thu") thuCount++;
    else if (wd === "fri") friCount++;
  }
  return { monCount, thuCount, friCount };
}

/** 月度薪资计算 */
export function calcMonthlySalary(input: MonthlyInput): MonthlyResult {
  const { year, month, firstRestDay, config } = input;

  // a. 当月排班统计
  const stats = getWorkDaysInMonth(year, month, firstRestDay);
  // b. 班次类型（奇数月白班 / 偶数月夜班）
  const shiftType = getShiftType(month);
  // c. 基础时薪
  const baseHourlyRate = calcBaseHourlyRate(config.baseSalary);
  // d. 固定薪资合计
  const fixedTotal =
    config.baseSalary +
    config.positionPay +
    config.fullAttendanceBonus +
    config.performancePay;

  // e. 工作日加班费（周一/四/五 × 3h × 1.5 倍）
  const { monCount, thuCount, friCount } = countWeekdayOvertimeDays(
    year,
    month,
    firstRestDay,
  );
  const weekdayOvertime = round2(
    (monCount + thuCount + friCount) * 3 * 1.5 * baseHourlyRate,
  );

  // f. 周二双倍加班费（周二天数 × 11h × 2 倍）
  const tuesdayDoublePay = round2(
    stats.tuesdayCount * 11 * 2 * baseHourlyRate,
  );

  // 节假日补差（法定节假日天数 × 11h × (3-1) 倍 = × 11h × 2 倍）
  const holidayCount = stats.holidayDays.length;
  const holidayExtra = round2(holidayCount * 11 * 2 * baseHourlyRate);

  // g. 夜班补贴（夜班月：20 × 总工作日数；白班月：0）
  const nightSubsidy =
    shiftType === "night" ? round2(20 * stats.totalDays) : 0;

  // h. 税前总工资
  const grossPay = round2(
    fixedTotal + weekdayOvertime + tuesdayDoublePay + holidayExtra + nightSubsidy,
  );

  // i. 社保
  const socialInsurance = calcSocialInsurance();
  // j. 个税
  const tax = calcTax(grossPay, socialInsurance.total);
  // k. 到手工资
  const netPay = round2(grossPay - socialInsurance.total - tax);

  return {
    year,
    month,
    totalWorkDays: stats.totalDays,
    tuesdayDoubleDays: stats.tuesdayCount,
    holidayDays: holidayCount,
    nightShiftDays: stats.nightShiftDays,
    fixedTotal: round2(fixedTotal),
    weekdayOvertime,
    tuesdayDoublePay,
    holidayExtra,
    nightSubsidy,
    grossPay,
    socialInsurance,
    tax,
    netPay,
    shiftType,
    baseHourlyRate: round2(baseHourlyRate),
  };
}

/**
 * 多月汇总计算。
 * restDays 传单个数字表示所有月份统一；传数组则按月份顺序逐月取值。
 */
export function calcMultiMonth(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
  config: SalaryConfig,
  restDays: number[] | number,
): MultiMonthSummary {
  const results: MonthlyResult[] = [];

  let y = startYear;
  let m = startMonth;
  let index = 0;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    const firstRestDay = Array.isArray(restDays) ? restDays[index] : restDays;
    results.push(
      calcMonthlySalary({ year: y, month: m, firstRestDay, config }),
    );
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
    index++;
  }

  const totalGross = round2(results.reduce((sum, r) => sum + r.grossPay, 0));
  const totalSocial = round2(
    results.reduce((sum, r) => sum + r.socialInsurance.total, 0),
  );
  const totalTax = round2(results.reduce((sum, r) => sum + r.tax, 0));
  const totalNet = round2(results.reduce((sum, r) => sum + r.netPay, 0));
  const averageNet =
    results.length > 0 ? round2(totalNet / results.length) : 0;

  return { results, totalGross, totalSocial, totalTax, totalNet, averageNet };
}
