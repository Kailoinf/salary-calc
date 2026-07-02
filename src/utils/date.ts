import dayjs from "dayjs";
import type { ShiftType } from "../types";
import {
  isHoliday as chinaIsHoliday,
  getFestival,
  isAddtionalWorkday,
} from "china-holiday";

// `china-holiday` 实际以 CommonJS 导出：
//   module.exports = { isWorkday, isHoliday, getFestival, isAddtionalWorkday }
// 但其自带的 index.d.ts 只声明了一个 `ChineseWorkday` 接口，没有任何函数导出的类型，
// 因此这里对模块做一次声明合并（augmentation），补齐运行时函数的类型。
declare module "china-holiday" {
  export function isWorkday(day: string | Date): boolean;
  export function isHoliday(day: string | Date): boolean;
  export function isAddtionalWorkday(day: string | Date): boolean;
  export function getFestival(day: string | Date): string;
}

/**
 * 判断某天是否为法定节假日（真正放假的日子）。
 *
 * 注意：`china-holiday` 的 `isHoliday` 实为 `!isWorkday`，对“普通周末 + 法定节假日”
 * 都会返回 true。这里需要排除：
 *   1. 调休上班日（isAddtionalWorkday === true）—— 不算放假；
 *   2. 普通周末（getFestival 返回 "周末"）—— 也不算法定节假日。
 */
export function isHoliday(date: dayjs.Dayjs): boolean {
  const d = date.toDate();
  // 调休上班日不算法定节假日
  if (isAddtionalWorkday(d)) return false;
  // 排除正常工作日 / 调休上班日
  if (!chinaIsHoliday(d)) return false;
  // 排除普通周末：getFestival 仅对普通周末返回 "周末"
  return getFestival(d) !== "周末";
}

/**
 * 隔月交替：奇数月（1/3/5/7/9/11）白班，偶数月（2/4/6/8/10/12）夜班。
 * 即 7白 8夜 9白 10夜 11白 12夜 1白 2夜 …
 */
export function getShiftType(month: number): ShiftType {
  return month % 2 === 1 ? "day" : "night";
}

/**
 * 判断某天是否为 C 班（休息日）。
 * 排班规则：每周固定的某一天休息（由 restDayWeekday 指定，0=周日~6=周六）。
 */
export function isRestDay(date: dayjs.Dayjs, restDayWeekday: number): boolean {
  return date.day() === restDayWeekday;
}

/**
 * 判断某天是否为 B 班（C 班前一天）。
 * 即“次日”是休息日：当 (date.day()+1)%7 === restDayWeekday 时返回 true。
 * 例：C=3(周三) → B=2(周二)；C=1(周一) → B=0(周日)。
 */
export function isBDay(date: dayjs.Dayjs, restDayWeekday: number): boolean {
  return (date.day() + 1) % 7 === restDayWeekday;
}

/**
 * 核心函数：遍历当月每一天，按班型分类统计出勤。
 *   - C 班（休息日）：跳过，不出勤；
 *   - F 班（法定节假日 isHoliday）：fDayCount；
 *   - B 班（C 班前一天）：bDayCount；
 *   - 其余：A 班 → aDayCount。
 * A 班日若命中“不加班”集合（日期或周几）则计入 noOvertimeCount。
 * 夜班出勤天数 = 夜班月的总出勤天数，白班月为 0。
 */
export function getWorkDaysInMonth(
  year: number,
  month: number,
  restDayWeekday: number,
  noOvertimeDates: number[],
  noOvertimeWeekdays: number[],
): {
  totalDays: number;
  aDayCount: number;
  bDayCount: number;
  fDayCount: number;
  holidayDays: dayjs.Dayjs[];
  nightShiftDays: number;
  noOvertimeCount: number;
} {
  const start = dayjs(new Date(year, month - 1, 1));
  const daysInMonth = start.daysInMonth();

  // ==== 第一遍：收集所有节假日日期 ====
  const holidayDateSet = new Set<number>();
  for (let i = 0; i < daysInMonth; i++) {
    const d = start.add(i, "day");
    if (isHoliday(d)) holidayDateSet.add(d.date());
  }

  // ==== 第二遍：计算 F 班冲突导致的临时后移 ====
  // ponytail: F班撞C→C后移1天, F撞B→B后移1天+C后移2天, 仅当周临时
  const shiftedBDates = new Set<number>();
  const shiftedCDates = new Set<number>();
  for (const hd of holidayDateSet) {
    const isC = (new Date(year, month - 1, hd).getDay()) === restDayWeekday;
    const isB = ((new Date(year, month - 1, hd).getDay()) + 1) % 7 === restDayWeekday;

    if (isC) {
      const cTarget = hd + 1;
      if (cTarget <= daysInMonth && !holidayDateSet.has(cTarget))
        shiftedCDates.add(cTarget);
    }
    if (isB) {
      const bTarget = hd + 1;
      if (bTarget <= daysInMonth && !holidayDateSet.has(bTarget))
        shiftedBDates.add(bTarget);
      const cTarget = hd + 2;
      if (cTarget <= daysInMonth && !holidayDateSet.has(cTarget))
        shiftedCDates.add(cTarget);
    }
  }

  // ==== 第三遍：按优先级分类统计 ====
  let totalDays = 0;
  let aDayCount = 0;
  let bDayCount = 0;
  let fDayCount = 0;
  let noOvertimeCount = 0;
  const holidayDays: dayjs.Dayjs[] = [];
  const noOvertimeDateSet = new Set(noOvertimeDates);
  const noOvertimeWeekdaySet = new Set(noOvertimeWeekdays);

  for (let i = 0; i < daysInMonth; i++) {
    const d = start.add(i, "day");
    const dom = d.date();

    // 1) F 班：节假日最高优先级
    if (holidayDateSet.has(dom)) {
      totalDays++;
      fDayCount++;
      holidayDays.push(d);
      continue;
    }

    // 2) C 班（休息日，不出勤）：标准 C 或被冲突后移来的 C
    //    但如果同时也是被 shift 来的 B，说明 B 抢了 C 的位置，C 已再后移
    const isStdC = d.day() === restDayWeekday;
    const isShiftedC = shiftedCDates.has(dom);
    if ((isStdC || isShiftedC) && !shiftedBDates.has(dom)) continue;

    // 3) 出勤日
    totalDays++;

    // 4) B 班：标准 B（未被 holiday 占且未被 shift 成 C）或被冲突后移来的 B
    const isStdB = isBDay(d, restDayWeekday) && !shiftedCDates.has(dom);
    const isShiftedB = shiftedBDates.has(dom);
    if (isStdB || isShiftedB) {
      bDayCount++;
    } else {
      // 5) A 班：普通工作日
      aDayCount++;
      if (noOvertimeDateSet.has(dom) || noOvertimeWeekdaySet.has(d.day()))
        noOvertimeCount++;
    }
  }

  const shiftType = getShiftType(month);
  const nightShiftDays = shiftType === "night" ? totalDays : 0;

  return {
    totalDays,
    aDayCount,
    bDayCount,
    fDayCount,
    holidayDays,
    nightShiftDays,
    noOvertimeCount,
  };
}
