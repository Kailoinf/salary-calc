import type {
  SalaryConfig,
  SocialInsurance,
  MonthlyInput,
  MonthlyResult,
  MultiMonthSummary,
} from "../types";
import { getWorkDaysInMonth, getShiftType } from "./date";

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

/** 月度薪资计算 */
export function calcMonthlySalary(input: MonthlyInput): MonthlyResult {
  const { year, month, restDayWeekday, noOvertimeDates, noOvertimeWeekdays, config } =
    input;

  // a. 当月排班统计（A/B/F 班分类 + 不加班计数）
  const stats = getWorkDaysInMonth(
    year,
    month,
    restDayWeekday,
    noOvertimeDates,
    noOvertimeWeekdays,
  );
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

  // e. A 班加班费：加班 3h × 1.5 倍（不加班的 A 班日不计）
  const weekdayOvertime = round2(
    (stats.aDayCount - stats.noOvertimeCount) * 3 * 1.5 * baseHourlyRate,
  );

  // f. B 班双倍加班费（全天 11h × 2 倍）
  const tuesdayDoublePay = round2(stats.bDayCount * 11 * 2 * baseHourlyRate);

  // g. F 班节假日（全天 11h × 3 倍）
  const holidayExtra = round2(stats.fDayCount * 11 * 3 * baseHourlyRate);

  // h. 夜班补贴（夜班月：20 × 总工作日数；白班月：0）
  const nightSubsidy =
    shiftType === "night" ? round2(20 * stats.totalDays) : 0;

  // i. 税前总工资
  const grossPay = round2(
    fixedTotal + weekdayOvertime + tuesdayDoublePay + holidayExtra + nightSubsidy,
  );

  // j. 社保
  const socialInsurance = calcSocialInsurance();
  // k. 个税
  const tax = calcTax(grossPay, socialInsurance.total);
  // l. 到手工资
  const netPay = round2(grossPay - socialInsurance.total - tax);

  return {
    year,
    month,
    totalWorkDays: stats.totalDays,
    aDayCount: stats.aDayCount,
    bDayCount: stats.bDayCount,
    fDayCount: stats.fDayCount,
    restDayWeekday,
    noOvertimeCount: stats.noOvertimeCount,
    holidayDays: stats.holidayDays.length,
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
 * restDayWeekday 传单值表示所有月份统一；传数组则按月份顺序逐月取值。
 * noOvertimeWeekdays / noOvertimeDates 对所有月份统一生效。
 */
export function calcMultiMonth(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
  config: SalaryConfig,
  restDayWeekday: number | number[],
  noOvertimeWeekdays: number[],
  noOvertimeDates: number[],
): MultiMonthSummary {
  const results: MonthlyResult[] = [];

  let y = startYear;
  let m = startMonth;
  let index = 0;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    const rwd = Array.isArray(restDayWeekday)
      ? restDayWeekday[index]
      : restDayWeekday;
    results.push(
      calcMonthlySalary({
        year: y,
        month: m,
        restDayWeekday: rwd,
        noOvertimeDates,
        noOvertimeWeekdays,
        config,
      }),
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
