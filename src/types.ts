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
  firstRestDay: number; // 当月第一个休息日（几号）
  config: SalaryConfig;
}

/** 月度计算结果 */
export interface MonthlyResult {
  year: number;
  month: number;
  // 统计
  totalWorkDays: number;
  tuesdayDoubleDays: number; // 周二双倍出勤天数
  holidayDays: number; // 法定节假日出勤天数
  nightShiftDays: number; // 夜班出勤天数
  // 收入明细
  fixedTotal: number; // 固定薪资合计
  weekdayOvertime: number; // 工作日加班费（周一/四/五 1.5 倍）
  tuesdayDoublePay: number; // 周二双倍加班费
  holidayExtra: number; // 节假日补差（3 倍差额）
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
