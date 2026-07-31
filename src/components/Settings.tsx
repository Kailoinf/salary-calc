import { useState } from "react";
import type { UserSettings } from "../utils/settings";
import { yuanToCents } from "../utils/format";
import { Card, INPUT, SalaryFields } from "./ui";

export function Settings({
  settings,
  onSettings,
  onReset,
}: {
  settings: UserSettings;
  onSettings: (s: UserSettings) => void;
  onReset: () => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, string | null>>({});

  const taxFields = [
    {
      key: "taxThreshold" as const,
      label: "个税起征点",
      step: "100",
      min: 0,
      max: undefined as number | undefined,
      toValue: (settings: UserSettings) => String(settings.taxThreshold / 100),
      fromValue: (v: number, s: UserSettings) => ({ ...s, taxThreshold: yuanToCents(v) }),
    },
    {
      key: "taxRate" as const,
      label: "个税税率",
      step: "0.001",
      min: 0,
      max: 1,
      toValue: (settings: UserSettings) => String(settings.taxRate),
      fromValue: (v: number, s: UserSettings) => ({ ...s, taxRate: v }),
    },
  ];

  return (
    <div className="space-y-4">
      <Card title="💰 薪资构成">
        <SalaryFields settings={settings} onSettings={onSettings} />
      </Card>

      <Card title="🏥 社保个税">
        <div className="grid grid-cols-2 gap-3">
          {taxFields.map((f) => {
            const draft = drafts[f.key];
            const display = draft !== null && draft !== undefined ? draft : f.toValue(settings);
            return (
              <label key={f.key} className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
                {f.label}
                <input
                  type="number"
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  value={display}
                  onFocus={() => setDrafts((prev) => ({ ...prev, [f.key]: f.toValue(settings) }))}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  onBlur={() => {
                    const raw = drafts[f.key];
                    if (raw === null || raw === undefined) return;
                    const v = Number(raw);
                    if (Number.isFinite(v) && v >= f.min && (f.max === undefined || v <= f.max))
                      onSettings(f.fromValue(v, settings));
                    setDrafts((prev) => ({ ...prev, [f.key]: null }));
                  }}
                  className={INPUT}
                />
              </label>
            );
          })}
        </div>
        <button
          onClick={onReset}
          className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-black text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
        >
          ↩️ 恢复默认
        </button>
      </Card>

      <Card title="📝 制作信息">
        <div className="text-center space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Made by Gakusyun</p>
          <div className="flex justify-center gap-2 flex-wrap">
            <span className="text-xs bg-sky-50 dark:bg-sky-900/30 text-sky-600 px-2.5 py-1 rounded-full border border-sky-100 dark:border-sky-800">Hermes</span>
            <span className="text-xs bg-sky-50 dark:bg-sky-900/30 text-sky-600 px-2.5 py-1 rounded-full border border-sky-100 dark:border-sky-800">DeepSeek V4 Pro</span>
            <span className="text-xs bg-sky-50 dark:bg-sky-900/30 text-sky-600 px-2.5 py-1 rounded-full border border-sky-100 dark:border-sky-800">GLM 5.2</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
