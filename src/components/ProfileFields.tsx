// 註冊頁和設定頁共用的個人資料欄位（照原型）。
import { DISTRICTS, districtShort } from "@/lib/rules";

export interface ProfileValues {
  name: string;
  company: string;
  phone: string;
  areas: string[];
  botName: string;
}

export function ProfileFields({ p }: { p?: ProfileValues }) {
  return (
    <>
      <label className="lb" htmlFor="pf-name">你的名字（客人會看到）</label>
      <input id="pf-name" name="name" className="inp" type="text" autoComplete="name" defaultValue={p?.name} placeholder="例：陳凱" required maxLength={40} />
      <label className="lb" htmlFor="pf-company">公司名稱（選填）</label>
      <input id="pf-company" name="company" className="inp" type="text" defaultValue={p?.company} maxLength={60} />
      <label className="lb" htmlFor="pf-phone">手機（選填）</label>
      <input id="pf-phone" name="phone" className="inp" type="tel" defaultValue={p?.phone} maxLength={30} />
      <fieldset>
        <legend>主要服務區域</legend>
        <div className="dchips">
          {DISTRICTS.map((d) => {
            const s = districtShort(d);
            return (
              <label className="dchip" key={s}>
                <input type="checkbox" name="areas" value={s} defaultChecked={p?.areas.includes(s)} />
                <span>{s}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <label className="lb" htmlFor="pf-bot">AI 助理的名字</label>
      <input id="pf-bot" name="botName" className="inp" type="text" defaultValue={p?.botName ?? "小幫手"} maxLength={20} />
    </>
  );
}
