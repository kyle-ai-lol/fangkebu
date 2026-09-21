import { describe, expect, test, vi } from "vitest";
import { retryOnJwtClaims } from "./retry";

const ok = { data: [1], error: null };
const jwt = { data: null, error: { code: "PGRST303" } };
const other = { data: null, error: { code: "42501" } };

describe("PGRST303 重試", () => {
  test("第一次 PGRST303、第二次成功 → 回傳成功結果", async () => {
    const run = vi.fn().mockResolvedValueOnce(jwt).mockResolvedValueOnce(ok);
    expect(await retryOnJwtClaims(run, 0)).toBe(ok);
    expect(run).toHaveBeenCalledTimes(2);
  });

  test("只重試一次，還是失敗就把錯誤交出去", async () => {
    const run = vi.fn().mockResolvedValue(jwt);
    expect(await retryOnJwtClaims(run, 0)).toBe(jwt);
    expect(run).toHaveBeenCalledTimes(2);
  });

  test("成功或其他錯誤都不重試", async () => {
    const good = vi.fn().mockResolvedValue(ok);
    const bad = vi.fn().mockResolvedValue(other);
    expect(await retryOnJwtClaims(good, 0)).toBe(ok);
    expect(await retryOnJwtClaims(bad, 0)).toBe(other);
    expect(good).toHaveBeenCalledTimes(1);
    expect(bad).toHaveBeenCalledTimes(1);
  });
});
