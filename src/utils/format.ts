// 跨组件复用的小工具：金额格式化、元↔分换算、周几名称。

/** 周几名称：0=周日 ~ 6=周六 */
export const WEEKDAY_NAMES = [
  "周日",
  "周一",
  "周二",
  "周三",
  "周四",
  "周五",
  "周六",
] as const;

/** 元 → 分（用户输入转内部整数存储，消除浮点误差） */
export const yuanToCents = (yuan: number): number => Math.round(yuan * 100);

/** 金额格式化：入参为「分」，输出两位小数 + 千分位的「元」 */
export function fmt(cents: number): string {
  return (cents / 100).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** 解析字符串为数字；非有限数回落 fallback */
export function num(s: string, fallback: number): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}
