// 分享码：把工资数据按固定顺序字段 | 拼接 → base64（URL-safe），塞进 ?d=
// 不用 JSON（更短、更紧凑）。编码/解码字段顺序必须一致，改顺序要同步两处。
import type { UserSettings } from "./settings";

// 每个工时(时/分/次)与薪资字段顺序。字段全部为数字，布尔用 0/1。
// 顺序：y|m|overtime|bhours|chours|fhours|nights|adjustment|
//       baseSalary|positionSalary|attendanceBonus|performanceSalary|
//       restDayWeekday|noSocial|noTax|cEveryOther|taxThreshold|taxRate
export type ShareData = {
  year: number;
  month: number;
  overtime: number;
  bhours: number;
  chours: number;
  fhours: number;
  nights: number;
  adjustment: number;
  settings: UserSettings;
};

// URL-safe base64（RFC 4648 §5，btoa 之后替换 +/= 为 -_ 并去掉尾部 =）
function b64urlEncode(str: string): string {
  const b64 = btoa(str);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  return atob(b64 + pad);
}

export function encodeShare(d: ShareData): string {
  const s = [
    d.year,
    d.month,
    d.overtime,
    d.bhours,
    d.chours,
    d.fhours,
    d.nights,
    d.adjustment,
    d.settings.baseSalary,
    d.settings.positionSalary,
    d.settings.attendanceBonus,
    d.settings.performanceSalary,
    d.settings.restDayWeekday,
    d.settings.noSocial ? 1 : 0,
    d.settings.noTax ? 1 : 0,
    d.settings.cEveryOther ? 1 : 0,
    d.settings.taxThreshold,
    d.settings.taxRate,
  ].join("|");
  return b64urlEncode(s);
}

export function decodeShare(encoded: string): ShareData | null {
  try {
    const raw = b64urlDecode(encoded);
    const p = raw.split("|");
    if (p.length !== 18) return null;
    const n = (i: number) => Number(p[i]);
    if (![0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 17].every((i) => Number.isFinite(n(i)))) return null;
    const flags = [13, 14, 15].map((i) => n(i) === 1);
    return {
      year: n(0),
      month: n(1),
      overtime: n(2),
      bhours: n(3),
      chours: n(4),
      fhours: n(5),
      nights: n(6),
      adjustment: n(7),
      settings: {
        baseSalary: n(8),
        positionSalary: n(9),
        attendanceBonus: n(10),
        performanceSalary: n(11),
        restDayWeekday: n(12),
        adjustment: n(7),
        noSocial: flags[0],
        noTax: flags[1],
        cEveryOther: flags[2],
        taxThreshold: n(16),
        taxRate: n(17),
      },
    };
  } catch {
    return null;
  }
}
