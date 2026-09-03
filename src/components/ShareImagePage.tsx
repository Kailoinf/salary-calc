import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { drawSalaryCanvas } from "./ui";
import { buildShare } from "./ShareView";
import type { ShareData } from "../utils/share";

/**
 * 分享图片页：打开 ?p=<base64> 后，正常页面渲染这张薪资图。
 * 上方标题+说明，图下方「保存为图片」「下载」按钮，左上「返回」回主页。
 * ponytail: 纯前端无法让 ?p= 成为真 PNG 文件，故用 canvas 现画 + toBlob 下载。
 */
export function ShareImagePage({ data, code }: { data: ShareData; code: string }) {
  const [canvasRef, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const title = `参考薪资 ${data.year}-${String(data.month).padStart(2, "0")}`;

  useEffect(() => {
    let alive = true;
    (async () => {
      const { rows, netPay } = buildShare(data);
      const canvas = await drawSalaryCanvas({
        title,
        rows,
        netPay,
        shareUrl: `https://salary.gkux.cn/?d=${encodeURIComponent(code)}`,
      });
      if (!alive) return;
      setCanvas(canvas);
    })();
    return () => { alive = false; };
  }, [data, code, title]);

  const download = () => {
    if (!canvasRef) return;
    canvasRef.toBlob((b) => {
      if (!b) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = `薪资_${dayjs().format("YYYY-MM-DD")}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    }, "image/png");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        <button
          type="button"
          onClick={() => { window.location.href = window.location.origin + window.location.pathname; }}
          className="text-xs px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-black transition-colors"
        >
          返回
        </button>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">本条薪资由分享链接生成，点下方按钮可保存为图片。</p>

      {canvasRef ? (
        <>
          <img
            src={canvasRef.toDataURL("image/png")}
            alt={title}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={download}
              className="px-4 py-2 rounded-lg bg-sky-600 border border-sky-600 text-white text-sm font-medium"
            >
              保存为图片
            </button>
            <button
              type="button"
              onClick={download}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-black text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-black transition-colors"
            >
              下载
            </button>
          </div>
        </>
      ) : (
        <div className="text-sm text-slate-500 dark:text-slate-400 py-20 text-center">图片生成中…</div>
      )}
    </div>
  );
}
