import type { UserSettings } from "../utils/settings";
import { yuanToCents } from "../utils/format";
import { Card, SalaryFields } from "./ui";

const INPUT =
  "px-2 py-1.5 rounded-md border border-slate-300 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 w-full";

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
          <label className="flex flex-col gap-1 text-sm text-slate-600">
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
          <label className="flex flex-col gap-1 text-sm text-slate-600">
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
          className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors"
        >
          ↩️ 恢复默认
        </button>
      </Card>
    </div>
  );
}
