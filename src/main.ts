import type { SalaryConfig, MonthlyResult, MultiMonthSummary, ShiftType } from "./types";
import { calcMonthlySalary, calcMultiMonth } from "./utils/salary";
import { getADayDates, getBDayDates } from "./utils/date";
import { z } from "zod";

/* ============================================================
 * 常量
 * ========================================================== */

/** 周几名称：0=周日 ~ 6=周六 */
const WEEKDAY_NAMES = [
  "周日",
  "周一",
  "周二",
  "周三",
  "周四",
  "周五",
  "周六",
] as const;

/* ============================================================
 * 通用工具
 * ========================================================== */

function getById<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`找不到元素 #${id}`);
  return el as T;
}

/** 取得（或创建）某个 input 紧邻其后的错误提示 span */
function errorSpanOf(el: HTMLInputElement): HTMLSpanElement {
  const next = el.nextElementSibling;
  if (next instanceof HTMLSpanElement && next.classList.contains("error-msg")) {
    return next;
  }
  const span = document.createElement("span");
  span.className = "error-msg";
  el.after(span);
  return span;
}

/** 金额格式化：两位小数 + 千分位 */
function fmt(n: number): string {
  return n.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* ============================================================
 * Zod 校验 schema
 * ========================================================== */

const yearSchema = z
  .number()
  .int()
  .min(2020, "年份需在 2020-2030")
  .max(2030, "年份需在 2020-2030");
const monthSchema = z.number().int().min(1, "月份 1-12").max(12, "月份 1-12");
const salarySchema = z.number().min(0, "不能小于 0");

/** 校验单个 number 输入；失败时显示错误并以 fallback 回退（不阻断计算） */
function validateNumber(
  id: string,
  schema: z.ZodType<number>,
  fallback: number,
): number {
  const el = getById<HTMLInputElement>(id);
  const span = errorSpanOf(el);
  const raw = el.value.trim();
  if (raw === "") {
    span.textContent = "必填";
    return fallback;
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    span.textContent = "需为数字";
    return fallback;
  }
  const r = schema.safeParse(n);
  if (r.success) {
    span.textContent = "";
    return r.data;
  }
  span.textContent = r.error.issues[0]?.message ?? "无效";
  return fallback;
}

/** 读取并校验 input[type=month]，返回 {year, month} */
function readMonth(
  id: string,
  fy: number,
  fm: number,
): { year: number; month: number } {
  const el = getById<HTMLInputElement>(id);
  const span = errorSpanOf(el);
  const m = /^(\d{4})-(\d{2})$/.exec(el.value);
  if (!m) {
    span.textContent = "格式应为 YYYY-MM";
    return { year: fy, month: fm };
  }
  const year = Number(m[1]);
  const month = Number(m[2]);
  const ry = yearSchema.safeParse(year);
  const rm = monthSchema.safeParse(month);
  if (ry.success && rm.success) {
    span.textContent = "";
    return { year, month };
  }
  span.textContent = !ry.success
    ? (ry.error.issues[0]?.message ?? "无效")
    : !rm.success
      ? (rm.error.issues[0]?.message ?? "无效")
      : "无效";
  return { year: fy, month: fm };
}

/** 读取基础薪资配置 */
function readConfig(prefix: "single" | "multi"): SalaryConfig {
  return {
    baseSalary: validateNumber(`${prefix}-base`, salarySchema, 2800),
    positionPay: validateNumber(`${prefix}-position`, salarySchema, 200),
    fullAttendanceBonus: validateNumber(
      `${prefix}-attendance`,
      salarySchema,
      150,
    ),
    performancePay: validateNumber(`${prefix}-performance`, salarySchema, 200),
  };
}

/* ============================================================
 * 多月 C 班周几管理（统一 / 单独 两种模式）
 * ========================================================== */

type RestdayMode = "uniform" | "individual";
let restdayMode: RestdayMode = "uniform";

/** key: "year-month"，value: 当月 C 班周几；单独模式下持久化用户输入 */
const restdayMap = new Map<string, number>();

function restKey(y: number, m: number): string {
  return `${y}-${m}`;
}
function getRestdayFor(y: number, m: number): number {
  return restdayMap.get(restKey(y, m)) ?? 3; // 默认周三
}
function setRestdayFor(y: number, m: number, v: number): void {
  restdayMap.set(restKey(y, m), v);
}

interface YearMonth {
  year: number;
  month: number;
}

/** 枚举从 start 到 end（含）的所有月份；end 早于 start 时返回空数组 */
function enumerateMonths(start: YearMonth, end: YearMonth): YearMonth[] {
  const out: YearMonth[] = [];
  let y = start.year;
  let m = start.month;
  let guard = 0;
  while ((y < end.year || (y === end.year && m <= end.month)) && guard < 600) {
    out.push({ year: y, month: m });
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
    guard++;
  }
  return out;
}

/** 生成周几下拉选项 HTML，selected 指定默认选中值（0~6） */
function weekdayOptions(selected: number): string {
  return WEEKDAY_NAMES.map(
    (n, i) => `<option value="${i}"${i === selected ? " selected" : ""}>${n}</option>`,
  ).join("");
}

/**
 * 根据当前模式与月份集合渲染 C 班周几输入区。
 * 仅在结构（模式 + 月份集合）发生变化时才重建 DOM，避免切换失焦。
 */
function ensureRestdayWeekdayInputs(months: YearMonth[]): void {
  const container = getById("multi-restday-inputs");
  const sig =
    restdayMode + "|" + months.map((mm) => restKey(mm.year, mm.month)).join(",");
  if (container.dataset.sig === sig) return;
  container.dataset.sig = sig;

  if (restdayMode === "uniform") {
    // 切换/重渲染时尽量保留用户已选择的统一值
    const existing = document.getElementById(
      "multi-restday-uniform",
    ) as HTMLSelectElement | null;
    const prev =
      existing && existing.value !== ""
        ? Number(existing.value)
        : months.length > 0
          ? getRestdayFor(months[0].year, months[0].month)
          : 3;
    container.innerHTML = `<div class="form-row"><label>C班(休息日)周几 <select id="multi-restday-uniform">${weekdayOptions(Number.isFinite(prev) ? prev : 3)}</select></label></div>`;
    getById<HTMLSelectElement>("multi-restday-uniform").addEventListener(
      "change",
      recalcMulti,
    );
  } else {
    const items = months
      .map(
        (mm, i) =>
          `<label>${mm.year}年${mm.month}月 <select class="restday-individual" data-rest-idx="${i}" data-rest-key="${restKey(mm.year, mm.month)}">${weekdayOptions(getRestdayFor(mm.year, mm.month))}</select></label>`,
      )
      .join("");
    container.innerHTML = `<div class="individual-restday">${items}</div>`;
    container
      .querySelectorAll<HTMLSelectElement>(".restday-individual")
      .forEach((sel) => {
        sel.addEventListener("change", () => {
          const key = sel.dataset.restKey ?? "";
          const parts = key.split("-");
          const ry = Number(parts[0]);
          const rm = Number(parts[1]);
          const val = Number(sel.value);
          if (Number.isFinite(val)) setRestdayFor(ry, rm, val);
          recalcMulti();
        });
      });
  }
}

/** 读取 C 班周几配置：统一模式返回单值，单独模式返回数组 */
function readRestdayWeekdays(months: YearMonth[]): number | number[] {
  if (restdayMode === "uniform") {
    const el = document.getElementById(
      "multi-restday-uniform",
    ) as HTMLSelectElement | null;
    const v = el ? Number(el.value) : NaN;
    return Number.isFinite(v) ? Math.round(v) : 3;
  }
  return months.map((mm) => getRestdayFor(mm.year, mm.month));
}

/* ============================================================
 * 多月班次管理（自动轮换 / 每月自定义）
 * ========================================================== */

type ShiftMode = "flip" | "individual";
let shiftMode: ShiftMode = "flip";

/** key: "year-month"，value: ShiftType */
const shiftMap = new Map<string, ShiftType>();

function getShiftFor(y: number, m: number): ShiftType {
  return shiftMap.get(restKey(y, m)) ?? "day";
}
function setShiftFor(y: number, m: number, v: ShiftType): void {
  shiftMap.set(restKey(y, m), v);
}

function shiftOptions(selected: ShiftType): string {
  return `<option value="day"${selected === "day" ? " selected" : ""}>白班</option>
<option value="night"${selected === "night" ? " selected" : ""}>夜班</option>`;
}

function ensureShiftInputs(months: YearMonth[]): void {
  const container = getById("multi-shift-inputs");
  const sig = shiftMode + "|" + months.map((mm) => restKey(mm.year, mm.month)).join(",");
  if (container.dataset.sig === sig) return;
  container.dataset.sig = sig;

  if (shiftMode === "flip") {
    const first = months.length > 0 ? getShiftFor(months[0].year, months[0].month) : "day";
    container.innerHTML = `<label>起始班次
      <select id="multi-shift-flip">${shiftOptions(first)}</select>
      <span class="hint">（之后每月自动翻转）</span></label>`;
    getById<HTMLSelectElement>("multi-shift-flip").addEventListener("change", () => {
      // 翻转模式只需存第一个月，calcMultiMonth 自动 flip
      if (months.length > 0) {
        const sel = getById<HTMLSelectElement>("multi-shift-flip");
        setShiftFor(months[0].year, months[0].month, sel.value as ShiftType);
      }
      recalcMulti();
    });
  } else {
    const items = months
      .map((mm) =>
        `<label>${mm.year}年${mm.month}月 <select class="shift-individual" data-shift-key="${restKey(mm.year, mm.month)}">${shiftOptions(getShiftFor(mm.year, mm.month))}</select></label>`,
      )
      .join("");
    container.innerHTML = `<div class="individual-restday">${items}</div>`;
    container.querySelectorAll<HTMLSelectElement>(".shift-individual").forEach((sel) => {
      sel.addEventListener("change", () => {
        const key = sel.dataset.shiftKey ?? "";
        const parts = key.split("-");
        setShiftFor(Number(parts[0]), Number(parts[1]), sel.value as ShiftType);
        recalcMulti();
      });
    });
  }
}

function readShiftTypes(months: YearMonth[]): ShiftType | ShiftType[] {
  if (shiftMode === "flip") {
    const el = document.getElementById("multi-shift-flip") as HTMLSelectElement | null;
    return (el?.value as ShiftType) ?? "day";
  }
  return months.map((mm) => getShiftFor(mm.year, mm.month));
}

/** 读取单月 C 班周几 select 的值 */
function readRestDayWeekday(id: string): number {
  const el = getById<HTMLSelectElement>(id);
  const v = Number(el.value);
  return Number.isFinite(v) ? Math.round(v) : 3;
}

/** 读取班次 select 的值 (day/night) */
function readShiftType(id: string): "day" | "night" {
  const el = getById<HTMLSelectElement>(id);
  return el.value === "night" ? "night" : "day";
}

/* ============================================================
 * 不加班设置
 * ========================================================== */

/** 读取某个周几 checkbox 容器中勾选的周几集合 */
function readNoOvertimeWeekdays(containerId: string): number[] {
  const out: number[] = [];
  document
    .querySelectorAll<HTMLInputElement>(`#${containerId} input:checked`)
    .forEach((cb) => {
      const v = Number(cb.value);
      if (Number.isFinite(v)) out.push(v);
    });
  return out;
}

/** 单月：持久化当月 A 班日中"不加班"的日期（key: "year-month-date"） */
const noOvertimeDateSet = new Set<string>();

function noOtDateKey(y: number, m: number, date: number): string {
  return `${y}-${m}-${date}`;
}

/** 读取单月"按日期"不加班列表：返回未勾选（=不加班）的日期 */
function readNoOvertimeDates(): number[] {
  const out: number[] = [];
  document
    .querySelectorAll<HTMLInputElement>("#single-noot-dates .noot-date:not(:checked)")
    .forEach((cb) => {
      const v = Number(cb.value);
      if (Number.isFinite(v)) out.push(v);
    });
  return out;
}

/**
 * 渲染单月"按日期"不加班 checkbox 网格。
 * 仅在 year/month/restDayWeekday 变化（A 班日集合变化）时重建，避免勾选状态丢失。
 */
function ensureNoOvertimeDates(
  year: number,
  month: number,
  restDayWeekday: number,
): void {
  const container = getById("single-noot-dates");
  const sig = `${year}-${month}-${restDayWeekday}`;
  if (container.dataset.sig === sig) return;
  container.dataset.sig = sig;

  const aDays = getADayDates(year, month, restDayWeekday);
  if (aDays.length === 0) {
    container.innerHTML = `<p class="hint">本月无 A 班日。</p>`;
    return;
  }
  const items = aDays
    .map((d) => {
      const date = d.date();
      const overtime = !noOvertimeDateSet.has(noOtDateKey(year, month, date));
      return `<label><input type="checkbox" class="noot-date" value="${date}"${overtime ? " checked" : ""}> ${date}日(${WEEKDAY_NAMES[d.day()]})</label>`;
    })
    .join("");
  container.innerHTML = `<div class="checkbox-grid">${items}</div>`;

  container.querySelectorAll<HTMLInputElement>(".noot-date").forEach((cb) => {
    cb.addEventListener("change", () => {
      const date = Number(cb.value);
      const key = noOtDateKey(year, month, date);
      if (cb.checked) noOvertimeDateSet.delete(key); // 勾选 = 加班
      else noOvertimeDateSet.add(key); // 取消勾 = 不加班
      recalcSingle();
    });
  });
}

/* ============================================================
 * B班8h 设置（逐日勾选，默认11h）
 * ========================================================== */

const bDay8hSet = new Set<string>();

function bDay8hKey(y: number, m: number, date: number): string {
  return `b8-${y}-${m}-${date}`;
}

function readBDay8hDates(): number[] {
  const out: number[] = [];
  document
    .querySelectorAll<HTMLInputElement>("#single-bday8h-dates .bday8h-date:checked")
    .forEach((cb) => {
      const v = Number(cb.value);
      if (Number.isFinite(v)) out.push(v);
    });
  return out;
}

function ensureBDay8hDates(
  year: number,
  month: number,
  restDayWeekday: number,
): void {
  const container = getById("single-bday8h-dates");
  const sig = `${year}-${month}-${restDayWeekday}`;
  if (container.dataset.sig === sig) return;
  container.dataset.sig = sig;

  const bDays = getBDayDates(year, month, restDayWeekday);
  if (bDays.length === 0) {
    container.innerHTML = `<p class="hint">本月无 B 班日。</p>`;
    return;
  }
  const items = bDays
    .map((d) => {
      const date = d.date();
      const is8h = bDay8hSet.has(bDay8hKey(year, month, date));
      return `<label><input type="checkbox" class="bday8h-date" value="${date}"${is8h ? " checked" : ""}> ${date}日(${WEEKDAY_NAMES[d.day()]}) 仅8h</label>`;
    })
    .join("");
  container.innerHTML = `<div class="checkbox-grid">${items}</div>`;

  container.querySelectorAll<HTMLInputElement>(".bday8h-date").forEach((cb) => {
    cb.addEventListener("change", () => {
      const date = Number(cb.value);
      const key = bDay8hKey(year, month, date);
      if (cb.checked) bDay8hSet.add(key);
      else bDay8hSet.delete(key);
      recalcSingle();
    });
  });
}

/* ============================================================
 * 渲染
 * ========================================================== */

const SHIFT_LABEL = (r: MonthlyResult) =>
  r.shiftType === "night" ? "夜班" : "白班";

function renderSingleResult(r: MonthlyResult): void {
  getById("single-result").innerHTML = `
    <div class="stats-row">
      <div class="stat"><span class="stat-label">工作日</span><span class="stat-val">${r.totalWorkDays}</span></div>
      <div class="stat"><span class="stat-label">A班</span><span class="stat-val">${r.aDayCount}</span></div>
      <div class="stat"><span class="stat-label">B班</span><span class="stat-val">${r.bDayCount}</span></div>
      <div class="stat"><span class="stat-label">B班8h</span><span class="stat-val">${r.bDay8hCount}</span></div>
      <div class="stat"><span class="stat-label">F班(节假日)</span><span class="stat-val">${r.fDayCount}</span></div>
      <div class="stat"><span class="stat-label">休息</span><span class="stat-val">${WEEKDAY_NAMES[r.restDayWeekday]}</span></div>
      <div class="stat"><span class="stat-label">不加班</span><span class="stat-val">${r.noOvertimeCount}</span></div>
      <div class="stat"><span class="stat-label">白班</span><span class="stat-val">${r.totalWorkDays - r.nightShiftDays}</span></div>
      <div class="stat"><span class="stat-label">夜班</span><span class="stat-val">${r.nightShiftDays}</span></div>
      <div class="stat"><span class="stat-label">班次</span><span class="stat-val">${SHIFT_LABEL(r)}</span></div>
    </div>
    <table class="result-table">
      <thead>
        <tr><th>项目</th><th style="text-align:right">金额(元)</th></tr>
      </thead>
      <tbody>
        <tr><td>固定薪资合计</td><td style="text-align:right">${fmt(r.fixedTotal)}</td></tr>
        <tr><td>A班加班(3h×1.5倍)</td><td class="income" style="text-align:right">${fmt(r.weekdayOvertime)}</td></tr>
        <tr><td>B班双倍(${r.bDayCount - r.bDay8hCount}×11h ${r.bDay8hCount}×8h)</td><td class="income" style="text-align:right">${fmt(r.tuesdayDoublePay)}</td></tr>
        <tr><td>F班节假日(11h×3倍)</td><td class="income" style="text-align:right">${fmt(r.holidayExtra)}</td></tr>
        <tr><td>夜班补贴</td><td class="income" style="text-align:right">${fmt(r.nightSubsidy)}</td></tr>
        <tr class="total-row"><td>税前总工资</td><td style="text-align:right">${fmt(r.grossPay)}</td></tr>
        <tr><td>社保-养老(8%)</td><td class="deduction" style="text-align:right">-${fmt(r.socialInsurance.pension)}</td></tr>
        <tr><td>社保-医疗(2%)</td><td class="deduction" style="text-align:right">-${fmt(r.socialInsurance.medical)}</td></tr>
        <tr><td>社保-失业(0.3%)</td><td class="deduction" style="text-align:right">-${fmt(r.socialInsurance.unemployment)}</td></tr>
        <tr><td>社保-大额+长护</td><td class="deduction" style="text-align:right">-${fmt(r.socialInsurance.fixed)}</td></tr>
        <tr><td>个税(3%)</td><td class="deduction" style="text-align:right">-${fmt(r.tax)}</td></tr>
      </tbody>
    </table>
    <div class="net-pay-wrap">
      <span class="net-label">到手工资</span>
      <span class="net-pay">${fmt(r.netPay)}</span>
    </div>`;
  getById<HTMLButtonElement>("single-copy").style.display = "inline-block";
}

let multiPage = 0;

function renderMultiResult(s: MultiMonthSummary): void {
  const resultsEl = getById("multi-results");
  const summaryEl = getById("multi-summary");
  const copyBtn = getById<HTMLButtonElement>("multi-copy");

  if (s.results.length === 0) {
    resultsEl.innerHTML = `<p class="empty-tip">请选择有效的日期区间（结束月份需不早于起始月份）。</p>`;
    summaryEl.innerHTML = "";
    copyBtn.style.display = "none";
    return;
  }

  const pageSize = 6;
  const pageCount = Math.ceil(s.results.length / pageSize);
  if (multiPage >= pageCount) multiPage = 0;
  if (multiPage < 0) multiPage = 0;
  const startIdx = multiPage * pageSize;
  const pageItems = s.results.slice(startIdx, startIdx + pageSize);

  const rows = pageItems
    .map(
      (r) => `<tr>
        <td>${r.year}/${String(r.month).padStart(2, "0")}</td>
        <td style="text-align:center">${r.totalWorkDays}</td>
        <td style="text-align:center">${r.aDayCount}</td>
        <td style="text-align:center">${r.bDayCount}</td>
        <td style="text-align:center">${r.fDayCount}</td>
        <td style="text-align:center">${SHIFT_LABEL(r)}</td>
        <td style="text-align:right">${fmt(r.grossPay)}</td>
        <td class="deduction" style="text-align:right">-${fmt(r.socialInsurance.total)}</td>
        <td class="deduction" style="text-align:right">-${fmt(r.tax)}</td>
        <td class="income" style="text-align:right">${fmt(r.netPay)}</td>
      </tr>`,
    )
    .join("");

  let paginationHtml = "";
  if (pageCount > 1) {
    paginationHtml = `<div class="pagination">${Array.from(
      { length: pageCount },
      (_, i) =>
        `<button class="page-btn${i === multiPage ? " active" : ""}" data-page="${i}">第 ${i + 1} 页</button>`,
    ).join("")}</div>`;
  }

  resultsEl.innerHTML = `
    <table class="result-table">
      <thead>
        <tr>
          <th>月份</th><th>工作日</th><th>A班</th><th>B班</th><th>F班</th><th>班次</th>
          <th style="text-align:right">税前</th><th style="text-align:right">社保</th>
          <th style="text-align:right">个税</th><th style="text-align:right">到手</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${paginationHtml}`;

  resultsEl.querySelectorAll<HTMLButtonElement>(".page-btn").forEach((b) => {
    b.addEventListener("click", () => {
      const p = Number(b.dataset.page);
      if (Number.isFinite(p)) {
        multiPage = p;
        renderMultiResult(s);
      }
    });
  });

  summaryEl.innerHTML = `
    <div class="summary-item"><span class="summary-label">总税前</span><span class="summary-val">${fmt(s.totalGross)}</span></div>
    <div class="summary-item"><span class="summary-label">总社保</span><span class="summary-val deduction">${fmt(s.totalSocial)}</span></div>
    <div class="summary-item"><span class="summary-label">总个税</span><span class="summary-val deduction">${fmt(s.totalTax)}</span></div>
    <div class="summary-item"><span class="summary-label">总到手</span><span class="summary-val income">${fmt(s.totalNet)}</span></div>
    <div class="summary-item"><span class="summary-label">月均到手</span><span class="summary-val income" style="font-size:1.2rem">${fmt(s.averageNet)}</span></div>`;

  copyBtn.style.display = "inline-block";
}

/* ============================================================
 * 计算入口
 * ========================================================== */

let lastSingle: MonthlyResult | null = null;
let lastMulti: MultiMonthSummary | null = null;

function recalcSingle(): void {
  const year = validateNumber("single-year", yearSchema, 2026);
  const month = validateNumber("single-month", monthSchema, 7);
  const restDayWeekday = readRestDayWeekday("single-restday-weekday");
  ensureNoOvertimeDates(year, month, restDayWeekday);
  ensureBDay8hDates(year, month, restDayWeekday);
  const noOvertimeDates = readNoOvertimeDates();
  const noOvertimeWeekdays = readNoOvertimeWeekdays("single-noot-weekdays");
  const config = readConfig("single");
  const shiftType = readShiftType("single-shift");
  const bDay8hDates = readBDay8hDates();
  // 上月班次 = 当月相反（第一个休息日之前沿用）
  const prevShiftType: ShiftType = shiftType === "night" ? "day" : "night";
  lastSingle = calcMonthlySalary({
    year,
    month,
    restDayWeekday,
    shiftType,
    prevShiftType,
    bDay8hDates,
    noOvertimeDates,
    noOvertimeWeekdays,
    config,
  });
  renderSingleResult(lastSingle);
}

function recalcMulti(): void {
  const start = readMonth("multi-start", 2026, 1);
  const end = readMonth("multi-end", 2026, 12);
  const months = enumerateMonths(start, end);
  ensureRestdayWeekdayInputs(months);
  ensureShiftInputs(months);
  const restDayWeekday = readRestdayWeekdays(months);
  const shiftType = readShiftTypes(months);
  const noOvertimeWeekdays = readNoOvertimeWeekdays("multi-noot-weekdays");
  const config = readConfig("multi");
  const bDay8hDates = readBDay8hDates();
  lastMulti = calcMultiMonth(
    start.year,
    start.month,
    end.year,
    end.month,
    config,
    restDayWeekday,
    shiftType,
    bDay8hDates,
    noOvertimeWeekdays,
    [],
  );
  multiPage = 0;
  renderMultiResult(lastMulti);
}

/* ============================================================
 * 复制
 * ========================================================== */

function formatSingleText(r: MonthlyResult): string {
  return [
    `【${r.year}年${r.month}月 工资明细】`,
    `班次：${SHIFT_LABEL(r)} | 工作日 ${r.totalWorkDays} 天 | A班 ${r.aDayCount} | B班 ${r.bDayCount} | F班(节假日) ${r.fDayCount} | 休息${WEEKDAY_NAMES[r.restDayWeekday]} | 不加班 ${r.noOvertimeCount} 天 | 夜班 ${r.nightShiftDays} 天`,
    ``,
    `固定薪资：${fmt(r.fixedTotal)}`,
    `A班加班(3h×1.5)：${fmt(r.weekdayOvertime)}`,
    `B班双倍(${r.bDayCount - r.bDay8hCount}×11h ${r.bDay8hCount}×8h)：${fmt(r.tuesdayDoublePay)}`,
    `F班节假日(11h×3)：${fmt(r.holidayExtra)}`,
    `夜班补贴：${fmt(r.nightSubsidy)}`,
    `税前总工资：${fmt(r.grossPay)}`,
    `社保扣款：-${fmt(r.socialInsurance.total)}（养老 ${fmt(r.socialInsurance.pension)} / 医疗 ${fmt(r.socialInsurance.medical)} / 失业 ${fmt(r.socialInsurance.unemployment)} / 大额长护 ${fmt(r.socialInsurance.fixed)}）`,
    `个税：-${fmt(r.tax)}`,
    `到手工资：${fmt(r.netPay)}`,
  ].join("\n");
}

function formatMultiText(s: MultiMonthSummary): string {
  const lines = ["【多月工资汇总】"];
  s.results.forEach((r) => {
    lines.push(
      `${r.year}-${String(r.month).padStart(2, "0")} | 工作日 ${r.totalWorkDays}(A${r.aDayCount}/B${r.bDayCount}/F${r.fDayCount}) | 税前 ${fmt(r.grossPay)} | 社保 ${fmt(r.socialInsurance.total)} | 个税 ${fmt(r.tax)} | 到手 ${fmt(r.netPay)}`,
    );
  });
  lines.push(
    "",
    `总税前：${fmt(s.totalGross)}`,
    `总社保：${fmt(s.totalSocial)}`,
    `总个税：${fmt(s.totalTax)}`,
    `总到手：${fmt(s.totalNet)}`,
    `月均到手：${fmt(s.averageNet)}`,
  );
  return lines.join("\n");
}

/** execCommand 兜底（非 HTTPS 环境下 clipboard API 不可用时） */
function fallbackCopy(text: string): void {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } catch {
    /* 忽略 */
  }
  document.body.removeChild(ta);
}

async function copyText(text: string, btn: HTMLButtonElement): Promise<void> {
  const original = btn.textContent ?? "";
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      fallbackCopy(text);
    }
  } catch {
    fallbackCopy(text);
  }
  btn.textContent = "✅ 已复制！";
  window.setTimeout(() => {
    btn.textContent = original;
  }, 2000);
}

/* ============================================================
 * Tab 切换
 * ========================================================== */

function setupTabs(): void {
  document.querySelectorAll<HTMLButtonElement>(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      if (!tab) return;
      document.querySelectorAll<HTMLButtonElement>(".tab").forEach((b) => {
        b.classList.toggle("active", b === btn);
      });
      document.querySelectorAll<HTMLElement>(".tab-content").forEach((sec) => {
        sec.classList.toggle("active", sec.id === `tab-${tab}`);
      });
    });
  });
}

/* ============================================================
 * 事件绑定 / 初始化
 * ========================================================== */

const SINGLE_INPUTS = [
  "single-year",
  "single-month",
  "single-base",
  "single-position",
  "single-attendance",
  "single-performance",
];

const MULTI_INPUTS = [
  "multi-start",
  "multi-end",
  "multi-base",
  "multi-position",
  "multi-attendance",
  "multi-performance",
];

function init(): void {
  // 单月：实时计算
  SINGLE_INPUTS.forEach((id) => {
    getById<HTMLInputElement>(id).addEventListener("input", recalcSingle);
  });
  // 单月：C 班周几下拉
  getById<HTMLSelectElement>("single-restday-weekday").addEventListener(
    "change",
    recalcSingle,
  );
  // 单月：班次切换
  getById<HTMLSelectElement>("single-shift").addEventListener("change", recalcSingle);
  // 单月：不加班周几
  document
    .querySelectorAll<HTMLInputElement>("#single-noot-weekdays input")
    .forEach((cb) => cb.addEventListener("change", recalcSingle));

  // 多月：实时计算
  MULTI_INPUTS.forEach((id) => {
    getById<HTMLInputElement>(id).addEventListener("input", recalcMulti);
  });
  // 多月：不加班周几
  document
    .querySelectorAll<HTMLInputElement>("#multi-noot-weekdays input")
    .forEach((cb) => cb.addEventListener("change", recalcMulti));
  // 班次模式切换
  document
    .querySelectorAll<HTMLInputElement>('input[name="shift-mode"]')
    .forEach((radio) => {
      radio.addEventListener("change", () => {
        const checked = document.querySelector<HTMLInputElement>(
          'input[name="shift-mode"]:checked',
        );
        shiftMode = (checked?.value as ShiftMode) ?? "flip";
        recalcMulti();
      });
    });

  // 休息日模式切换
  document
    .querySelectorAll<HTMLInputElement>('input[name="restday-mode"]')
    .forEach((radio) => {
      radio.addEventListener("change", () => {
        const checked = document.querySelector<HTMLInputElement>(
          'input[name="restday-mode"]:checked',
        );
        restdayMode = (checked?.value as RestdayMode) ?? "uniform";
        recalcMulti();
      });
    });

  // 复制按钮
  getById<HTMLButtonElement>("single-copy").addEventListener("click", () => {
    if (lastSingle) void copyText(formatSingleText(lastSingle), getById<HTMLButtonElement>("single-copy"));
  });
  getById<HTMLButtonElement>("multi-copy").addEventListener("click", () => {
    if (lastMulti) void copyText(formatMultiText(lastMulti), getById<HTMLButtonElement>("multi-copy"));
  });

  setupTabs();

  // 首次计算
  recalcSingle();
  recalcMulti();
}

document.addEventListener("DOMContentLoaded", init);
