import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import type { ShiftType } from "../types";
import {
  isHoliday as chinaIsHoliday,
  getFestival,
  isAddtionalWorkday,
} from "china-holiday";

dayjs.extend(isoWeek);

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

/** 返回该月所有法定节假日（真正放假）的日期数组 */
export function getHolidaysInMonth(year: number, month: number): dayjs.Dayjs[] {
  const start = dayjs(new Date(year, month - 1, 1));
  const daysInMonth = start.daysInMonth();
  const holidays: dayjs.Dayjs[] = [];
  for (let i = 0; i < daysInMonth; i++) {
    const d = start.add(i, "day");
    if (isHoliday(d)) holidays.push(d);
  }
  return holidays;
}

/** 返回日期是周几 */
export function getWeekdayType(
  date: dayjs.Dayjs,
): "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun" {
  const names = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
  return names[date.day()];
}

/**
 * 隔月交替：奇数月（1/3/5/7/9/11）白班，偶数月（2/4/6/8/10/12）夜班。
 * 即 7白 8夜 9白 10夜 11白 12夜 1白 2夜 …
 */
export function getShiftType(month: number): ShiftType {
  return month % 2 === 1 ? "day" : "night";
}

/** 根据用户输入的“几号”返回当月第一个休息日的 dayjs 对象 */
export function getFirstRestDate(
  year: number,
  month: number,
  firstRestDay: number,
): dayjs.Dayjs {
  return dayjs(new Date(year, month - 1, firstRestDay));
}

/**
 * 判断某天是否是休息日。
 * 排班规则：从“当月第一个休息日”起，每隔 7 天休息一天（固定每周三休息）。
 * 第一个休息日之前的日期不算休息日。
 */
export function isRestDay(date: dayjs.Dayjs, firstRestDayOfMonth: number): boolean {
  const dayOfMonth = date.date();
  if (dayOfMonth < firstRestDayOfMonth) return false;
  return (dayOfMonth - firstRestDayOfMonth) % 7 === 0;
}

/**
 * 核心函数：遍历当月每一天，跳过休息日，统计：
 *   - 总工作日
 *   - 周二天数（双倍出勤）
 *   - 法定节假日天数（且为出勤，即非休息日）
 *   - 夜班出勤天数（夜班月 = 总工作日，白班月 = 0）
 */
export function getWorkDaysInMonth(
  year: number,
  month: number,
  firstRestDay: number,
): {
  totalDays: number;
  tuesdayCount: number;
  holidayDays: dayjs.Dayjs[];
  nightShiftDays: number;
} {
  const start = dayjs(new Date(year, month - 1, 1));
  const daysInMonth = start.daysInMonth();

  let totalDays = 0;
  let tuesdayCount = 0;
  const holidayDays: dayjs.Dayjs[] = [];

  for (let i = 0; i < daysInMonth; i++) {
    const d = start.add(i, "day");
    if (isRestDay(d, firstRestDay)) continue; // 休息日不出勤
    totalDays++;
    if (getWeekdayType(d) === "tue") tuesdayCount++;
    if (isHoliday(d)) holidayDays.push(d); // 法定节假日且出勤
  }

  const shiftType = getShiftType(month);
  const nightShiftDays = shiftType === "night" ? totalDays : 0;

  return { totalDays, tuesdayCount, holidayDays, nightShiftDays };
}
