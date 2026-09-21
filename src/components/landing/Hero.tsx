"use client";
// 首頁上半部：標語＋LINE 對話變成客戶卡的動畫示範（照原型）。

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";

function DemoRow({ n, label, v, t }: { n: number; label: string; v?: string; t?: number }) {
  return (
    <div className={v ? "frow fill" : "frow"} data-t={v ? t : undefined}>
      <span className="fnum">{n}</span>
      <span className="flabel">{label}</span>
      <span className="fval">{v ? <span className="v">{v}</span> : " "}</span>
    </div>
  );
}

export function Hero({ loggedIn }: { loggedIn: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const play = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const steps = root.querySelectorAll<HTMLElement>("[data-t]");
    steps.forEach((s) => s.classList.remove("on"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      steps.forEach((s) => s.classList.add("on"));
      return;
    }
    void root.offsetWidth; // 讓瀏覽器先套用「隱藏」狀態，動畫才會重播
    steps.forEach((s) => timers.current.push(setTimeout(() => s.classList.add("on"), Number(s.dataset.t))));
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(play));
    const pending = timers.current;
    return () => {
      cancelAnimationFrame(id);
      pending.forEach(clearTimeout);
    };
  }, [play]);

  return (
    <section className="hero">
      <div className="hero-copy">
        <h1>客人在 LINE 講的每一句，都自動寫進客戶卡。</h1>
        <p className="lede">AI 先幫你回覆常見問題、把 12 項找房條件問齊，再照你的規則取好代稱、排好提醒。你專心帶看就好。</p>
        <div className="cta-row">
          <Link className="btn primary" href={loggedIn ? "/app/clients" : "/signup"}>
            {loggedIn ? "進入我的後台" : "免費建立我的後台"}
          </Link>
          <button type="button" className="btn ghost" onClick={play}>再看一次示範</button>
        </div>
        <p className="fine">給台中租屋房仲使用，內測期間免費。</p>
      </div>
      <div className="hero-demo" ref={rootRef} role="img" aria-label="示範：客人在 LINE 說出找房條件，右邊的客戶卡自動填好，代稱是未北區8000，還缺 5 項">
        <div className="demo-chat" aria-hidden="true">
          <p className="demo-top">你的 LINE 官方帳號</p>
          <p className="msg them" data-t="300">你好～想找北區 8000 以內的套房</p>
          <p className="msg ai" data-t="1300">您好！請問幾位入住、最快什麼時候想搬呢？</p>
          <p className="msg them" data-t="2300">我一個人，10 月初，沒養寵物也不抽菸</p>
          <p className="msg ai" data-t="3300">好的～方便留支電話，帶看時好聯絡您嗎？</p>
          <p className="msg them" data-t="4200">0900-000-101</p>
        </div>
        <div className="demo-card paper" aria-hidden="true">
          <div className="cv-head">
            <span className="stamp demo-stamp" data-t="5200">未北區8000</span>
            <span className="miss demo-miss" data-t="5400">還缺 5 項</span>
          </div>
          <DemoRow n={1} label="入住人數" v="1 人" t={2800} />
          <DemoRow n={2} label="最快入住" v="10 月初" t={2900} />
          <DemoRow n={3} label="職業身份" />
          <DemoRow n={4} label="有無抽菸" v="無" t={3000} />
          <DemoRow n={5} label="有無寵物" v="無" t={3000} />
          <DemoRow n={6} label="電話號碼" v="0900-000-101" t={4700} />
          <DemoRow n={7} label="性別" />
          <DemoRow n={8} label="年齡" />
          <DemoRow n={9} label="行政區" v="北區" t={800} />
          <DemoRow n={10} label="預算" v="8000" t={900} />
          <DemoRow n={11} label="交通工具" />
          <DemoRow n={12} label="通勤時間" />
        </div>
      </div>
    </section>
  );
}
