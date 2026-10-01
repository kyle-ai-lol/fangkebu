"use client";
// 整理對話（照原型的 viewPaste）：貼上 LINE 對話 → 整理成預覽卡 → 存成新客戶，或補進同一支電話的舊客戶卡。

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useToast } from "@/components/Toast";
import { extractPasteAction, savePasteAction, type PasteExtractResult } from "@/lib/actions/paste";
import { FIELD_DEFS, PASTE_MAX, PASTE_TOO_LONG } from "@/lib/rules";

// 原型「貼上示範對話」的虛構內容
const PASTE_EXAMPLE = [
  "10:12 Mia：你好～我看到你們的物件，想問西屯有沒有 1 萬以內的套房",
  "10:15 我：您好！請問幾位入住、什麼時候想搬呢？",
  "10:20 Mia：我一個人，11/1 左右，我在台中榮總當護理師",
  "10:21 Mia：我有一隻貓可以嗎",
  "10:25 我：可以幫您找能養貓的，方便留電話嗎？",
  "10:30 Mia：0900-000-777，我騎機車，希望 15 分鐘內到醫院",
  "10:31 Mia：我現在的租約 10/31 到期",
].join("\n");

type Result = Extract<PasteExtractResult, { ok: true }>;

export function PasteBox({ aiEnabled }: { aiEnabled: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [text, setText] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, startBusy] = useTransition();
  const [saving, startSaving] = useTransition();
  const tooLong = text.trim().length > PASTE_MAX;

  function run() {
    if (!text.trim()) return toast("先貼上一段對話");
    if (tooLong) return toast(PASTE_TOO_LONG);
    startBusy(async () => {
      const r = await extractPasteAction(text);
      if (r.ok) setResult(r);
      else {
        setResult(null);
        toast(r.error);
      }
    });
  }

  function save(mergeInto?: string) {
    if (!result) return;
    startSaving(async () => {
      const r = await savePasteAction({ draft: result.draft, mergeInto });
      if (!r.ok) return toast(r.error);
      toast(r.message);
      router.push(`/app/clients?open=${r.clientId}`);
    });
  }

  const d = result?.draft;
  const matches = result?.matches ?? [];
  const who = [d?.isStudent && "學生", d?.needsSubsidy && "需要租補"].filter(Boolean).join("、");

  return (
    <>
      <div className="toolbar">
        <h1 className="tab-title">整理對話</h1>
        <span className={aiEnabled ? "pill ai" : "pill"} data-mode={aiEnabled ? "ai" : "rule"}>
          {aiEnabled ? "AI 模式" : "目前為規則模式"}
        </span>
      </div>
      <p className="fine" style={{ maxWidth: "46em" }}>
        把 LINE 聊天紀錄整段複製貼上，{aiEnabled ? "AI 會" : "系統會"}挑出 12 項條件，整理成一張客戶卡。個人 LINE 的對話也能用這個方式整理。
      </p>
      {!aiEnabled && (
        <p className="warn" style={{ maxWidth: "46em" }}>
          目前為規則模式：還沒接上 AI，先用簡單規則抓條件，準確度比 AI 差。存進客戶簿前，請先看一下整理結果有沒有抓錯。
        </p>
      )}

      <label className="lb" htmlFor="pasteIn">LINE 對話紀錄</label>
      <textarea
        id="pasteIn"
        className="inp"
        rows={10}
        placeholder="在 LINE 聊天室裡長按訊息，選「複製」，貼到這裡"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {tooLong && <p className="err" role="alert">{PASTE_TOO_LONG}（現在 {text.trim().length.toLocaleString("en-US")} 字）</p>}
      <div className="cta-row">
        <button type="button" className="btn primary" disabled={busy} onClick={run}>整理成客戶卡</button>
        <button type="button" className="btn ghost" disabled={busy} onClick={() => setText(PASTE_EXAMPLE)}>貼上示範對話</button>
      </div>

      <div aria-live="polite">
        {busy && <p className="fine">{aiEnabled ? "AI 整理中，通常幾秒鐘…" : "整理中…"}</p>}
        {!busy && result && d && (
          <section aria-labelledby="pasteResult" data-mode={result.mode}>
            <h2 className="d-sec" id="pasteResult">{result.mode === "rule" ? "整理結果（規則模式）" : "整理結果"}</h2>
            {result.notice && <p className="warn">{result.notice}</p>}
            {d.summary && <p>{d.summary}</p>}
            <div style={{ maxWidth: 560 }}>
              <div className="paper">
                <div className="cv-head">
                  <span className={result.preview.raw ? "stamp raw" : "stamp"}>{result.preview.alias}</span>
                  <span className={result.preview.missing ? "miss" : "miss ok"}>
                    {result.preview.missing ? `還缺 ${result.preview.missing} 項` : "12 項已問齊"}
                  </span>
                </div>
                {result.preview.raw && result.preview.why && <p className="fine">{result.preview.why}</p>}
                {FIELD_DEFS.map((f) => {
                  const v = d.fields[f.key];
                  return (
                    <div className="frow" key={f.key} data-field={f.key}>
                      <span className="fnum">{f.n}</span>
                      <span className="flabel">{f.label}</span>
                      <span className={v ? "fval" : "fval empty"}>{v || "還沒問"}</span>
                    </div>
                  );
                })}
                {(d.moveInDate || d.leaseEnd || who) && (
                  <p className="fine" style={{ marginTop: ".6rem" }}>
                    {[d.moveInDate && `最快入住日：${d.moveInDate}`, d.leaseEnd && `現租約到期：${d.leaseEnd}`, who && `身份：${who}`].filter(Boolean).join("　")}
                  </p>
                )}
                {result.preview.vague && <p className="warn">只寫「附近」，要問學校或公司全名。</p>}
              </div>
            </div>
            <div className="cta-row">
              {matches.length > 0 ? (
                <>
                  {matches.map((m) => (
                    <button type="button" className="btn primary" key={m.id} disabled={saving} onClick={() => save(m.id)}>
                      補進「{m.alias}」的客戶卡{matches.length > 1 ? `（${m.stage}）` : ""}
                    </button>
                  ))}
                  <button type="button" className="btn ghost" disabled={saving} onClick={() => save()}>另存成新客戶</button>
                </>
              ) : (
                <button type="button" className="btn primary" disabled={saving} onClick={() => save()}>存進客戶簿</button>
              )}
            </div>
            {matches.length > 0 && (
              <p className="fine">客戶簿裡已經有同一支電話的客人。補進去只會填空白的欄位，不會蓋掉原本的資料。</p>
            )}
          </section>
        )}
      </div>
    </>
  );
}
