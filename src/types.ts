// 全部 TS 类型定义（strict 模式，禁止 any）

// 金额字段单位均为「分」（1 元 = 100 分），整数存储以避免浮点误差；比例字段为无量纲小数。

/** 基础薪资配置 */
export interface SalaryConfig {
  baseSalary: number; // 底薪，分，默认 2800 元 = 280000
  positionPay: number; // 岗位工资，分，默认 200 元 = 20000
  fullAttendanceBonus: number; // 全勤奖，分，默认 150 元 = 15000
  performancePay: number; // 绩效工资，分，默认 200 元 = 20000
}

/** 排班类型 */
export type ShiftType = "day" | "night";

/** 月度计算输入参数 */
export interface MonthlyInput {
  year: number;
  month: number; // 1-12
  restDayWeekday: number; // C 班（休息日）周几，0=周日~6=周六，默认 3（周三）
  shiftType: ShiftType;     // 当月班次（第一个休息日之后生效）
  prevShiftType: ShiftType; // 上月班次（第一个休息日之前沿用）
  bDay8hDates: number[];    // B班中只上8h的日期（几号），默认全11h
  noOvertimeDates: number[]; // 当月 A 班日中"不加班"的日期（几号）集合
  noOvertimeWeekdays: number[]; // "不加班"的周几集合（0~6），命中即该 A 班日不计加班
  config: SalaryConfig;
}

/** 月度计算结果 */
export interface MonthlyResult {
  year: number;
  month: number;
  // 统计
  totalWorkDays: number;
  aDayCount: number; // A 班（普通工作日）天数
  bDayCount: number; // B 班（C 班前一天）天数
  fDayCount: number; // F 班（法定节假日）天数
  restDayWeekday: number; // C 班（休息日）周几
  noOvertimeCount: number; // A 班日中"不加班"的天数
  holidayDays: number; // 法定节假日出勤天数（= fDayCount）
  nightShiftDays: number; // 夜班出勤天数
  // 收入明细（均为分）
  fixedTotal: number; // 固定薪资合计
  weekdayOvertime: number; // A 班加班费（加班 3h × 1.5 倍）
  tuesdayDoublePay: number; // B 班双倍（全天 11h × 2 倍）
  holidayExtra: number; // F班节假日加班（全天 11h × 3 倍）
  nightSubsidy: number; // 夜班补贴
  grossPay: number; // 税前总工资
  // 扣款明细（均为分）
  socialInsurance: number; // 社保扣款，分，固定 442.80 元
  tax: number; // 个税
  netPay: number; // 到手工资
  // 元数据
  shiftType: ShiftType;
  bDay8hCount: number;   // B班中只上8h的天数
  baseHourlyRate: number; // 基础时薪，分/小时
}

/** 多月汇总（金额字段均为分） */
export interface MultiMonthSummary {
  results: MonthlyResult[];
  totalGross: number;
  totalSocial: number;
  totalTax: number;
  totalNet: number;
  averageNet: number;
}
