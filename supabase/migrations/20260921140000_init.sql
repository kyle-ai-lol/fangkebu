-- 房客簿 階段 1：房仲、客戶、追蹤紀錄、約看
-- 一位房仲 = 一個租戶。每張表都有 agent_id，RLS 限制每位房仲只能讀寫自己的資料。
-- messages 表、LINE 金鑰欄位、line_user_id、human_takeover 等階段 3 再加。

create type public.client_stage as enum ('新詢問', '資料蒐集中', '待推薦', '已約看', '斡旋中', '已成交', '暫停');
-- 「示範」= 放入示範客戶時建立的虛構資料，方便整批換掉
create type public.client_source as enum ('手動', 'AI 接客', '貼上整理', '示範');

-- ---------- 房仲 ----------
create table public.agents (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  company text not null default '',
  phone text not null default '',
  bot_name text not null default '小幫手',
  areas text[] not null default '{}',
  -- null = 還沒改過，畫面上顯示示範知識庫
  kb text,
  created_at timestamptz not null default now(),
  constraint agents_len check (
    char_length(name) <= 40 and char_length(company) <= 60 and char_length(phone) <= 30
    and char_length(bot_name) <= 20 and cardinality(areas) <= 29 and char_length(coalesce(kb, '')) <= 20000
  )
);

-- ---------- 客戶 ----------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null default auth.uid() references public.agents (id) on delete cascade,
  name text not null default '',          -- 原本稱呼
  -- 12 項找房條件（照客人原話存文字）
  people text not null default '',        -- 1 入住人數
  move_in text not null default '',       -- 2 最快入住時間
  job text not null default '',           -- 3 職業身份
  smoke text not null default '',         -- 4 有無抽菸
  pet text not null default '',           -- 5 有無寵物
  phone text not null default '',         -- 6 電話號碼
  gender text not null default '',        -- 7 性別
  age text not null default '',           -- 8 年齡
  area text not null default '',          -- 9 希望居住行政區或學校／公司全名
  budget text not null default '',        -- 10 預算金額
  transport text not null default '',     -- 11 交通工具
  commute text not null default '',       -- 12 騎車幾分鐘到第 9 項地點
  move_in_date date,
  lease_end date,
  is_student boolean not null default false,
  needs_subsidy boolean not null default false,
  stage public.client_stage not null default '新詢問',
  source public.client_source not null default '手動',
  handoff_question text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 給追蹤紀錄、約看的複合外鍵用：確保它們只能掛在同一位房仲的客人底下
  unique (id, agent_id),
  constraint clients_len check (
    char_length(name) <= 40
    and char_length(people) <= 100 and char_length(move_in) <= 100 and char_length(job) <= 100
    and char_length(smoke) <= 100 and char_length(pet) <= 100 and char_length(phone) <= 100
    and char_length(gender) <= 100 and char_length(age) <= 100 and char_length(area) <= 100
    and char_length(budget) <= 100 and char_length(transport) <= 100 and char_length(commute) <= 100
    and char_length(coalesce(handoff_question, '')) <= 500
  )
);
create index clients_agent_id_idx on public.clients (agent_id);

-- ---------- 追蹤紀錄 ----------
create table public.client_logs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null default auth.uid(),
  client_id uuid not null,
  text text not null check (char_length(text) between 1 and 2000),
  created_at timestamptz not null default now(),
  foreign key (client_id, agent_id) references public.clients (id, agent_id) on delete cascade
);
create index client_logs_agent_id_idx on public.client_logs (agent_id);
create index client_logs_client_id_idx on public.client_logs (client_id);

-- ---------- 約看 ----------
create table public.viewings (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null default auth.uid(),
  client_id uuid not null,
  starts_at timestamptz not null,
  address text not null check (char_length(address) between 1 and 200),
  created_at timestamptz not null default now(),
  foreign key (client_id, agent_id) references public.clients (id, agent_id) on delete cascade
);
create index viewings_agent_id_idx on public.viewings (agent_id);
create index viewings_client_id_idx on public.viewings (client_id);

-- ---------- 客戶資料有改就更新 updated_at（提醒「3 天沒更新」用） ----------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- ---------- 註冊時自動建立房仲資料（照 Supabase 官方寫法；這裡出錯會擋住註冊，所以每個欄位都有預設值） ----------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.agents (id, name, company, phone, bot_name, areas)
  values (
    new.id,
    left(coalesce(meta ->> 'name', ''), 40),
    left(coalesce(meta ->> 'company', ''), 60),
    left(coalesce(meta ->> 'phone', ''), 30),
    coalesce(nullif(left(meta ->> 'bot_name', 20), ''), '小幫手'),
    case
      when jsonb_typeof(meta -> 'areas') = 'array'
        then (select coalesce(array_agg(left(a, 10)), '{}') from (select jsonb_array_elements_text(meta -> 'areas') as a limit 29) s)
      else '{}'
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- 權限：未登入的人完全碰不到；登入的人只靠 RLS 看到自己的 ----------
revoke all on table public.agents, public.clients, public.client_logs, public.viewings from anon;
grant select, update on table public.agents to authenticated;
grant select, insert, update, delete on table public.clients, public.client_logs, public.viewings to authenticated;

alter table public.agents enable row level security;
alter table public.clients enable row level security;
alter table public.client_logs enable row level security;
alter table public.viewings enable row level security;

-- 房仲資料：只能看、改自己的（新增由註冊觸發器處理，刪除跟著帳號刪除）
create policy "agents: select own" on public.agents
  for select to authenticated using ((select auth.uid()) = id);
create policy "agents: update own" on public.agents
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- 客戶
create policy "clients: select own" on public.clients
  for select to authenticated using ((select auth.uid()) = agent_id);
create policy "clients: insert own" on public.clients
  for insert to authenticated with check ((select auth.uid()) = agent_id);
create policy "clients: update own" on public.clients
  for update to authenticated using ((select auth.uid()) = agent_id) with check ((select auth.uid()) = agent_id);
create policy "clients: delete own" on public.clients
  for delete to authenticated using ((select auth.uid()) = agent_id);

-- 追蹤紀錄
create policy "client_logs: select own" on public.client_logs
  for select to authenticated using ((select auth.uid()) = agent_id);
create policy "client_logs: insert own" on public.client_logs
  for insert to authenticated with check ((select auth.uid()) = agent_id);
create policy "client_logs: update own" on public.client_logs
  for update to authenticated using ((select auth.uid()) = agent_id) with check ((select auth.uid()) = agent_id);
create policy "client_logs: delete own" on public.client_logs
  for delete to authenticated using ((select auth.uid()) = agent_id);

-- 約看
create policy "viewings: select own" on public.viewings
  for select to authenticated using ((select auth.uid()) = agent_id);
create policy "viewings: insert own" on public.viewings
  for insert to authenticated with check ((select auth.uid()) = agent_id);
create policy "viewings: update own" on public.viewings
  for update to authenticated using ((select auth.uid()) = agent_id) with check ((select auth.uid()) = agent_id);
create policy "viewings: delete own" on public.viewings
  for delete to authenticated using ((select auth.uid()) = agent_id);
