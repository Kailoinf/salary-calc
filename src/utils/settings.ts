// 用户可调参数，持久化到 localStorage
// ⚠️ 金额字段单位为「分」（1 元 = 100 分）

/** 用户设置：薪资构成 4 + 个税 2 */
export interface UserSettings {
  baseSalary: number; // 底薪，分，默认 2800 元 = 280000
  positionSalary: number; // 岗位工资，分，默认 200 元 = 20000
  attendanceBonus: number; // 全勤奖，分，默认 150 元 = 15000
  performanceSalary: number; // 绩效工资，分，默认 200 元 = 20000
  taxThreshold: number; // 个税起征点，分，默认 5000 元 = 500000
  taxRate: number; // 个税税率，默认 0.03
}

export const DEFAULT_SETTINGS: UserSettings = {
  baseSalary: 230000,
  positionSalary: 10000,
  attendanceBonus: 15000,
  performanceSalary: 0,
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
      if (typeof v === "number" && Number.isFinite(v)) s[k] = v;
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

/** 清除已保存设置，返回默认值 */
export function resetSettings(): UserSettings {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* 忽略 */
  }
  return { ...DEFAULT_SETTINGS };
}
