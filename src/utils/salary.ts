import type {
  SalaryConfig,
  SocialInsurance,
  MonthlyInput,
  MonthlyResult,
  MultiMonthSummary,
  ShiftType,
} from "../types";
import { getWorkDaysInMonth } from "./date";

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
  const { year, month, restDayWeekday, shiftType, prevShiftType, bDay8hDates, noOvertimeDates, noOvertimeWeekdays, config } =
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

  // b. 基础时薪
  const baseHourlyRate = calcBaseHourlyRate(config.baseSalary);

  // c. 固定薪资合计
  const fixedTotal =
    config.baseSalary +
    config.positionPay +
    config.fullAttendanceBonus +
    config.performancePay;

  // d. A 班加班费：加班 3h × 1.5 倍（不加班的 A 班日不计）
  const weekdayOvertime = round2(
    (stats.aDayCount - stats.noOvertimeCount) * 3 * 1.5 * baseHourlyRate,
  );

  // e. B 班双倍加班费：默认11h×2，勾选8h的B班日按8h×2
  const bDay8hSet = new Set(bDay8hDates);
  const bDay8hCount = bDay8hDates.length;
  const tuesdayDoublePay = round2(
    (stats.bDayCount - bDay8hCount) * 11 * 2 * baseHourlyRate +
    bDay8hCount * 8 * 2 * baseHourlyRate,
  );

  // f. F 班节假日（全天 11h × 3 倍）
  const holidayExtra = round2(stats.fDayCount * 11 * 3 * baseHourlyRate);

  // g. 夜班补贴：逐日判定，20元/夜班出勤日
  const nightSubsidy = round2(20 * stats.nightShiftDays);

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
    bDay8hCount,
    baseHourlyRate: round2(baseHourlyRate),
  };
}

/**
 * 多月汇总计算。
 * restDayWeekday 传单值表示所有月份统一；传数组则按月份顺序逐月取值。
 * shiftType 传单值时每月自动翻转（白→夜→白→夜…）；
 * 传数组时按顺序取，prevShiftType 由上一月推断。
 */
export function calcMultiMonth(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
  config: SalaryConfig,
  restDayWeekday: number | number[],
  shiftType: ShiftType | ShiftType[],
  bDay8hDates: number[],
  noOvertimeWeekdays: number[],
  noOvertimeDates: number[],
): MultiMonthSummary {
  const results: MonthlyResult[] = [];

  let y = startYear;
  let m = startMonth;
  let index = 0;

  // 第一个月的前月班次：与当月相反
  const firstShift = Array.isArray(shiftType) ? shiftType[0] : shiftType;
  let prevShift: ShiftType = firstShift === "night" ? "day" : "night";
  // 单值时自动每月翻转（白→夜→白→夜…）；数组时取对应索引
  let autoFlip: ShiftType | null = Array.isArray(shiftType) ? null : firstShift;

  while (y < endYear || (y === endYear && m <= endMonth)) {
    const rwd = Array.isArray(restDayWeekday)
      ? restDayWeekday[index]
      : restDayWeekday;

    const currShift: ShiftType = Array.isArray(shiftType)
      ? shiftType[index]
      : autoFlip!;

    // 单值时：每次迭代翻转
    if (autoFlip !== null) {
      autoFlip = autoFlip === "night" ? "day" : "night";
    }

    results.push(
      calcMonthlySalary({
        year: y,
        month: m,
        restDayWeekday: rwd,
        shiftType: currShift,
        prevShiftType: prevShift,
        bDay8hDates,
        noOvertimeDates,
        noOvertimeWeekdays,
        config,
      }),
    );

    prevShift = currShift;
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
