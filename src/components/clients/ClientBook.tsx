"use client";
// 客戶簿：列表／依階段看板、搜尋、篩選（照原型）。

import Link from "next/link";
import { useState, useTransition } from "react";
import { useToast } from "@/components/Toast";
import { loadDemoAction, newClientAction } from "@/lib/actions/clients";
import { CLOSED_STAGES, STAGES, type Stage } from "@/lib/rules";

export interface BookItem {
  id: string;
  alias: string;
  raw: boolean;
  summary: string;
  missing: number;
  stage: Stage;
  closed: boolean;
  ago: string;
  hay: string;
}

const FILTERS = ["未結案", "全部", "已結案"] as const;
type Filter = (typeof FILTERS)[number];
const LAYOUTS = [["list", "列表"], ["board", "依階段"]] as const;
type Layout = (typeof LAYOUTS)[number][0];

const openHref = (id: string) => `/app/clients?open=${id}`;

function NewClientButton({ primary = true }: { primary?: boolean }) {
  return (
    <form action={newClientAction}>
      <button type="submit" className={primary ? "btn primary" : "btn ghost"}>新增客戶</button>
    </form>
  );
}

function LoadDemoButton() {
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn ghost"
      disabled={pending}
      onClick={() => start(async () => {
        const r = await loadDemoAction();
        toast(r.ok ? (r.message ?? "") : r.error);
      })}
    >
      放入示範客戶
    </button>
  );
}

export function ClientBook({ items }: { items: BookItem[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("未結案");
  const [layout, setLayout] = useState<Layout>("list");

  const query = q.trim().toLowerCase();
  const list = items.filter((c) => {
    if (filter === "未結案" && c.closed) return false;
    if (filter === "已結案" && !c.closed) return false;
    return !query || c.hay.includes(query);
  });

  return (
    <>
      <div className="toolbar">
        <h1 className="tab-title">客戶簿</h1>
        <div className="tools">
          <label className="sr" htmlFor="q">搜尋客戶</label>
          <input id="q" className="inp" type="search" placeholder="搜尋代稱、電話、地區" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="seg" role="group" aria-label="篩選">
            {FILTERS.map((f) => (
              <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
          <div className="seg" role="group" aria-label="顯示方式">
            {LAYOUTS.map(([v, label]) => (
              <button key={v} type="button" aria-pressed={layout === v} onClick={() => setLayout(v)}>{label}</button>
            ))}
          </div>
          <NewClientButton />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="blank">
          <p className="t">客戶簿還是空的。</p>
          <p>按「新增客戶」建立第一張客戶卡，或先放入示範客戶看看。</p>
          <div className="cta-row">
            <NewClientButton />
            <LoadDemoButton />
          </div>
        </div>
      ) : layout === "board" ? (
        <div className="board">
          {(filter === "未結案" ? STAGES.filter((s) => !CLOSED_STAGES.includes(s)) : filter === "已結案" ? CLOSED_STAGES : STAGES).map((s) => {
            const col = list.filter((c) => c.stage === s);
            return (
              <section className="col" aria-label={s} key={s}>
                <h3><span>{s}</span><span>{col.length}</span></h3>
                {col.map((c) => (
                  <Link className="ticket" key={c.id} href={openHref(c.id)} scroll={false}>
                    <span className={c.raw ? "stamp raw" : "stamp"}>{c.alias}</span>
                    <p>{c.summary}</p>
                    {c.missing > 0 && <p><span className="miss">還缺 {c.missing} 項</span></p>}
                  </Link>
                ))}
              </section>
            );
          })}
        </div>
      ) : list.length === 0 ? (
        <div className="blank">
          <p className="t">沒有符合的客戶。</p>
          <p>換個篩選條件，或清掉搜尋文字。</p>
        </div>
      ) : (
        <div className="ledger" role="list">
          <div className="lhead" aria-hidden="true">
            <span>代稱</span><span>條件</span><span>資料</span><span>階段</span><span>更新</span>
          </div>
          {list.map((c) => (
            <Link className="lrow" role="listitem" key={c.id} href={openHref(c.id)} scroll={false}>
              <span><span className={c.raw ? "stamp raw" : "stamp"}>{c.alias}</span></span>
              <span className="lsum">{c.summary}</span>
              <span className="lmiss"><span className={c.missing ? "miss" : "miss ok"}>{c.missing ? `還缺 ${c.missing} 項` : "已問齊"}</span></span>
              <span className={c.closed ? "stage closed" : "stage"}>{c.stage}</span>
              <span className="lago">{c.ago}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
