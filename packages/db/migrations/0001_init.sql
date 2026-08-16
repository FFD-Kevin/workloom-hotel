-- 小WorkLoom Phase 1 初始 DDL（对齐 PRD V3.0 §8 数据契约）
-- 9 表：workspaces / members / profiles / tasks / biz_events / fence_rules / approvals / credentials / im_callbacks
-- 铁律：biz_events append-only（触发器禁 UPDATE/DELETE，L6）；全表 workspace 隔离 + RLS

CREATE TABLE workspaces (
  id          bigserial PRIMARY KEY,
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE members (
  id           bigserial PRIMARY KEY,
  workspace_id bigint NOT NULL REFERENCES workspaces(id),
  member_no    text NOT NULL,                 -- MEM-041
  name         text NOT NULL,
  role         text NOT NULL CHECK (role IN ('admin','operator')),
  im_openids   jsonb NOT NULL DEFAULT '{}'::jsonb,  -- {"feishu":"ou_x","dingtalk":"..."}
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, member_no)
);

CREATE TABLE profiles (
  id              bigserial PRIMARY KEY,
  workspace_id    bigint NOT NULL REFERENCES workspaces(id),
  profile_type    text NOT NULL CHECK (profile_type IN ('agent','human','workspace')),
  name            text NOT NULL,              -- 调价Agent
  version         text NOT NULL,              -- v2.3
  preset          jsonb NOT NULL DEFAULT '{}'::jsonb,  -- 工具集/提示词段/围栏声明/档案上下文
  fence_bindings  jsonb NOT NULL DEFAULT '[]'::jsonb,  -- ["R1","R2","R3"]
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','invalid')),
  invalid_reason  text,                       -- preset 校验失败原因（L5）
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name, version)
);

CREATE TABLE tasks (
  id                  bigserial PRIMARY KEY,
  workspace_id        bigint NOT NULL REFERENCES workspaces(id),
  task_no             text NOT NULL,          -- T-102
  title               text NOT NULL,
  status              text NOT NULL DEFAULT 'running'
                      CHECK (status IN ('running','suspended','waiting_review','done','error')),
  progress_done       integer NOT NULL DEFAULT 0,
  progress_total      integer NOT NULL DEFAULT 0,
  assignee_profile_id bigint REFERENCES profiles(id),
  created_by_member_id bigint REFERENCES members(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, task_no)
);

CREATE TABLE biz_events (
  id           bigserial PRIMARY KEY,
  event_id     text NOT NULL UNIQUE,          -- 幂等键（E-8821 / uuid），重复写入丢弃（FE1）
  workspace_id bigint NOT NULL REFERENCES workspaces(id),
  task_id      bigint REFERENCES tasks(id),
  who          jsonb NOT NULL,                -- {type,id,version}
  context      jsonb NOT NULL,                -- {tenant_id,workspace_id,time,channel,stage}
  object       jsonb NOT NULL,                -- {type,id,action}
  decision     jsonb NOT NULL,                -- {action,input,basis,memory_refs}
  rule_impact  jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{rule_id,version,result}]
  receipt      jsonb,                         -- NULL = 未核实，不得宣称完成（L6/E6）
  model_trace  jsonb,
  metering     jsonb NOT NULL DEFAULT '{}'::jsonb,  -- {model_id,tier,window,credits}
  prev_hash    text NOT NULL DEFAULT '',
  hash         text NOT NULL,                 -- sha256(prev_hash || canonical(payload))
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX biz_events_ws_created_idx ON biz_events (workspace_id, created_at DESC);
CREATE INDEX biz_events_task_idx ON biz_events (task_id);

-- append-only：禁 UPDATE/DELETE（L6 操控留痕 100%，不达标构建不得发布）
CREATE OR REPLACE FUNCTION forbid_event_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'biz_events is append-only: % not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER biz_events_no_update BEFORE UPDATE ON biz_events
  FOR EACH ROW EXECUTE FUNCTION forbid_event_mutation();
CREATE TRIGGER biz_events_no_delete BEFORE DELETE ON biz_events
  FOR EACH ROW EXECUTE FUNCTION forbid_event_mutation();

CREATE TABLE fence_rules (
  id           bigserial PRIMARY KEY,
  workspace_id bigint NOT NULL REFERENCES workspaces(id),
  rule_key     text NOT NULL,                 -- R1
  version      integer NOT NULL,
  name         text NOT NULL,
  level        text NOT NULL CHECK (level IN ('auto','review','block')),
  source       text NOT NULL DEFAULT 'custom' CHECK (source IN ('baseline','custom')),
  expr         jsonb NOT NULL,                -- 规则表达式（DSL，Phase 2 fence-engine 解释执行）
  status       text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','retired')),
  dry_run_report jsonb,                       -- dry-run 未出结果不得激活（PI-4 ③）
  created_by_member_id bigint REFERENCES members(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, rule_key, version)
);

CREATE TABLE approvals (
  id           bigserial PRIMARY KEY,
  approval_id  text NOT NULL UNIQUE,          -- A-330
  workspace_id bigint NOT NULL REFERENCES workspaces(id),
  task_id      bigint NOT NULL REFERENCES tasks(id),
  event_id     text NOT NULL REFERENCES biz_events(event_id),
  snapshot     jsonb NOT NULL,                -- {before,after,snapshot_at,expires_at} 过期禁审（E10）
  hit_rules    jsonb NOT NULL DEFAULT '[]'::jsonb,
  status       text NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','approved','edited_approved','rejected','expired')),
  edited_params jsonb,
  reject_reason text,                         -- 驳回必填（PI-3 ②）
  decided_by_member_id bigint REFERENCES members(id),
  decided_at   timestamptz,
  im_push      jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE credentials (
  id            bigserial PRIMARY KEY,
  workspace_id  bigint NOT NULL REFERENCES workspaces(id),
  system        text NOT NULL,                -- feishu / meituan / pms ...
  vault_ref     text NOT NULL,                -- 钥匙串/vault 引用，不存明文（FC5）
  scopes        jsonb NOT NULL DEFAULT '[]'::jsonb,
  health_status text NOT NULL DEFAULT 'unknown'
                CHECK (health_status IN ('ok','degraded','failed','unknown')),
  last_probe_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, system)
);

CREATE TABLE im_callbacks (
  id           bigserial PRIMARY KEY,
  workspace_id bigint NOT NULL REFERENCES workspaces(id),
  channel      text NOT NULL CHECK (channel IN ('feishu','dingtalk')),
  event_id     text NOT NULL,
  direction    text NOT NULL CHECK (direction IN ('push','callback')),
  payload      jsonb NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, event_id, direction)       -- 同事件同渠道幂等（E9）
);

-- 行级隔离（RLS）：应用连接设置 SET app.workspace_id 后生效
ALTER TABLE members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE biz_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE fence_rules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials  ENABLE ROW LEVEL SECURITY;
ALTER TABLE im_callbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY ws_isolation ON members      USING (workspace_id = current_setting('app.workspace_id', true)::bigint);
CREATE POLICY ws_isolation ON profiles     USING (workspace_id = current_setting('app.workspace_id', true)::bigint);
CREATE POLICY ws_isolation ON tasks        USING (workspace_id = current_setting('app.workspace_id', true)::bigint);
CREATE POLICY ws_isolation ON biz_events   USING (workspace_id = current_setting('app.workspace_id', true)::bigint);
CREATE POLICY ws_isolation ON fence_rules  USING (workspace_id = current_setting('app.workspace_id', true)::bigint);
CREATE POLICY ws_isolation ON approvals    USING (workspace_id = current_setting('app.workspace_id', true)::bigint);
CREATE POLICY ws_isolation ON credentials  USING (workspace_id = current_setting('app.workspace_id', true)::bigint);
CREATE POLICY ws_isolation ON im_callbacks USING (workspace_id = current_setting('app.workspace_id', true)::bigint);
