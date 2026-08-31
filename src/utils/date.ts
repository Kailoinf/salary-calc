import dayjs from "dayjs";
import type { ShiftType } from "../types";
import { getLegalHolidays } from "./holidays";

/** 判断某天是否为法定节假日（F班，3倍工资）。 */
function isHoliday(date: dayjs.Dayjs): boolean {
  const holidays = getLegalHolidays(date.year());
  return holidays.has(date.format("YYYY-MM-DD"));
}

/** 判断某天是否为 B 班（C 班前一天）。 */
function isBDay(date: dayjs.Dayjs, restDayWeekday: number): boolean {
  return (date.day() + 1) % 7 === restDayWeekday;
}

/** 返回当月第一个休息日是几号（1-31）。 */
function getFirstRestDay(
  year: number,
  month: number,
  restDayWeekday: number,
): number {
  const target = ((restDayWeekday % 7) + 7) % 7; // 防御非法值，避免死循环
  let d = dayjs(new Date(year, month - 1, 1));
  while (d.day() !== target) {
    d = d.add(1, "day");
  }
  return d.date();
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
 * 应显示薪资的月份：15 号发薪，逢周六提前到 14 号、逢周日推迟到 16 号；
 * 发薪日当天及之前显示上月（发的是上月工资），发薪日次日起显示当月。
 */
export function getPayrollMonth(now: Date): { year: number; month: number } {
  const d = dayjs(now);
  const d15 = d.date(15).day();
  const payDay = d15 === 6 ? 14 : d15 === 0 ? 16 : 15;
  if (d.date() <= payDay) {
    const prev = d.subtract(1, "month"); // 跨年自动回退 12 月
    return { year: prev.year(), month: prev.month() + 1 };
  }
  return { year: d.year(), month: d.month() + 1 };
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
): {
  totalDays: number;
  aDayCount: number;
  bDayCount: number;
  fDayCount: number;
  cDayCount: number;
  nightShiftDays: number;
} {
  const start = dayjs(new Date(year, month - 1, 1));
  const daysInMonth = start.daysInMonth();
  const rest = ((restDayWeekday % 7) + 7) % 7; // 防御非法值，统一归一化
  const firstRest = getFirstRestDay(year, month, rest);

  // ==== 第一遍：收集法定节假日 + 计算冲突后移 ====
  const holidayDateSet = new Set<number>();
  const shiftedBDates = new Set<number>();
  const shiftedCDates = new Set<number>();

  for (let i = 0; i < daysInMonth; i++) {
    const d = start.add(i, "day");
    if (isHoliday(d)) holidayDateSet.add(d.date());
  }

  for (const hd of holidayDateSet) {
    const dow = start.date(hd).day();
    const isC = dow === rest;
    const isB = (dow + 1) % 7 === rest;

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
  let cDayCount = 0;
  let nightShiftDays = 0;

  for (let i = 0; i < daysInMonth; i++) {
    const d = start.add(i, "day");
    const dom = d.date();
    const shift = dayShift(dom, firstRest, prevShiftType, currShiftType);

    // 1) F 班：法定节假日最高优先级
    if (holidayDateSet.has(dom)) {
      totalDays++;
      fDayCount++;
      if (shift === "night") nightShiftDays++;
      continue;
    }

    // 2) C 班（休息日，不出勤）
    const isStdC = d.day() === rest;
    const isShiftedC = shiftedCDates.has(dom);
    if ((isStdC || isShiftedC) && !shiftedBDates.has(dom)) {
      cDayCount++;
      continue;
    }

    // 3) 出勤日
    totalDays++;
    if (shift === "night") nightShiftDays++;

    // 4) B 班 / A 班
    const isStdB = isBDay(d, rest) && !shiftedCDates.has(dom);
    const isShiftedB = shiftedBDates.has(dom);
    if (isStdB || isShiftedB) {
      bDayCount++;
    } else {
      aDayCount++;
    }
  }

  return {
    totalDays,
    aDayCount,
    bDayCount,
    fDayCount,
    cDayCount,
    nightShiftDays,
  };
}
