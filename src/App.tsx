import { useCallback, useState } from "react";
import type { UserSettings } from "./utils/settings";
import { loadSettings, saveSettings, resetSettings } from "./utils/settings";
import { setCurrentSettings } from "./utils/salary";
import { Header } from "./components/Header";
import { Tabs } from "./components/Tabs";
import type { TabId } from "./components/Tabs";
import { ManualCalc } from "./components/ManualCalc";
import { SingleCalc } from "./components/SingleCalc";
import { MultiCalc } from "./components/MultiCalc";
import { Settings } from "./components/Settings";

/**
 * 薪资构成 + 个税参数为全局共享状态：单月/多月/手动/设置四处双向同步，
 * 持久化到 localStorage。每次变更须同步写入模块级个税阈值/税率
 * (setCurrentSettings)，calc* 才会用新值。
 */
export default function App() {
  const [settings, setSettings] = useState<UserSettings>(() => {
    const s = loadSettings();
    setCurrentSettings(s);
    return s;
  });
  const [tab, setTab] = useState<TabId>("manual");

  const updateSettings = useCallback((s: UserSettings) => {
    setSettings(s);
    setCurrentSettings(s);
    saveSettings(s);
  }, []);

  const reset = useCallback(() => {
    const s = resetSettings();
    setSettings(s);
    setCurrentSettings(s);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-black text-slate-800 dark:text-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-5">
        <Header />
        <Tabs active={tab} onChange={setTab} />

        {tab === "manual" && (
          <ManualCalc settings={settings} onSettings={updateSettings} />
        )}
        {tab === "single" && (
          <SingleCalc settings={settings} onSettings={updateSettings} />
        )}
        {tab === "multi" && (
          <MultiCalc settings={settings} onSettings={updateSettings} />
        )}
        {tab === "settings" && (
          <Settings
            settings={settings}
            onSettings={updateSettings}
            onReset={reset}
          />
        )}

        <footer className="text-center text-xs text-slate-300 dark:text-slate-600 pt-4 space-y-1">
          <div>
            <a href="https://beian.miit.gov.cn" target="_blank" rel="noreferrer" className="hover:text-slate-400">鄂ICP备2024069158号</a>
          </div>
          <div className="inline-flex items-center gap-1">
            <img src="https://start.gxj62.cn/police.webp" alt="公安备案" className="w-3.5 h-4 inline" />
            <a href="https://beian.mps.gov.cn" target="_blank" rel="noreferrer" className="hover:text-slate-400">鄂公网安备42050002420933号</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
