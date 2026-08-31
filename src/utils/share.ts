// 分享码：工资数据二进制定宽打包 → base64(URL-safe)，塞进 ?d=
// 不用 JSON/分隔符（更短）。字段固定字节布局，encode/decode 必须同步。
import type { UserSettings } from "./settings";

export type ShareData = {
  year: number;
  month: number;
  overtime: number;
  bhours: number;
  chours: number;
  fhours: number;
  nights: number;
  // 奖励/惩罚，单位「元」（可负）
  adjustment: number;
  settings: UserSettings;
};

// 字节布局（26 字节总长）：
// [0]year-2000 [1]month
// [2-3]overtime×2 u16  [4-5]bhours×2 u16  [6-7]chours×2 u16  [8-9]fhours×2 u16
// [10]nights
// [11-12]adjustment元 i16  [13-14]baseSalary元 u16  [15-16]positionSalary元 u16
// [17-18]attendanceBonus元 u16  [19-20]performanceSalary元 u16
// [21]restDayWeekday  [22]flags(bit0 noSocial bit1 noTax bit2 cEveryOther)
// [23-24]taxThreshold元 u16  [25]taxRate×100 u8
const LEN = 26;

function bytesToB64url(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x1fff) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x1fff));
  }
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function encodeShare(d: ShareData): string {
  const ul = d.settings;
  const b = new Uint8Array(LEN);
  const v = new DataView(b.buffer);
  let o = 0;
  v.setUint8(o++, d.year - 2000);
  v.setUint8(o++, d.month);
  v.setUint16(o, Math.round(d.overtime * 2)); o += 2;
  v.setUint16(o, Math.round(d.bhours * 2)); o += 2;
  v.setUint16(o, Math.round(d.chours * 2)); o += 2;
  v.setUint16(o, Math.round(d.fhours * 2)); o += 2;
  v.setUint8(o++, d.nights);
  v.setInt16(o, Math.round(d.adjustment)); o += 2; // 元，可负
  v.setUint16(o, Math.round(ul.baseSalary / 100)); o += 2; // 元
  v.setUint16(o, Math.round(ul.positionSalary / 100)); o += 2;
  v.setUint16(o, Math.round(ul.attendanceBonus / 100)); o += 2;
  v.setUint16(o, Math.round(ul.performanceSalary / 100)); o += 2;
  v.setUint8(o++, ul.restDayWeekday);
  v.setUint8(o++, (ul.noSocial ? 1 : 0) | (ul.noTax ? 2 : 0) | (ul.cEveryOther ? 4 : 0));
  v.setUint16(o, Math.round(ul.taxThreshold / 100)); o += 2; // 元
  v.setUint8(o++, Math.floor(ul.taxRate * 100));
  return bytesToB64url(b);
}

export function decodeShare(encoded: string): ShareData | null {
  try {
    const b = b64urlToBytes(encoded);
    if (b.length !== LEN) return null;
    const v = new DataView(b.buffer);
    let o = 0;
    const year = v.getUint8(o++) + 2000;
    const month = v.getUint8(o++);
    const overtime = v.getUint16(o) / 2; o += 2;
    const bhours = v.getUint16(o) / 2; o += 2;
    const chours = v.getUint16(o) / 2; o += 2;
    const fhours = v.getUint16(o) / 2; o += 2;
    const nights = v.getUint8(o++);
    const adjustment = v.getInt16(o); o += 2; // 元
    const baseSalary = v.getUint16(o) * 100; o += 2;
    const positionSalary = v.getUint16(o) * 100; o += 2;
    const attendanceBonus = v.getUint16(o) * 100; o += 2;
    const performanceSalary = v.getUint16(o) * 100; o += 2;
    const restDayWeekday = v.getUint8(o++);
    const flags = v.getUint8(o++);
    const taxThreshold = v.getUint16(o) * 100; o += 2;
    const taxRate = v.getUint8(o++) / 100;
    if (![year, month, overtime, bhours, chours, fhours, nights, adjustment, restDayWeekday, taxRate].every((n) => Number.isFinite(n))) return null;
    return {
      year,
      month,
      overtime,
      bhours,
      chours,
      fhours,
      nights,
      adjustment,
      settings: {
        baseSalary,
        positionSalary,
        attendanceBonus,
        performanceSalary,
        restDayWeekday,
        adjustment: adjustment * 100, // 分
        noSocial: !!(flags & 1),
        noTax: !!(flags & 2),
        cEveryOther: !!(flags & 4),
        taxThreshold,
        taxRate,
      },
    };
  } catch {
    return null;
  }
}
