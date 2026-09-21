// 官網首頁（照原型）。原型專屬的句子已改成正式版說法。
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { Hero } from "@/components/landing/Hero";
import { createClient, currentUserId } from "@/lib/supabase/server";

export default async function Home() {
  const loggedIn = !!(await currentUserId(await createClient()));

  return (
    <>
      <header className="topbar">
        <Brand />
        <span className="spacer" />
        {loggedIn ? (
          <Link className="btn primary" href="/app/clients">進入後台</Link>
        ) : (
          <>
            <Link className="btn ghost" href="/login">登入</Link>
            <Link className="btn primary" href="/signup">建立後台</Link>
          </>
        )}
      </header>
      <main className="wrap">
        <Hero loggedIn={loggedIn} />
        <section className="section">
          <h2>從客人來訊到帶看，中間不用你抄寫</h2>
          <ol className="steps">
            <li>
              <div className="n">1</div>
              <h3>客人在 LINE 來訊</h3>
              <p>半夜傳的也接得住。服務費、看房時間這類常見問題，AI 照你寫的知識庫回答。</p>
            </li>
            <li>
              <div className="n">2</div>
              <h3>AI 把 12 項條件問齊</h3>
              <p>人數、入住時間、預算、地區、寵物、電話，每次只問兩項，客人不會覺得在填表。只寫「學校附近」的會追問是哪間。</p>
            </li>
            <li>
              <div className="n">3</div>
              <h3>自動建卡、取代稱</h3>
              <p>照「未＋地區＋預算」取代稱，例如「未北區8000」，同區同預算自動加識別字，成交後改成「已」。</p>
            </li>
            <li>
              <div className="n">4</div>
              <h3>到期提醒、約看進日曆</h3>
              <p>租約到期前 10 天提醒你聯絡，學生或要租補的提前 15 天。約看行程標題直接帶客戶代稱和電話。</p>
            </li>
          </ol>
        </section>
        <section className="section">
          <h2>省下的，是這些零碎時間</h2>
          <table className="cmp">
            <thead>
              <tr>
                <th scope="col">現在的做法</th>
                <th scope="col">用房客簿</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>客人的條件散在聊天紀錄裡，要回頭一則一則翻</td><td>12 項條件整理成一張卡，缺哪幾項用螢光筆標出來</td></tr>
              <tr><td>半夜來訊沒回，隔天客人已經找別家</td><td>AI 先接住，問齊條件；議價、合約這類問題轉給你本人</td></tr>
              <tr><td>客人的租約快到期，自己忘了聯絡</td><td>到期前 10 天出現在提醒清單，學生或需租補的提前 15 天</td></tr>
              <tr><td>日曆上只寫地址，事後不知道是哪位客人要看</td><td>約看行程標題自動寫上客戶代稱和電話</td></tr>
            </tbody>
          </table>
        </section>
        <section className="section faq">
          <h2>常見問題</h2>
          <details>
            <summary>一定要有 LINE 官方帳號嗎？</summary>
            <p>AI 自動回覆需要 LINE 官方帳號，免費方案就能用。個人 LINE 沒辦法串接自動回覆，但你還是可以用「整理對話」，把聊天紀錄貼進來建成客戶卡。</p>
          </details>
          <details>
            <summary>客人的資料存在哪裡？</summary>
            <p>存在房客簿的雲端資料庫，只有你登入後看得到，其他房仲讀不到。完整的隱私權政策會在正式上線前公布。</p>
          </details>
          <details>
            <summary>AI 會不會亂回物件資訊？</summary>
            <p>AI 只用你在知識庫寫的內容回答，不會自己說哪間房還在或租掉了。遇到議價、合約、法律問題，或它不確定的事，會請客人等你本人回覆，並出現在你的提醒清單。</p>
          </details>
          <details>
            <summary>要多少錢？</summary>
            <p>內測期間免費。正式收費方式確定後，會先通知內測使用者。</p>
          </details>
        </section>
      </main>
      <footer className="foot">房客簿（暫定名），內測中。畫面上所有客戶資料都是虛構示範。</footer>
    </>
  );
}
