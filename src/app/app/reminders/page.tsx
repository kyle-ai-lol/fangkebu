import type { Metadata } from "next";
import Link from "next/link";
import { loadReminders } from "@/lib/data/load";

export const metadata: Metadata = { title: "提醒｜房客簿" };

export default async function RemindersPage() {
  const { reminders } = await loadReminders();
  return (
    <>
      <h1 className="tab-title">提醒</h1>
      <p className="fine" style={{ maxWidth: "48em" }}>
        依你的規則算出來的待辦：租約到期前 10 天（學生或需租補 15 天）、今明兩天的帶看、AI 轉交的問題、還沒問清楚的條件，和 3 天沒更新的客人。
      </p>
      {reminders.length ? (
        <div className="rlist">
          {reminders.map((r, i) => (
            <div className={r.level === 0 ? "ritem urgent" : "ritem"} key={`${r.clientId}-${r.kind}-${i}`} data-kind={r.kind}>
              <span className="rdate">{r.label}</span>
              <div>
                <div className="rtext">{r.text}</div>
                <div className="rwhy">{r.why}</div>
              </div>
              <Link className="btn small ghost" href={`/app/clients?open=${r.clientId}`}>打開客戶卡</Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="blank" style={{ marginTop: "1rem" }}>
          <p className="t">目前沒有要處理的事。</p>
          <p>客人填了租約到期日、排了約看，提醒就會出現在這裡。</p>
        </div>
      )}
    </>
  );
}
