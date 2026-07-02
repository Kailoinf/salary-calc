// 全部 TS 类型定义（strict 模式，禁止 any）

/** 基础薪资配置 */
export interface SalaryConfig {
  baseSalary: number; // 底薪，默认 2800
  positionPay: number; // 岗位工资，默认 200
  fullAttendanceBonus: number; // 全勤奖，默认 150
  performancePay: number; // 绩效工资，默认 200
}

/** 社保参数（固定值，不可修改） */
export interface SocialInsurance {
  pensionRate: number; // 养老 0.08
  medicalRate: number; // 医疗 0.02
  unemploymentRate: number; // 失业 0.003
  fixedDeduction: number; // 大额医保 + 长护险 14.95
  base: number; // 社保基数 4299
}

/** 排班类型 */
export type ShiftType = "day" | "night";

/** 月度计算输入参数 */
export interface MonthlyInput {
  year: number;
  month: number; // 1-12
  restDayWeekday: number; // C 班（休息日）周几，0=周日~6=周六，默认 3（周三）
  shiftType: ShiftType;     // 白班 day / 夜班 night
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
  // 收入明细
  fixedTotal: number; // 固定薪资合计
  weekdayOvertime: number; // A 班加班费（加班 3h × 1.5 倍）
  tuesdayDoublePay: number; // B 班双倍（全天 11h × 2 倍）
  holidayExtra: number; // F班节假日加班（全天 11h × 3 倍）
  nightSubsidy: number; // 夜班补贴
  grossPay: number; // 税前总工资
  // 扣款明细
  socialInsurance: {
    pension: number;
    medical: number;
    unemployment: number;
    fixed: number; // 大额长护 14.95
    total: number;
  };
  tax: number; // 个税
  netPay: number; // 到手工资
  // 元数据
  shiftType: ShiftType;
  baseHourlyRate: number; // 基础时薪
}

/** 多月汇总 */
export interface MultiMonthSummary {
  results: MonthlyResult[];
  totalGross: number;
  totalSocial: number;
  totalTax: number;
  totalNet: number;
  averageNet: number;
}
