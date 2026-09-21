// 規則模式抽取：AI 失敗時，用簡單規則從對話文字抓出 12 項條件。

import { parseBudget } from "./budget";
import type { ClientFields } from "./client";
import { mdToYmd, type Ymd } from "./dates";
import { detectDistricts, districtShort } from "./districts";

export interface Extracted {
  fields: Partial<ClientFields>;
  moveInDate?: Ymd;
  leaseEnd?: Ymd;
  student?: boolean;
  subsidy?: boolean;
}

const CN: Record<string, number> = { 一: 1, 兩: 2, 二: 2, 三: 3, 四: 4, 五: 5 };

export function ruleExtract(text: string, today: Ymd): Extracted {
  let t = String(text || "");
  const f: Partial<ClientFields> = {};
  const o: Extracted = { fields: f };

  // 電話、租約日期先抓出來再從文字拿掉，免得被當成預算或入住日
  const ph = t.match(/09\d{2}[-\s]?\d{3}[-\s]?\d{3}/);
  if (ph) {
    const digits = ph[0].replace(/\D/g, "");
    f.phone = `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
    t = t.replace(ph[0], " ");
  }
  const lease = t.match(/(租約|合約|約)[^0-9]{0,6}(\d{1,2})\s*[/月]\s*(\d{1,2})/);
  if (lease) {
    o.leaseEnd = mdToYmd(+lease[2], +lease[3], today);
    t = t.replace(lease[0], " ");
  }

  const bre = /(預算|租金|月租|價位)?\s*(\d{1,2}(?:\.\d)?\s*萬\s*\d?|\d{1,2}\s*[千kK]|\d{4,6})\s*(元|塊|以內|以下|左右|上下|內)?/g;
  for (let m = bre.exec(t); m; m = bre.exec(t)) {
    const num = m[2].replace(/\s/g, "");
    const ok = m[1] || m[3] || /萬|千|k/i.test(num) || (/^\d{4,5}$/.test(num) && +num >= 3000 && +num <= 60000);
    if (!ok) continue;
    const b = parseBudget(num);
    if (b >= 2000 && b <= 300000) {
      f.budget = String(b);
      break;
    }
  }

  const ds = detectDistricts(t);
  const inst = t.match(/(?:我在|我是|在|到|去|靠近|離|近)?([一-龥A-Za-z]{2,6}?(大學|科大|醫大|學院|專科|高中|國中|醫院|榮總|園區))/);
  const instName = inst ? inst[1].replace(/^(?:想住在|想住|想要|住在|我在|我是|附近的|在|到|去|靠近|離|近|住)+/, "") : "";
  if (ds.length || instName) {
    f.area = ds.map(districtShort).concat(instName ? [instName] : []).join("、");
  } else {
    const vg = t.match(/(學校|公司)附近/);
    if (vg) f.area = vg[0];
  }

  const pm = t.match(/(\d|一|兩|二|三|四|五)\s*個?\s*人/);
  if (pm) f.people = `${CN[pm[1]] ?? pm[1]} 人`;

  if (/(不|沒|沒有|無)\s*(在)?\s*抽\s*(菸|煙)/.test(t)) f.smoke = "無";
  else if (/抽\s*(菸|煙)/.test(t)) f.smoke = "有";

  if (/(沒|沒有|無|不)\s*(養)?\s*(寵物|貓|狗)/.test(t)) f.pet = "無";
  else {
    const pt = t.match(/([一兩二三\d]\s*[隻只]\s*)?(貓|狗|兔子|兔|鳥|寵物)/);
    if (pt) f.pet = pt[0].replace(/\s/g, "");
  }

  if (/男生|男性|先生/.test(t)) f.gender = "男";
  else if (/女生|女性|小姐/.test(t)) f.gender = "女";

  const ag = t.match(/(\d{2})\s*歲/);
  if (ag) f.age = `${ag[1]} 歲`;
  const tr = t.match(/機車|摩托車|汽車|開車|捷運|公車|腳踏車|走路/);
  if (tr) f.transport = tr[0];
  const cm = t.match(/(\d{1,2})\s*分鐘/);
  if (cm) f.commute = `${cm[1]} 分鐘`;
  const jb = t.match(/研究生|大學生|學生|上班族|工程師|護理師|老師|業務|服務業|作業員|軍人|醫師|設計師/);
  if (jb) f.job = jb[0];

  const mv = t.match(/(\d{1,2})\s*[/月]\s*(\d{1,2})?\s*(號|日)?(初|底|中)?|月底|月初|下個月|下週|下禮拜|馬上|隨時|越快越好/);
  if (mv) {
    f.moveIn = mv[0].replace(/\s/g, "");
    if (mv[1] && +mv[1] >= 1 && +mv[1] <= 12) {
      const day = mv[2] ? +mv[2] : mv[4] === "底" ? 28 : mv[4] === "中" ? 15 : 1;
      o.moveInDate = mdToYmd(+mv[1], day, today);
    }
  }

  if (/租補|租金補貼/.test(t)) o.subsidy = true;
  if (f.job && /學生/.test(f.job)) o.student = true;
  return o;
}
