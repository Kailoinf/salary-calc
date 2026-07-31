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
  return (
    <div className="space-y-4">
      <Card title="💰 薪资构成">
        <SalaryFields settings={settings} onSettings={onSettings} />
      </Card>

      <Card title="🏥 社保个税">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
            个税起征点
            <input
              type="number"
              min={0}
              step={100}
              value={settings.taxThreshold / 100}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) onSettings({ ...settings, taxThreshold: yuanToCents(v) });
              }}
              className={INPUT}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
            个税税率
            <input
              type="number"
              min={0}
              max={1}
              step={0.001}
              value={settings.taxRate}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) onSettings({ ...settings, taxRate: v });
              }}
              className={INPUT}
            />
          </label>
        </div>
        <button
          onClick={onReset}
          className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-black text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
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
