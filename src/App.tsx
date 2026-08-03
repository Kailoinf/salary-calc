import { useCallback, useState } from "react";
import type { UserSettings } from "./utils/settings";
import { loadSettings, saveSettings } from "./utils/settings";
import { setCurrentSettings } from "./utils/salary";
import { ManualCalc } from "./components/ManualCalc";
import { Settings } from "./components/Settings";
import { GlobalSettingsFields } from "./components/ui";

/**
 * 薪资构成 + 个税参数为全局共享状态：手动算薪 / 设置弹层 / 欢迎弹窗 三处双向同步，
 * 持久化到 localStorage。每次变更须同步写入模块级个税阈值/税率
 * (setCurrentSettings)，calc* 才会用新值。
 */
export default function App() {
  const [settings, setSettings] = useState<UserSettings>(() => {
    const s = loadSettings();
    setCurrentSettings(s);
    return s;
  });
  const [showWelcome, setShowWelcome] = useState(
    () =>
      localStorage.getItem("salary-calc-settings") === null &&
      localStorage.getItem("salary-calc-welcomed") === null,
  );
  const [showSettings, setShowSettings] = useState(false);

  const updateSettings = useCallback((s: UserSettings) => {
    setSettings(s);
    setCurrentSettings(s);
    saveSettings(s);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-black text-slate-800 dark:text-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-5">
        <ManualCalc
          settings={settings}
          onSettings={updateSettings}
          onOpenSettings={() => setShowSettings(true)}
        />

        <footer className="text-center text-xs text-slate-300 dark:text-slate-600 pt-4 space-y-1">
          <a href="https://beian.miit.gov.cn" target="_blank" rel="noreferrer" className="hover:text-slate-400">鄂ICP备2024069158号</a>
          <div className="inline-flex items-center gap-1">
            <img src="https://start.gxj62.cn/police.webp" alt="公安备案" className="w-3.5 h-4 inline" />
            <a href="https://beian.mps.gov.cn" target="_blank" rel="noreferrer" className="hover:text-slate-400">鄂公网安备42050002420933号</a>
          </div>
        </footer>
      </div>

      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-xl max-w-md w-full space-y-3">
            <div className="space-y-1">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">欢迎使用工资计算器</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">首次使用请先设置薪资构成、休息日和社保个税</p>
            </div>
            <GlobalSettingsFields settings={settings} onSettings={updateSettings} />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem("salary-calc-welcomed", "1");
                  setShowWelcome(false);
                }}
                className="px-4 py-2 rounded-lg bg-sky-600 border border-sky-600 text-white text-sm font-medium"
              >
                开始使用
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-xl max-w-xl w-full my-8">
            <Settings settings={settings} onSettings={updateSettings} />
            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-black text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
