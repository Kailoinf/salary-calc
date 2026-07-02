/**
 * 法定节假日计算（纯算法，不依赖年份数据）。
 * 依据国务院《全国年节及纪念日放假办法》：
 *   元旦1天 春节4天(除夕+初一~初三) 清明1天 劳动2天 端午1天 中秋1天 国庆3天 = 13天/年
 */
import { Lunar, Solar } from "lunar-typescript";

export function getLegalHolidays(year: number): Map<string, string> {
  const map = new Map<string, string>();

  // 元旦 1月1日
  map.set(fmt(year, 1, 1), "元旦");

  // 春节 4天：除夕 + 正月初一~初三
  addSpringFestival(year, map);

  // 清明节（遍历4月初找"清明"节气）
  for (let d = 1; d <= 10; d++) {
    const s = Solar.fromYmd(year, 4, d);
    if (s.getLunar().getJieQi() === "清明") { map.set(s.toYmd(), "清明节"); break; }
  }

  // 劳动节 5月1-2日
  map.set(fmt(year, 5, 1), "劳动节");
  map.set(fmt(year, 5, 2), "劳动节");

  // 端午节 农历五月初五
  map.set(Lunar.fromYmd(year, 5, 5).getSolar().toYmd(), "端午节");

  // 中秋节 农历八月十五
  map.set(Lunar.fromYmd(year, 8, 15).getSolar().toYmd(), "中秋节");

  // 国庆节 10月1-3日
  for (let d = 1; d <= 3; d++) map.set(fmt(year, 10, d), "国庆节");

  return map;
}

/** 春节 = 除夕 + 初一~初三，共4天 */
function addSpringFestival(year: number, map: Map<string, string>): void {
  // 正月初一
  const firstDay = Lunar.fromYmd(year, 1, 1).getSolar();
  // 除夕 = 正月初一的前一天
  const chuxi = Solar.fromYmd(firstDay.getYear(), firstDay.getMonth(), firstDay.getDay()).next(-1);
  map.set(chuxi.toYmd(), "春节");
  // 初一~初三
  for (let d = 1; d <= 3; d++) {
    map.set(Lunar.fromYmd(year, 1, d).getSolar().toYmd(), "春节");
  }
}

function fmt(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
