import { useMemo } from "react";
import { calcBaseHourlyRate, calcTax, SOCIAL_INSURANCE } from "../utils/salary";
import { num, yuanToCents } from "../utils/format";
import { Card, MoneyTable, NetPay, SmallBtn, type Row } from "./ui";
import type { ShareData } from "../utils/share";

/** 分享查看页：扫二维码打开 ?d= 后只读展示这份工资单，不出编辑态 */
export function ShareView({ data }: { data: ShareData }) {
  const { settings } = data;
  const r = useMemo(() => {
    const hr = calcBaseHourlyRate(settings.baseSalary);
    const ot = Math.max(0, data.overtime);
    const bh = Math.max(0, data.bhours);
    const ch = Math.max(0, data.chours);
    const fh = Math.max(0, data.fhours);
    const nd = Math.max(0, data.nights);
    const fixedTotal =
      settings.baseSalary +
      settings.positionSalary +
      settings.attendanceBonus +
      settings.performanceSalary +
      yuanToCents(num(String(data.adjustment), 0));
    const otPay = Math.round(ot * 1.5 * hr);
    const bPay = Math.round(bh * 2 * hr);
    const cPay = Math.round(ch * 2 * hr);
    const fPay = Math.round(fh * 3 * hr);
    const nightPay = Math.round(nd * 2000);
    const grossPay = Math.round(fixedTotal + otPay + bPay + cPay + fPay + nightPay);
    const social = settings.noSocial ? 0 : SOCIAL_INSURANCE;
    const tax = settings.noTax ? 0 : calcTax(grossPay, social, settings.taxThreshold, settings.taxRate);
    const netPay = Math.round(grossPay - social - tax);
    return { ot, bh, ch, fh, nd, otPay, bPay, cPay, fPay, nightPay, grossPay, social, tax, netPay };
  }, [settings, data]);

  const rows: Row[] = [
    { label: "基础工资", amount: settings.baseSalary },
    { label: "岗位工资", amount: settings.positionSalary },
    { label: "全勤奖", amount: settings.attendanceBonus },
    { label: "绩效工资", amount: settings.performanceSalary },
    { label: `A班加班(${r.ot}h×1.5)`, amount: r.otPay, kind: "income" },
    { label: `B班(${r.bh}h×2)`, amount: r.bPay, kind: "income" },
    { label: `C班(${r.ch}h×2)`, amount: r.cPay, kind: "income" },
    { label: `F班(${r.fh}h×3)`, amount: r.fPay, kind: "income" },
    { label: `夜班补贴(${r.nd}天)`, amount: r.nightPay, kind: "income" },
    { label: "税前总工资", amount: r.grossPay, kind: "total" },
    { label: "社保扣除", amount: r.social, kind: "deduction" },
    { label: "个税", amount: r.tax, kind: "deduction" },
  ];

  return (
    <div className="space-y-4">
      <Card
        title={`工资单 ${data.year}-${String(data.month).padStart(2, "0")}`}
        action={
          <SmallBtn onClick={() => { window.location.href = window.location.origin + window.location.pathname; }}>
            我要计算
          </SmallBtn>
        }
      >
        <p className="text-sm text-slate-500 dark:text-slate-400">
          本条工资单由分享链接生成，仅供参考。
        </p>
        <MoneyTable rows={rows} />
        <NetPay amount={r.netPay} />
      </Card>
    </div>
  );
}
