// 全部 TS 类型定义（strict 模式，禁止 any）

// 金额字段单位均为「分」（1 元 = 100 分），整数存储以避免浮点误差；比例字段为无量纲小数。

/** 排班类型 */
export type ShiftType = "day" | "night";
