import dayjs from "dayjs";
import type { ShiftType } from "../types";
import { getLegalHolidays } from "./holidays";

/**
 * 判断某天是否为法定节假日（F班，3倍工资）。
 */
export function isHoliday(date: dayjs.Dayjs): boolean {
  const holidays = getLegalHolidays(date.year());
  return holidays.has(date.format("YYYY-MM-DD"));
}

/**
 * 判断某天是否为 C 班（休息日），restDayWeekday: 0=周日~6=周六。
 */
export function isRestDay(date: dayjs.Dayjs, restDayWeekday: number): boolean {
  return date.day() === restDayWeekday;
}

/**
 * 判断某天是否为 B 班（C 班前一天）。
 */
export function isBDay(date: dayjs.Dayjs, restDayWeekday: number): boolean {
  return (date.day() + 1) % 7 === restDayWeekday;
}

/**
 * 返回当月第一个休息日是几号（1-31）。
 */
export function getFirstRestDay(
  year: number,
  month: number,
  restDayWeekday: number,
): number {
  let d = dayjs(new Date(year, month - 1, 1));
  while (d.day() !== restDayWeekday) {
    d = d.add(1, "day");
  }
  return d.date();
}

/**
 * 返回当月所有 A 班日（排除 C/B/F 班），供 UI 渲染不加班勾选列表。
 */
export function getADayDates(
  year: number,
  month: number,
  restDayWeekday: number,
): dayjs.Dayjs[] {
  const start = dayjs(new Date(year, month - 1, 1));
  const daysInMonth = start.daysInMonth();
  const out: dayjs.Dayjs[] = [];
  for (let i = 0; i < daysInMonth; i++) {
    const d = start.add(i, "day");
    if (d.day() === restDayWeekday) continue;
    if ((d.day() + 1) % 7 === restDayWeekday) continue;
    if (isHoliday(d)) continue;
    out.push(d);
  }
  return out;
}

/** 逐日判定白/夜班（休息日之前沿用上月，之后用本月） */
function dayShift(
  dom: number,
  firstRest: number,
  prev: ShiftType,
  curr: ShiftType,
): ShiftType {
  return dom < firstRest ? prev : curr;
}

/**
 * 核心函数：遍历当月每一天，按班型分类统计出勤。
 * 班次切换规则：当月第一个休息日之前的出勤日沿用 prevShiftType，
 * 之后使用 currShiftType（含 F 班节假日）。
 */
export function getWorkDaysInMonth(
  year: number,
  month: number,
  restDayWeekday: number,
  prevShiftType: ShiftType,
  currShiftType: ShiftType,
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
  const firstRest = getFirstRestDay(year, month, restDayWeekday);

  // ==== 第一遍：收集法定节假日 + 计算冲突后移 ====
  const holidayDateSet = new Set<number>();
  const shiftedBDates = new Set<number>();
  const shiftedCDates = new Set<number>();

  for (let i = 0; i < daysInMonth; i++) {
    const d = start.add(i, "day");
    if (isHoliday(d)) holidayDateSet.add(d.date());
  }

  for (const hd of holidayDateSet) {
    const dow = new Date(year, month - 1, hd).getDay();
    const isC = dow === restDayWeekday;
    const isB = (dow + 1) % 7 === restDayWeekday;

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

  // ==== 第二遍：按优先级分类统计 ====
  let totalDays = 0;
  let aDayCount = 0;
  let bDayCount = 0;
  let fDayCount = 0;
  let noOvertimeCount = 0;
  let nightShiftDays = 0;
  const holidayDays: dayjs.Dayjs[] = [];
  const noOvertimeDateSet = new Set(noOvertimeDates);
  const noOvertimeWeekdaySet = new Set(noOvertimeWeekdays);

  for (let i = 0; i < daysInMonth; i++) {
    const d = start.add(i, "day");
    const dom = d.date();
    const shift = dayShift(dom, firstRest, prevShiftType, currShiftType);

    // 1) F 班：法定节假日最高优先级（也参与白/夜班判定）
    if (holidayDateSet.has(dom)) {
      totalDays++;
      fDayCount++;
      holidayDays.push(d);
      if (shift === "night") nightShiftDays++;
      continue;
    }

    // 2) C 班（休息日，不出勤）
    const isStdC = d.day() === restDayWeekday;
    const isShiftedC = shiftedCDates.has(dom);
    if ((isStdC || isShiftedC) && !shiftedBDates.has(dom)) continue;

    // 3) 出勤日
    totalDays++;
    if (shift === "night") nightShiftDays++;

    // 4) B 班 / A 班
    const isStdB = isBDay(d, restDayWeekday) && !shiftedCDates.has(dom);
    const isShiftedB = shiftedBDates.has(dom);
    if (isStdB || isShiftedB) {
      bDayCount++;
    } else {
      aDayCount++;
      if (noOvertimeDateSet.has(dom) || noOvertimeWeekdaySet.has(d.day()))
        noOvertimeCount++;
    }
  }

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
