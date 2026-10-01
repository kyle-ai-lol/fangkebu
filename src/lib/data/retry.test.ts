import { afterEach, describe, expect, test, vi } from "vitest";
import { retryOnJwtClaims } from "./retry";

const ok = { data: [1], error: null };
const future = { data: null, error: { code: "PGRST303", message: "JWT issued at future" } };
const expired = { data: null, error: { code: "PGRST303", message: "JWT expired" } };
const other = { data: null, error: { code: "42501", message: "permission denied" } };
const NO_WAIT = [0, 0, 0];

afterEach(() => vi.restoreAllMocks());

describe("PGRST303「JWT issued at future」重試", () => {
  test("第一次被誤判、第二次成功 → 回傳成功結果", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const run = vi.fn().mockResolvedValueOnce(future).mockResolvedValueOnce(ok);
    expect(await retryOnJwtClaims(run, NO_WAIT)).toBe(ok);
    expect(run).toHaveBeenCalledTimes(2);
  });

  test("連續被誤判兩次、第三次成功 → 回傳成功結果（只重試一次會失敗的情況）", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const run = vi.fn().mockResolvedValueOnce(future).mockResolvedValueOnce(future).mockResolvedValueOnce(ok);
    expect(await retryOnJwtClaims(run, NO_WAIT)).toBe(ok);
    expect(run).toHaveBeenCalledTimes(3);
  });

  test("最多重試 3 次，還是失敗就把錯誤交出去", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const run = vi.fn().mockResolvedValue(future);
    expect(await retryOnJwtClaims(run, NO_WAIT)).toBe(future);
    expect(run).toHaveBeenCalledTimes(4);
  });

  test("錯誤沒帶訊息、只有代碼 PGRST303 → 也重試", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const bare = { data: null, error: { code: "PGRST303" } };
    const run = vi.fn().mockResolvedValueOnce(bare).mockResolvedValueOnce(ok);
    expect(await retryOnJwtClaims(run, NO_WAIT)).toBe(ok);
  });

  test("成功、JWT 過期、其他錯誤都不重試", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const result of [ok, expired, other]) {
      const run = vi.fn().mockResolvedValue(result);
      expect(await retryOnJwtClaims(run, NO_WAIT)).toBe(result);
      expect(run).toHaveBeenCalledTimes(1);
    }
    expect(warn).not.toHaveBeenCalled();
  });

  test("預設的等待時間加起來不超過 3 秒", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.useFakeTimers();
    try {
      const run = vi.fn().mockResolvedValue(future);
      const pending = retryOnJwtClaims(run);
      await vi.advanceTimersByTimeAsync(2800);
      expect(await pending).toBe(future);
      expect(run).toHaveBeenCalledTimes(4);
    } finally {
      vi.useRealTimers();
    }
  });
});
