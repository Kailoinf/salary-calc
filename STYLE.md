# 工资计算器 · 样式规范

> 使用 Tailwind CSS v4，所有样式通过 utility class 实现。`src/style.css` 仅含 `@import "tailwindcss"` 与全局隐藏滚动条（`html::-webkit-scrollbar { display: none }`）。

## 色彩

仅用 Tailwind 默认色系，不自定义颜色：

| 用途 | Tailwind class |
|------|---------------|
| 页面/卡片背景 | `bg-white`（深色 `dark:bg-black`） |
| 正文文字 | `text-slate-800` / `text-slate-900` |
| 次要文字 | `text-slate-500` / `text-slate-600` |
| 标题文字 | `text-slate-700` / `text-slate-900` |
| 强调色（主按钮/聚焦环） | `sky` 系列（`bg-sky-600`, `border-sky-500`, `text-sky-600`） |
| 收入金额 | `text-emerald-600` |
| 扣款金额 | `text-rose-500` |
| 到手工资框 | `bg-emerald-50 border-emerald-200` |
| 危险操作（清除数据） | `rose` 系列（`text-rose-500`, `border-rose-300`） |
| 边框/分割线 | `border-slate-200` / `border-slate-700` |

## 组件复用

使用 `src/components/ui.tsx` 中的共享组件，不要重复写相同结构：

- `Card` — 白色圆角卡片容器（`space-y-3 p-4`，可带右上角 action）
- `Field` — 通用输入字段（label + 子元素）
- `SalaryFields` — 4 项薪资构成输入（失焦提交，全局同步）
- `GlobalSettingsFields` — 薪资构成 + C班休息日 + 社保/个税开关（设置弹层与欢迎弹窗共用）
- `MoneyTable` — 收支明细表（income 绿 / deduction 红 / total 加粗）
- `NetPay` — 到手工资高亮框
- `DeductionToggles` — 不交社保/个税 checkbox
- `SmallBtn` — 卡片右上角小按钮（设置/导出）
- `exportSalaryImage` — canvas 导出 PNG

## 输入框

统一样式，使用 `INPUT` 常量：

```
px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 text-sm
focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 w-full
```

## 间距

| 用途 | class |
|------|-------|
| 页面容器 padding | `px-4 py-6` |
| 页面卡片间间距 | `space-y-5` |
| 卡片内间距 | `space-y-3` |
| 弹窗与卡片一致 | `p-4 space-y-3` |
| 网格间距 | `gap-3` |
| 卡片 padding | `p-4` |

## 圆角

| 元素 | class |
|------|-------|
| 卡片/弹窗 | `rounded-xl` |
| 按钮 | `rounded-lg` |
| 输入框/select | `rounded-md` |
| checkbox | `rounded` |

## 弹窗

- 遮罩：`fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4`，内层 `flex min-h-full items-center justify-center`（内容超高时可滚动）
- 内卡：`bg-white dark:bg-black rounded-xl border ... p-4 shadow-xl`（欢迎 `max-w-md`、设置 `max-w-xl`、确认 `max-w-sm`）
- 确认清除弹窗用 `createPortal` 渲染到 `document.body`，`z-[60]`，避免影响设置弹层布局
- 弹窗打开时锁定页面滚动（App 层 `document.body.style.overflow`）

## 禁止事项

- ❌ 不要在 `style.css` 中写自定义 CSS（全局滚动条隐藏除外）
- ❌ 不要用 inline style
- ❌ 不要引入新的颜色值——只用 Tailwind 默认 slate/sky/emerald/rose
- ❌ 不要自建新的共享组件——先看 `ui.tsx` 是否已有
