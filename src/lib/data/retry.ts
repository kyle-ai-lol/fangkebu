// PostgREST 的已知 bug：伺服器閒置超過 30 秒後，內部快取的「現在時間」沒更新，
// 剛簽發的登入憑證會被誤判成「未來簽發」，回 PGRST303（JWT issued at future）。
// v14.18／v16.3 已修（PostgREST #5196）；本機 Supabase CLI 2.117 內建的是 v16.2，還有這個問題。
// 2026-09-21 第一次遇到，2026-10-01 重現並確認原因：閒置 40 秒後的第一批請求，7 輪裡有 4 輪中，
// 同一張憑證再送通常就過，所以這裡重試幾次。但這只能減輕：實測也遇過連續 3 次都失敗。
// 根治是把 PostgREST 升到 v16.3 以上；升級之後這個檔案可以拿掉。

type Result = { error: { code?: string; message?: string } | null };

/** 每次重試前等多久（毫秒）。加起來最多多等 2.8 秒。 */
const RETRY_DELAYS_MS = [400, 800, 1600];

/** 只重試「未來簽發」這一種；JWT 過期等其他 PGRST303 重試也沒用 */
function isStaleClockRejection(r: Result): boolean {
  return r.error?.code === "PGRST303" && (r.error.message === undefined || /issued at future/i.test(r.error.message));
}

export async function retryOnJwtClaims<T extends Result>(run: () => PromiseLike<T>, delaysMs: readonly number[] = RETRY_DELAYS_MS): Promise<T> {
  let result = await run();
  for (let i = 0; i < delaysMs.length && isStaleClockRejection(result); i++) {
    console.warn(`PGRST303 (JWT issued at future), retry ${i + 1}/${delaysMs.length}`);
    await new Promise((resolve) => setTimeout(resolve, delaysMs[i]));
    result = await run();
  }
  return result;
}
