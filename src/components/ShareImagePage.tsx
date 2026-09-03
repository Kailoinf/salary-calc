import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { Card, SmallBtn, drawSalaryCanvas } from "./ui";
import { buildShare } from "./ShareView";
import type { ShareData } from "../utils/share";

/**
 * 分享图片页：打开 ?p=<base64> 后，卡片主体渲染这张薪资图。
 * 卡片右上角 action = 下载 + 返回主页。下载=当前导出功能(现画图+直接下载PNG)。
 * ponytail: 纯前端无法让 ?p= 成为真 PNG 文件，故用 canvas 现画 + toBlob 下载。
 */
export function ShareImagePage({ data, code }: { data: ShareData; code: string }) {
  const [canvasRef, setCanvas] = useState<HTMLCanvasElement | null>(null);
  // 卡片标题不用「参考薪资」(图内 banner 已带 参考薪资+年月)，改简洁分类名
  const title = `薪资图片 ${data.year}-${String(data.month).padStart(2, "0")}`;

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
    <Card
      title={title}
      action={
        <div className="flex items-center gap-2">
          <SmallBtn onClick={download}>下载</SmallBtn>
          <SmallBtn onClick={() => { window.location.href = window.location.origin + window.location.pathname; }}>返回主页</SmallBtn>
        </div>
      }
    >
      {canvasRef ? (
        <img
          src={canvasRef.toDataURL("image/png")}
          alt={title}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700"
        />
      ) : (
        <div className="text-sm text-slate-500 dark:text-slate-400 py-20 text-center">图片生成中…</div>
      )}
    </Card>
  );
}
