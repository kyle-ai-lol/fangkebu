"use client";
// 註冊、登入表單。送出失敗時保留已填的內容（不用 <form action>，React 會在送出後清空表單）。

import Link from "next/link";
import { startTransition, useActionState, type FormEvent } from "react";
import { ProfileFields } from "@/components/ProfileFields";
import { signIn, signUp, type FormState } from "@/lib/actions/auth";

function submitWith(action: (fd: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };
}

function Notes({ state }: { state: FormState }) {
  return (
    <>
      {state.error && <p className="err" role="alert">{state.error}</p>}
      {state.message && <p className="ok-note" role="status">{state.message}</p>}
    </>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, {});
  return (
    <form onSubmit={submitWith(action)} noValidate>
      <ProfileFields />
      <label className="lb" htmlFor="su-email">Email（登入用）</label>
      <input id="su-email" name="email" className="inp" type="email" autoComplete="email" required />
      <label className="lb" htmlFor="su-password">密碼（至少 8 個字）</label>
      <input id="su-password" name="password" className="inp" type="password" autoComplete="new-password" minLength={8} required />
      <label className="check" style={{ marginTop: "1rem" }}>
        <input type="checkbox" name="loadDemo" defaultChecked /> 先放入示範客戶，看看後台長什麼樣子
      </label>
      <Notes state={state} />
      <div className="cta-row">
        <button type="submit" className="btn primary" disabled={pending} aria-busy={pending}>
          {pending ? "建立中…" : "建立後台"}
        </button>
        <Link className="btn ghost" href="/">回首頁</Link>
      </div>
      <p className="fine auth-switch">已經有帳號了？<Link href="/login">登入</Link></p>
    </form>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, {});
  return (
    <form onSubmit={submitWith(action)} noValidate>
      <label className="lb" htmlFor="li-email">Email</label>
      <input id="li-email" name="email" className="inp" type="email" autoComplete="email" required />
      <label className="lb" htmlFor="li-password">密碼</label>
      <input id="li-password" name="password" className="inp" type="password" autoComplete="current-password" required />
      <Notes state={state} />
      <div className="cta-row">
        <button type="submit" className="btn primary" disabled={pending} aria-busy={pending}>
          {pending ? "登入中…" : "登入"}
        </button>
        <Link className="btn ghost" href="/">回首頁</Link>
      </div>
      <p className="fine auth-switch">還沒有帳號？<Link href="/signup">建立後台</Link></p>
    </form>
  );
}
