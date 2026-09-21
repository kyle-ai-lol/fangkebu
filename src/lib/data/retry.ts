// 2026-09-21 本機測試遇過一次：剛註冊完的同一秒內，同一張登入憑證送出的兩個查詢，
// 一個被 PostgREST 以 PGRST303（JWT 欄位檢查失敗）拒絕、另一個成功。原因沒查到底，
// 重跑 6 次都沒再出現，所以只在遇到 PGRST303 時等一下重試一次。

type Result = { error: { code?: string } | null };

export async function retryOnJwtClaims<T extends Result>(run: () => PromiseLike<T>, delayMs = 800): Promise<T> {
  const first = await run();
  if (first.error?.code !== "PGRST303") return first;
  console.warn("PGRST303 right after sign-in, retrying once");
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  return run();
}
