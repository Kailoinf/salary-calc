# 💰 工资计算器

基于排班的工资计算工具，支持手动/单月/多月三种模式，含五险一金与个税。

## 技术栈

React 19 · TypeScript · Tailwind CSS v4 · Vite · dayjs · lunar-typescript

## 快速开始

```bash
pnpm install
pnpm dev      # http://localhost:5173
pnpm build    # 输出到 dist/
```

## 功能

| 模块 | 说明 |
|------|------|
| **✏️ 手动算薪** | 直接输入加班/B班/F班小时 + 夜班天数，即时计算 |
| **📅 单月计算** | 选年月 + 排班，自动识别 A/B/F 班与中国法定节假日 |
| **📊 多月批量** | 跨月区间，分页表格 + 汇总统计 |
| **⚙️ 设置** | 薪资构成全局同步，个税起征点/税率可调 |

## 排班体系

| 班型 | 含义 | 加班计算 |
|------|------|----------|
| A 班 | 普通工作日 | 3h × 1.5 倍时薪 |
| B 班 | C 班前一天 | 11h（或 8h）× 2 倍时薪 |
| C 班 | 固定休息日 | 休息 |
| F 班 | 法定节假日 | 11h × 3 倍时薪 |

时薪 = 底薪 ÷ 21.75 ÷ 8。夜班补贴 20 元/天。

## 工资公式

```
固定薪资 = 底薪 + 岗位工资 + 全勤奖 + 绩效工资
税前 = 固定薪资 + Σ 加班费 + 夜班补贴
社保 = 442.80 元（固定）
个税 = (税前 - 起征点 - 社保) × 税率
到手 = 税前 - 社保 - 个税
```

## 项目结构

```
src/
├── types.ts              # TS 类型定义
├── App.tsx               # 根组件，Tab 路由 + settings 状态
├── main.tsx              # React 入口
├── components/
│   ├── Header.tsx        # 标题栏
│   ├── Tabs.tsx          # Tab 切换
│   ├── ManualCalc.tsx    # 手动算薪
│   ├── SingleCalc.tsx    # 单月计算
│   ├── MultiCalc.tsx     # 多月批量
│   ├── Settings.tsx      # 设置
│   └── ui.tsx            # 共享组件（Card/MoneyTable/SalaryFields 等）
├── utils/
│   ├── salary.ts         # 薪资计算核心
│   ├── date.ts           # 日期/排班逻辑
│   ├── settings.ts       # localStorage 持久化
│   ├── holidays.ts       # 法定节假日（lunar-typescript）
│   └── format.ts         # 金额格式化/元分换算
└── style.css             # 仅 @import "tailwindcss"
```

## 部署

Vercel（自动从 GitHub 导入，构建命令 `pnpm build`，输出目录 `dist`）。
