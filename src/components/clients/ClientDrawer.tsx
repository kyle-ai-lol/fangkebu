"use client";
// 客戶卡（右側抽屜，照原型）。每一欄改完離開就存；代稱、提醒由伺服器重算後更新畫面。

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FocusEvent } from "react";
import { useToast } from "@/components/Toast";
import {
  addLogAction, addViewingAction, clearHandoffAction, deleteClientAction, deleteViewingAction,
  updateFieldAction, updateMetaAction, type ActionResult,
} from "@/lib/actions/clients";
import { FIELD_DEFS, STAGES, type FieldKey, type Stage } from "@/lib/rules";

export interface DrawerData {
  id: string;
  name: string;
  stage: Stage;
  fields: Record<FieldKey, string>;
  moveInDate: string;
  leaseEnd: string;
  isStudent: boolean;
  needsSubsidy: boolean;
  handoff: string | null;
  alias: { text: string; raw: boolean; why?: string };
  missing: string[];
  vague: boolean;
  remindLine: string;
  hasPhone: boolean;
  viewings: { id: string; when: string; address: string; gcal: string }[];
  logs: { id: string; when: string; text: string }[];
}

export function ClientDrawer({ data }: { data: DrawerData }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const closeRef = useRef<HTMLButtonElement>(null);
  const saved = useRef<Record<string, string>>({ ...data.fields, name: data.name });
  const [armed, setArmed] = useState(false);
  const [when, setWhen] = useState("");
  const [address, setAddress] = useState("");
  const [log, setLog] = useState("");

  const close = () => router.push("/app/clients", { scroll: false });

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push("/app/clients", { scroll: false });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router]);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  /** 執行伺服器動作，成功訊息或錯誤都用提示顯示 */
  function run(fn: () => Promise<ActionResult>, after?: () => void) {
    start(async () => {
      const r = await fn();
      if (!r) return; // 刪除後會直接換頁，沒有回傳值
      if (!r.ok) toast(r.error);
      else {
        if (r.message) toast(r.message);
        after?.();
      }
    });
  }

  function saveText(key: FieldKey | "name", e: FocusEvent<HTMLInputElement>) {
    const value = e.currentTarget.value.trim();
    if (value === (saved.current[key] ?? "")) return;
    saved.current[key] = value;
    run(() => (key === "name" ? updateMetaAction(data.id, { key: "name", value }) : updateFieldAction({ clientId: data.id, key, value })));
  }

  const a = data.alias;
  return (
    <>
      <div className="scrim" onClick={close} />
      <aside className="detail" role="dialog" aria-modal="true" aria-labelledby="dTitle" aria-busy={pending}>
        <header className="d-head">
          <div>
            <h2 className="d-title" id="dTitle"><span className={a.raw ? "stamp raw" : "stamp"}>{a.text}</span></h2>
            <p className="d-meta">
              {a.raw && a.why ? `${a.why}。` : ""}
              {data.missing.length ? `還缺 ${data.missing.length} 項：${data.missing.join("、")}` : "12 項條件都問齊了"}
            </p>
          </div>
          <button ref={closeRef} type="button" className="btn ghost small" onClick={close}>關閉</button>
        </header>

        <div className="d-body">
          {data.handoff && (
            <div className="warn">
              AI 轉交給你：客人問「{data.handoff}」，需要你本人回覆。<br />
              <button type="button" className="btn small" style={{ marginTop: ".4rem" }} onClick={() => run(() => clearHandoffAction(data.id))}>已經回覆了</button>
            </div>
          )}

          <div className="grid2">
            <div>
              <label className="lb" htmlFor="d-name">原本稱呼</label>
              <input id="d-name" className="inp" type="text" defaultValue={data.name} placeholder="例：LINE 暱稱" maxLength={40} onBlur={(e) => saveText("name", e)} />
            </div>
            <div>
              <label className="lb" htmlFor="d-stage">階段</label>
              <select id="d-stage" key={data.stage} className="inp" defaultValue={data.stage} onChange={(e) => run(() => updateMetaAction(data.id, { key: "stage", value: e.target.value }))}>
                {STAGES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <h3 className="d-sec">找房條件</h3>
          <div className="paper form">
            {FIELD_DEFS.map((f) => {
              const v = data.fields[f.key];
              return (
                <label className="frow" key={f.key}>
                  <span className="fnum">{f.n}</span>
                  <span className="flabel">{f.label}</span>
                  <input
                    className={v ? "fin" : "fin empty"}
                    type={f.key === "phone" ? "tel" : "text"}
                    defaultValue={v}
                    placeholder={f.placeholder || "還沒問"}
                    maxLength={100}
                    data-field={f.key}
                    onInput={(e) => e.currentTarget.classList.toggle("empty", !e.currentTarget.value.trim())}
                    onBlur={(e) => saveText(f.key, e)}
                  />
                </label>
              );
            })}
          </div>
          {data.vague && <p className="warn">第 9 項只寫「附近」，記得問客人是哪間學校或公司的全名，才對得到行政區。</p>}

          <h3 className="d-sec">日期與身份</h3>
          <div className="grid2">
            <div>
              <label className="lb" htmlFor="d-move">最快入住日</label>
              <input id="d-move" className="inp" type="date" defaultValue={data.moveInDate} onChange={(e) => run(() => updateMetaAction(data.id, { key: "moveInDate", value: e.target.value }))} />
            </div>
            <div>
              <label className="lb" htmlFor="d-lease">現租約到期日</label>
              <input id="d-lease" className="inp" type="date" defaultValue={data.leaseEnd} onChange={(e) => run(() => updateMetaAction(data.id, { key: "leaseEnd", value: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="check">
              <input type="checkbox" key={String(data.isStudent)} defaultChecked={data.isStudent} onChange={(e) => run(() => updateMetaAction(data.id, { key: "isStudent", value: e.target.checked }))} /> 學生
            </label>
            <label className="check">
              <input type="checkbox" key={String(data.needsSubsidy)} defaultChecked={data.needsSubsidy} onChange={(e) => run(() => updateMetaAction(data.id, { key: "needsSubsidy", value: e.target.checked }))} /> 需要租補
            </label>
          </div>
          <p className="fine">{data.remindLine}</p>

          <h3 className="d-sec">約看行程</h3>
          {data.viewings.length === 0 ? (
            <p className="fine">還沒有約看。</p>
          ) : (
            <>
              {!data.hasPhone && <p className="warn">這位客人還沒有電話，約看前先跟對方要。</p>}
              <ul className="vlist">
                {data.viewings.map((v) => (
                  <li key={v.id}>
                    <span className="vwhen">{v.when}</span>
                    <span className="vaddr">{v.address}</span>
                    <a className="btn small ghost" href={v.gcal} target="_blank" rel="noopener noreferrer">加到 Google 日曆</a>
                    <button type="button" className="btn small ghost" onClick={() => run(() => deleteViewingAction(v.id, data.id))}>刪除</button>
                  </li>
                ))}
              </ul>
              <p className="fine">行程標題會帶客戶代稱和電話。加到日曆後，記得把提醒設成提前 1 小時。</p>
            </>
          )}
          <div className="grid2">
            <div>
              <label className="lb" htmlFor="vWhen">日期時間</label>
              <input id="vWhen" className="inp" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
            </div>
            <div>
              <label className="lb" htmlFor="vAddr">物件地址</label>
              <input id="vAddr" className="inp" type="text" placeholder="例：北區示範路 12 號 3F" maxLength={200} value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </div>
          <div className="cta-row" style={{ marginTop: ".7rem" }}>
            <button
              type="button"
              className="btn"
              onClick={() => {
                if (!when || !address.trim()) return toast("約看要填日期時間和物件地址");
                run(() => addViewingAction({ clientId: data.id, when, address }), () => { setWhen(""); setAddress(""); });
              }}
            >
              加入約看
            </button>
          </div>

          <h3 className="d-sec">追蹤紀錄</h3>
          <ol className="log">
            {data.logs.map((l) => (
              <li key={l.id}><time>{l.when}</time><span>{l.text}</span></li>
            ))}
          </ol>
          <label className="sr" htmlFor="logIn">新增追蹤紀錄</label>
          <textarea id="logIn" className="inp" rows={2} placeholder="例：已傳 3 間物件給客人，等回覆" maxLength={2000} value={log} onChange={(e) => setLog(e.target.value)} />
          <div className="cta-row" style={{ marginTop: ".6rem" }}>
            <button type="button" className="btn" onClick={() => log.trim() && run(() => addLogAction({ clientId: data.id, text: log }), () => setLog(""))}>新增紀錄</button>
          </div>

          <hr className="d-hr" />
          <button
            type="button"
            className="btn danger"
            onClick={() => (armed ? run(() => deleteClientAction(data.id)) : setArmed(true))}
          >
            {armed ? "再按一次，確定刪除" : "刪除這位客戶"}
          </button>
        </div>
      </aside>
    </>
  );
}
