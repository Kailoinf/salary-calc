# 工资计算器 · 样式规范

> 所有 CSS 规则定义在 `src/style.css`。HTML 中禁止 inline style。颜色、间距、字号一律通过 CSS 变量引用。

---

## 1. CSS 变量（`:root`）

### 颜色

| 变量 | 值 | 用途 |
|---|---|---|
| `--text` | `#1f2937` | 正文颜色 |
| `--text-secondary` | `#6b7280` | 次要文字（标签、提示） |
| `--bg` | `#f3f4f6` | 页面背景 |
| `--card-bg` | `#ffffff` | 卡片/输入框背景 |
| `--border` | `#e5e7eb` | 边框、分割线 |
| `--accent` | `#3b82f6` | 主色调（激活态、按钮） |
| `--accent-light` | `rgba(59,130,246,0.06)` | 浅色强调背景 |
| `--accent-ring` | `rgba(59,130,246,0.1)` | 聚焦外发光 |
| `--income` | `#16a34a` | 收入/正向金额 |
| `--deduction` | `#dc2626` | 扣款/负向金额 |
| `--summary-bg` | `#f0fdf4` | 汇总框背景 |
| `--summary-border` | `#bbf7d0` | 汇总框边框 |
| `--shadow` | `0 1px 3px rgba(0,0,0,0.1)` | 卡片阴影 |

### 规则
- 所有颜色必须通过变量引用，禁止硬编码 hex/rgba。
- 新增颜色先在 `:root` 定义变量，再使用。

---

## 2. 间距

| Token | 值 | 典型用途 |
|---|---|---|
| `4px` | 微小间距 | h1 margin-bottom |
| `6px` | 内间距 | radio/checkbox label gap |
| `8px` | 小间距 | grid gap, h3 bottom |
| `10px` | 中小间距 | stat gap, hint bottom |
| `12px` | 中间距 | form-row gap, h2 bottom |
| `14px` | 中下间距 | checkbox-row bottom |
| `16px` | 标准间距 | card gap, container padding |
| `20px` | 大间距 | card padding |
| `24px` | 特大间距 | header bottom |

### 规则
- 间距只用以上 10 个值，不引入新值。
- 元素之间优先用 `margin-bottom`（而非 `margin-top`），特殊情况（如 `.restday-mode`）用 `margin-top + :first-of-type` 归零。

---

## 3. 圆角

| Token | 用途 |
|---|---|
| `8px` | 输入框、按钮、stat、summary-box、page-btn |
| `12px` | 卡片 `.card` |

### 规则
- 两档制：小元素 8px，大容器 12px。
- 不引入第三个值。

---

## 4. 字号

| Token | 用途 |
|---|---|
| `0.75rem` | stat-label, error-msg |
| `0.8rem` | hint |
| `0.85rem` | result-table th, checkbox-grid label |
| `0.875rem` | label（表单字段名） |
| `0.9rem` | page-btn, restday-mode label, checkbox-row label, empty-tip |
| `0.95rem` | net-label, summary-box, no-ot-section h3 |
| `1rem` | body, input, select, tab, btn-copy |
| `1.1rem` | h2 |
| `1.15rem` | stat-val |
| `1.5rem` | net-pay（到手工资） |
| `1.8rem` | h1 |

### 规则
- 新元素优先复用已有字号，不引入新值。
- `rem` 单位，不混用 `px`/`em`。

---

## 5. 过渡动画

- 所有交互过渡统一 `0.15s`。
- 属性按需指定（不要 `transition: all`）。

---

## 6. HTML 结构规范

### 页面骨架
```html
<div class="container">
  <header><h1>💰 标题</h1></header>
  <nav class="tabs">
    <button class="tab active" data-tab="xxx">标签名</button>
  </nav>
  <section id="tab-xxx" class="tab-content active">
    <div class="card">...</div>
  </section>
</div>
```

### 卡片内部
```html
<div class="card">
  <h2>📅 区块标题</h2>
  <div class="form-row">
    <label>字段名 <input ...></label>
  </div>
</div>
```

### 复选/单选
```html
<!-- 横向排列 -->
<div class="checkbox-row">
  <label><input type="checkbox" value="0"> 周日</label>
</div>

<!-- 网格排列 -->
<div class="checkbox-grid">
  <label><input type="checkbox" value="1"> 1日(周一)</label>
</div>

<!-- Radio 模式选择 -->
<div class="restday-mode">
  <label><input type="radio" name="mode" value="a"> 选项A</label>
  <label><input type="radio" name="mode" value="b"> 选项B</label>
</div>
```

### 结果区
```html
<div class="card result-card">
  <h2>📊 计算结果</h2>
  <div id="xxx-result">
    <!-- JS 动态渲染 .stats-row / table.result-table / .net-pay-wrap -->
  </div>
</div>
<button class="btn-copy">📋 复制</button>
```

---

## 7. 禁止事项

- ❌ **inline style**（`style="..."`）——一律用 class。唯一例外是 JS 动态切换 `display:none`。
- ❌ **硬编码颜色**——必须用 CSS 变量。
- ❌ **新单位**——字号只用 `rem`，间距只用 `px`，不混用。
- ❌ **引入新间距/字号值**——复用已有 token。
- ❌ **裸 `h3`**——h3 目前只在 `.no-ot-section h3` 有样式。如果新位置用 h3，要在对应容器作用域内定义。
- ❌ **不必要的说明文字**——界面文字保持简洁，不用括号注释解释交互逻辑。

---

## 8. CSS 文件组织

按区块分节，节头格式：
```css
/* ===== 区块名 ===== */
```

当前区块顺序：
1. 颜色系统 / 设计变量
2. 全局 Reset
3. 布局（container, header, h1, h2）
4. Tab 切换
5. 卡片
6. 表单
7. 结果统计行
8. 结果表格
9. 复制按钮
10. 汇总框
11. 分页
12. 休息日模式
13. 不加班设置
14. 空状态提示
15. 响应式

新增样式追加到对应区块，无对应区块则在响应式之前新建。

---

## 9. 响应式

断点：`max-width: 640px`。只覆盖布局关键项（h1 字号、form-row 列数、tabs 方向），不在移动端新增隐藏/显示逻辑。
