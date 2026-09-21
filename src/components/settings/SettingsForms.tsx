"use client";
// 設定頁：個人資料、AI 知識庫、示範資料（照原型；資料匯出、清除全部在階段 4）。

import { startTransition, useActionState, useEffect, useTransition, type FormEvent } from "react";
import { ProfileFields, type ProfileValues } from "@/components/ProfileFields";
import { useToast } from "@/components/Toast";
import type { FormState } from "@/lib/actions/auth";
import { loadDemoAction } from "@/lib/actions/clients";
import { saveKbAction, saveProfileAction } from "@/lib/actions/settings";

function submitWith(action: (fd: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => action(fd));
  };
}

/** 成功訊息用提示顯示 */
function useToastOnMessage(state: FormState) {
  const toast = useToast();
  useEffect(() => {
    if (state.message) toast(state.message);
  }, [state, toast]);
}

export function SettingsForms({ profile, kb }: { profile: ProfileValues; kb: string }) {
  const toast = useToast();
  const [profileState, profileAction, profilePending] = useActionState(saveProfileAction, {});
  const [kbState, kbAction, kbPending] = useActionState(saveKbAction, {});
  const [demoPending, startDemo] = useTransition();
  useToastOnMessage(profileState);
  useToastOnMessage(kbState);

  return (
    <>
      <h1 className="tab-title">設定</h1>

      <section className="paper set" aria-labelledby="s1">
        <h2 id="s1">個人資料</h2>
        <form onSubmit={submitWith(profileAction)} noValidate>
          <ProfileFields p={profile} />
          {profileState.error && <p className="err" role="alert">{profileState.error}</p>}
          <div className="cta-row">
            <button type="submit" className="btn primary" disabled={profilePending}>儲存個人資料</button>
          </div>
        </form>
      </section>

      <section className="paper set" aria-labelledby="s2">
        <h2 id="s2">AI 知識庫</h2>
        <p className="fine">AI 只用這裡寫的內容回答客人。一行「問：」接一行「答：」。現在標「（示範）」的內容，請改成你自己的規定。</p>
        {/* key：還原成示範內容後，文字框要換成新的內容 */}
        <form onSubmit={submitWith(kbAction)} key={kb}>
          <label className="sr" htmlFor="kbIn">知識庫內容</label>
          <textarea id="kbIn" name="kb" className="inp" rows={12} defaultValue={kb} maxLength={20000} />
          {kbState.error && <p className="err" role="alert">{kbState.error}</p>}
          <div className="cta-row">
            <button type="submit" name="intent" value="save" className="btn primary" disabled={kbPending}>儲存知識庫</button>
            <button type="submit" name="intent" value="reset" className="btn ghost" disabled={kbPending}>還原成示範內容</button>
          </div>
        </form>
      </section>

      <section className="paper set" aria-labelledby="s3">
        <h2 id="s3">示範資料</h2>
        <p className="fine">放入 9 位虛構的示範客戶，看看代稱、提醒怎麼運作。會換掉之前放入的示範客戶，不影響你自己建立的客戶。</p>
        <div className="cta-row">
          <button
            type="button"
            className="btn ghost"
            disabled={demoPending}
            onClick={() => startDemo(async () => {
              const r = await loadDemoAction();
              toast(r.ok ? (r.message ?? "") : r.error);
            })}
          >
            放入示範客戶
          </button>
        </div>
      </section>
    </>
  );
}
