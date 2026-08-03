import { useState } from "react";
import type { UserSettings } from "../utils/settings";
import { yuanToCents } from "../utils/format";
import { GlobalSettingsFields, INPUT } from "./ui";

export function Settings({
  settings,
  onSettings,
}: {
  settings: UserSettings;
  onSettings: (s: UserSettings) => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, string | null>>({});
  const [confirmClear, setConfirmClear] = useState(false);

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
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">全局设置</h3>
        <GlobalSettingsFields settings={settings} onSettings={onSettings} />
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">个税参数</h3>
          <button
            onClick={() => setConfirmClear(true)}
            className="text-xs px-2 py-1 rounded-md border border-rose-300 dark:border-rose-800 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
          >
            清除数据
          </button>
        </div>
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
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 pt-4 text-center space-y-2">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">制作信息</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Made by Gakusyun</p>
        <div className="flex justify-center gap-2 flex-wrap">
          <span className="text-xs bg-sky-50 dark:bg-sky-900/30 text-sky-600 px-2.5 py-1 rounded-full border border-sky-100 dark:border-sky-800">Hermes</span>
          <span className="text-xs bg-sky-50 dark:bg-sky-900/30 text-sky-600 px-2.5 py-1 rounded-full border border-sky-100 dark:border-sky-800">DeepSeek V4 Pro</span>
          <span className="text-xs bg-sky-50 dark:bg-sky-900/30 text-sky-600 px-2.5 py-1 rounded-full border border-sky-100 dark:border-sky-800">GLM 5.2</span>
        </div>
      </div>

      {confirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-xl max-w-sm w-full space-y-3">
            <div className="space-y-1">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">确认清除数据</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">将清除所有本地设置，且无法恢复</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-black text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => { localStorage.clear(); location.reload(); }}
                className="px-4 py-2 rounded-lg bg-rose-600 border border-rose-600 text-white text-sm font-medium hover:bg-rose-700 transition-colors"
              >
                确认清除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
