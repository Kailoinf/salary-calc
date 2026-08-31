// 用户可调参数，持久化到 localStorage
// 金额字段单位为「分」（1 元 = 100 分）

/** 用户设置：薪资构成 4 + 全局 4 + 个税 2 */
export interface UserSettings {
  baseSalary: number; // 底薪，分，默认 2800 元 = 280000
  positionSalary: number; // 岗位工资，分，默认 200 元 = 20000
  attendanceBonus: number; // 全勤奖，分，默认 150 元 = 15000
  performanceSalary: number; // 绩效工资，分，默认 200 元 = 20000
  restDayWeekday: number; // C 班（休息日）周几，0=周日~6=周六，默认 3（周三）
  adjustment: number; // 奖励/惩罚，分，默认 0 元 = 0，可负
  noSocial: boolean; // 不交社保
  noTax: boolean; // 不交个税
  cEveryOther: boolean; // 14休1：C班隔一个上一个（第一个C班上班），默认 false
  taxThreshold: number; // 个税起征点，分，默认 5000 元 = 500000
  taxRate: number; // 个税税率，默认 0.03
}

export const DEFAULT_SETTINGS: UserSettings = {
  baseSalary: 280000,
  positionSalary: 20000,
  attendanceBonus: 15000,
  performanceSalary: 20000,
  restDayWeekday: 3,
  adjustment: 0,
  noSocial: false,
  noTax: false,
  cEveryOther: false,
  taxThreshold: 500000,
  taxRate: 0.03,
};

const KEY = "salary-calc-settings";

/** 读取设置：localStorage 损坏/缺失时回落默认值，逐字段校验为有限数 */
export function loadSettings(): UserSettings {
  const s = { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return s;
    const parsed = JSON.parse(raw) as Partial<Record<keyof UserSettings, unknown>>;
    (Object.keys(s) as (keyof UserSettings)[]).forEach((k) => {
      const v = parsed[k];
      const target = s as Record<string, unknown>;
      if (k === "noSocial" || k === "noTax" || k === "cEveryOther") {
        if (typeof v === "boolean") target[k] = v;
      } else if (typeof v === "number" && Number.isFinite(v)) {
        // 范围校验：损坏数据回落默认值（adjustment 允许负值=惩罚）
        if (k === "restDayWeekday" && (v < 0 || v > 6 || !Number.isInteger(v))) return;
        if (k === "taxRate" && (v < 0 || v > 1)) return;
        if (k !== "adjustment" && v < 0) return;
        target[k] = v;
      }
    });
  } catch {
    /* 解析失败则用默认值 */
  }
  return s;
}

export function saveSettings(s: UserSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* 隐私模式等写入失败，忽略 */
  }
}
