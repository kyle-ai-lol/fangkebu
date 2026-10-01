// 測試一律不能真的打 Anthropic API。
// 這裡把 fetch 換成會擋下 anthropic.com 的版本：就算哪個測試漏了 mock，請求也送不出去。
// 直接換掉 globalThis.fetch（不用 vi.stubGlobal），測試裡呼叫 vi.unstubAllGlobals() 也不會把防護拿掉。

const realFetch = globalThis.fetch;

function hostOf(input: RequestInfo | URL): string {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  if (/(^|\.)anthropic\.com$/i.test(hostOf(input))) {
    throw new Error("測試不能真的打 Anthropic API：請 mock AI 呼叫");
  }
  return realFetch(input, init);
}) as typeof fetch;
