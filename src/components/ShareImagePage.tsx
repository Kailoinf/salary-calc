import { useEffect, useState } from "react";
import { drawSalaryCanvas } from "./ui";
import { buildShare } from "./ShareView";
import type { ShareData } from "../utils/share";

/**
 * 分享图片页：直接打开 ?p=<base64>.png 时，用同一套画图逻辑渲染出薪资图，
 * 展示为 <img>，可复制链接(href)分享。二维码指向自身 ?p=，形成闭环。
 */
export function ShareImagePage({ data, code }: { data: ShareData; code: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { rows, netPay } = buildShare(data);
      const canvas = await drawSalaryCanvas({
        title: `参考薪资 ${data.year}-${String(data.month).padStart(2, "0")}`,
        rows,
        netPay,
        shareUrl: `https://salary.gkux.cn/?p=${code}.png`,
      });
      if (!alive) return;
      // ponytail: 不强制 PNG blob 深拷贝，toDataURL 即可渲染
      setSrc(canvas.toDataURL("image/png"));
    })();
    return () => { alive = false; };
  }, [data, code]);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">参考薪资</h2>
        <button
          type="button"
          onClick={() => { window.location.href = window.location.origin + window.location.pathname; }}
          className="text-xs px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-black transition-colors"
        >
          我要计算
        </button>
      </div>
      {src ? (
        <img src={src} alt="参考薪资" className="w-full rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm" />
      ) : (
        <div className="text-sm text-slate-500 dark:text-slate-400 py-20 text-center">图片生成中…</div>
      )}
    </div>
  );
}
