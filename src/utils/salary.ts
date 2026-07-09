import type {
  SalaryConfig,
  MonthlyInput,
  MonthlyResult,
  MultiMonthSummary,
  ShiftType,
} from "../types";
import { getWorkDaysInMonth } from "./date";
import { DEFAULT_SETTINGS, type UserSettings } from "./settings";

/** 当前生效的设置（社保 + 个税），由 main.ts 在启动/修改时写入 */
let currentSettings: UserSettings = { ...DEFAULT_SETTINGS };
export function getCurrentSettings(): UserSettings {
  return currentSettings;
}
export function setCurrentSettings(s: UserSettings): void {
  currentSettings = { ...s };
  TAX_THRESHOLD = s.taxThreshold;
  TAX_RATE = s.taxRate;
}

// ponytail: 社保固定扣款，不再按基数×费率计算
const SOCIAL_INSURANCE = 44280; // 442.80 元

export let TAX_THRESHOLD = DEFAULT_SETTINGS.taxThreshold; // 个税起征点
export let TAX_RATE = DEFAULT_SETTINGS.taxRate; // 个税税率

export const STANDARD_WORK_DAYS = 21.75;
export const STANDARD_WORK_HOURS = 8;

// 金额一律以「分」参与运算；涉及比例/除法产生小数时，最终结果用 Math.round 取整为分。
// 比例类（养老/医疗/失业/税率）保持小数不变，整数 × 小数 仍在分域。

/** 基础时薪 = 底薪 / 21.75 / 8（底薪为分，结果亦为分，可能含小数） */
export function calcBaseHourlyRate(baseSalary: number): number {
  return baseSalary / STANDARD_WORK_DAYS / STANDARD_WORK_HOURS;
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

  // b. 基础时薪（分/小时，含小数）
  const baseHourlyRate = calcBaseHourlyRate(config.baseSalary);

  // c. 固定薪资合计（各项均为分，求和即分）
  const fixedTotal =
    config.baseSalary +
    config.positionPay +
    config.fullAttendanceBonus +
    config.performancePay;

  // d. A 班加班费：加班 3h × 1.5 倍（不加班的 A 班日不计）
  const weekdayOvertime = Math.round(
    (stats.aDayCount - stats.noOvertimeCount) * 3 * 1.5 * baseHourlyRate,
  );

  // e. B 班双倍加班费：默认11h×2，勾选8h的B班日按8h×2
  const bDay8hCount = bDay8hDates.length;
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

  // i. 社保（固定值）
  // j. 个税
  const tax = calcTax(grossPay, SOCIAL_INSURANCE);
  // k. 到手工资
  const netPay = Math.round(grossPay - SOCIAL_INSURANCE - tax);

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
    fixedTotal,
    weekdayOvertime,
    tuesdayDoublePay,
    holidayExtra,
    nightSubsidy,
    grossPay,
    socialInsurance: SOCIAL_INSURANCE,
    tax,
    netPay,
    shiftType,
    bDay8hCount,
    baseHourlyRate: Math.round(baseHourlyRate),
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

  const totalGross = results.reduce((sum, r) => sum + r.grossPay, 0);
  const totalSocial = results.reduce((sum, r) => sum + r.socialInsurance, 0);
  const totalTax = results.reduce((sum, r) => sum + r.tax, 0);
  const totalNet = results.reduce((sum, r) => sum + r.netPay, 0);
  const averageNet = results.length > 0 ? Math.round(totalNet / results.length) : 0;

  return { results, totalGross, totalSocial, totalTax, totalNet, averageNet };
}
