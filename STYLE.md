# 工资计算器 · 样式规范

> 使用 Tailwind CSS v4，所有样式通过 utility class 实现。`src/style.css` 仅含 `@import "tailwindcss"`。

## 色彩

仅用 Tailwind 默认色系，不自定义颜色：

| 用途 | Tailwind class |
|------|---------------|
| 页面背景 | `bg-white` |
| 卡片背景 | `bg-white` |
| 卡片内小框 | `bg-slate-50` |
| 正文文字 | `text-slate-800` |
| 次要文字 | `text-slate-500` / `text-slate-600` |
| 强调色（按钮/链接/聚焦环/Tab 激活） | `sky` 系列（`bg-sky-600`, `border-sky-500`, `text-sky-600`） |
| 收入金额 | `text-emerald-600` |
| 扣款金额 | `text-rose-500` |
| 到手工资框 | `bg-emerald-50 border-emerald-200` |
| 边框/分割线 | `border-slate-200` |

## 组件复用

使用 `src/components/ui.tsx` 中的共享组件，不要在不同 Tab 中重复写相同结构：

- `Card` — 白色圆角卡片容器
- `SalaryFields` — 4 项薪资输入（全局同步）
- `MoneyTable` — 收支明细表（自动着色）
- `NetPay` — 到手工资高亮框
- `DeductionToggles` — 不交社保/个税 checkbox

## 输入框

统一样式：

```
px-2 py-1.5 rounded-md border border-slate-300 text-sm
focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 w-full
```

## 间距

| 用途 | class |
|------|-------|
| 页面容器 padding | `px-4 py-6` |
| Tab 间垂直间距 | `space-y-4` |
| 卡片内间距 | `space-y-3` |
| 网格间距 | `gap-2` / `gap-3` |
| 小元素内边距 | `px-2 py-1.5` |
| 卡片 padding | `p-4` / `p-6` |

## 圆角

| 元素 | class |
|------|-------|
| 卡片 | `rounded-xl` |
| 按钮 | `rounded-lg` |
| 输入框/select | `rounded-md` |
| checkbox/radio | `rounded` |
| 小统计框 | `rounded-lg` |

## 禁止事项

- ❌ 不要在 `style.css` 中写任何自定义 CSS
- ❌ 不要用 inline style
- ❌ 不要引入新的颜色值——只用 Tailwind 默认 slate/sky/emerald/rose
- ❌ 不要自建新的共享组件——先看 `ui.tsx` 是否已有
