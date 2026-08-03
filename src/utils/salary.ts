import { DEFAULT_SETTINGS, type UserSettings } from "./settings";

/** 当前生效的个税参数（社保 + 个税），由 App 在启动/修改设置时写入 */
export function setCurrentSettings(s: UserSettings): void {
  TAX_THRESHOLD = s.taxThreshold;
  TAX_RATE = s.taxRate;
}

// ponytail: 社保固定扣款，不再按基数×费率计算
export const SOCIAL_INSURANCE = 44280; // 442.80 元

let TAX_THRESHOLD = DEFAULT_SETTINGS.taxThreshold; // 个税起征点
let TAX_RATE = DEFAULT_SETTINGS.taxRate; // 个税税率

const STANDARD_WORK_DAYS = 21.75;
const STANDARD_WORK_HOURS = 8;

// 金额一律以「分」参与运算；涉及比例/除法产生小数时，最终结果用 Math.round 取整为分。
// 比例类（养老/医疗/失业/税率）保持小数不变，整数 × 小数 仍在分域。

/** 基础时薪 = Math.round(底薪 / 21.75 / 8)，取整到分 */
export function calcBaseHourlyRate(baseSalary: number): number {
  return Math.round(baseSalary / STANDARD_WORK_DAYS / STANDARD_WORK_HOURS);
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
