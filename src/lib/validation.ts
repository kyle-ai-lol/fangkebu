// 所有寫進資料庫的資料都先過這裡（zod）。錯誤訊息直接顯示給房仲看。
import { z } from "zod";
import { DISTRICTS, districtShort, FIELD_DEFS, isYmd, STAGES } from "./rules";

const AREA_OPTIONS = DISTRICTS.map(districtShort) as [string, ...string[]];
const FIELD_KEYS = FIELD_DEFS.map((f) => f.key) as [(typeof FIELD_DEFS)[number]["key"], ...(typeof FIELD_DEFS)[number]["key"][]];

const text = (max: number) => z.string().trim().max(max, `最多 ${max} 個字`);
/** 空字串 = 清掉日期 */
const optionalDate = z
  .string()
  .trim()
  .refine((s) => s === "" || isYmd(s), "日期格式不對")
  .transform((s) => (s === "" ? null : s));

export const profileSchema = z.object({
  name: text(40).min(1, "請填你的名字，AI 回覆客人時會用到。"),
  company: text(60),
  phone: text(30),
  areas: z.array(z.enum(AREA_OPTIONS)).max(29),
  botName: text(20).transform((s) => s || "小幫手"),
});

export const signupSchema = profileSchema.extend({
  email: z.email("Email 格式不對"),
  password: z.string().min(8, "密碼至少 8 個字").max(72, "密碼太長了"),
  loadDemo: z.boolean(),
});

export const loginSchema = z.object({
  email: z.email("Email 格式不對"),
  password: z.string().min(1, "請輸入密碼"),
});

export const kbSchema = z.string().max(20000, "知識庫最多 20000 字");

export const idSchema = z.uuid();

export const fieldUpdateSchema = z.object({
  clientId: idSchema,
  key: z.enum(FIELD_KEYS),
  value: text(100),
});

export const metaUpdateSchema = z.discriminatedUnion("key", [
  z.object({ key: z.literal("name"), value: text(40) }),
  z.object({ key: z.literal("stage"), value: z.enum(STAGES) }),
  z.object({ key: z.literal("moveInDate"), value: optionalDate }),
  z.object({ key: z.literal("leaseEnd"), value: optionalDate }),
  z.object({ key: z.literal("isStudent"), value: z.boolean() }),
  z.object({ key: z.literal("needsSubsidy"), value: z.boolean() }),
]);

export const viewingSchema = z.object({
  clientId: idSchema,
  /** <input type="datetime-local"> 的值，當作台灣時間 */
  when: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "約看要填日期時間和物件地址"),
  address: text(200).min(1, "約看要填日期時間和物件地址"),
});

export const logSchema = z.object({
  clientId: idSchema,
  text: text(2000).min(1, "紀錄不能空白"),
});

/** zod 錯誤 → 第一則訊息 */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "資料格式不對";
}
