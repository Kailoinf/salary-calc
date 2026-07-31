export type TabId = "manual" | "single" | "multi" | "settings";

const TABS: { id: TabId; label: string }[] = [
  { id: "manual", label: "手动算薪" },
  { id: "single", label: "单月计算" },
  { id: "multi", label: "多月批量" },
  { id: "settings", label: "设置" },
];

export function Tabs({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (t: TabId) => void;
}) {
  return (
    <nav className="flex flex-wrap gap-2">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors " +
            (active === t.id
              ? "bg-sky-600 text-white shadow-sm"
              : "bg-white dark:bg-black text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800")
          }
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
