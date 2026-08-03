/**
 * 法定节假日计算（纯算法，不依赖年份数据）。
 * 依据国务院《全国年节及纪念日放假办法》：
 *   元旦1天 春节4天(除夕+初一~初三) 清明1天 劳动2天 端午1天 中秋1天 国庆3天 = 13天/年
 */
import { Lunar, Solar } from "lunar-typescript";

export function getLegalHolidays(year: number): Set<string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;
  const map = buildHolidays(year);
  holidayCache.set(year, map);
  return map;
}

const holidayCache = new Map<number, Set<string>>();

function buildHolidays(year: number): Set<string> {
  const set = new Set<string>();

  // 元旦 1月1日
  set.add(fmt(year, 1, 1));

  // 春节 4天：除夕 + 正月初一~初三
  addSpringFestival(year, set);

  // 清明节（遍历4月初找"清明"节气）
  for (let d = 1; d <= 10; d++) {
    const s = Solar.fromYmd(year, 4, d);
    if (s.getLunar().getJieQi() === "清明") { set.add(s.toYmd()); break; }
  }

  // 劳动节 5月1-2日
  set.add(fmt(year, 5, 1));
  set.add(fmt(year, 5, 2));

  // 端午节 农历五月初五
  set.add(Lunar.fromYmd(year, 5, 5).getSolar().toYmd());

  // 中秋节 农历八月十五
  set.add(Lunar.fromYmd(year, 8, 15).getSolar().toYmd());

  // 国庆节 10月1-3日
  for (let d = 1; d <= 3; d++) set.add(fmt(year, 10, d));

  return set;
}

/** 春节 = 除夕 + 初一~初三，共4天 */
function addSpringFestival(year: number, set: Set<string>): void {
  // 正月初一
  const firstDay = Lunar.fromYmd(year, 1, 1).getSolar();
  // 除夕 = 正月初一的前一天
  const chuxi = Solar.fromYmd(firstDay.getYear(), firstDay.getMonth(), firstDay.getDay()).next(-1);
  set.add(chuxi.toYmd());
  // 初一~初三
  for (let d = 1; d <= 3; d++) {
    set.add(Lunar.fromYmd(year, 1, d).getSolar().toYmd());
  }
}

function fmt(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
