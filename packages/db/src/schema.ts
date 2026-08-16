// drizzle schema —— 与 migrations/0001_init.sql 严格一致（schema 即类型源）
import {
  pgTable, bigserial, text, integer, jsonb, timestamp,
  uniqueIndex, index,
} from 'drizzle-orm/pg-core'

type Json = Record<string, unknown>

export const workspaces = pgTable('workspaces', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const members = pgTable('members', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  workspaceId: bigint('workspace_id', { mode: 'number' }).notNull().references(() => workspaces.id),
  memberNo: text('member_no').notNull(),
  name: text('name').notNull(),
  role: text('role', { enum: ['admin', 'operator'] }).notNull(),
  imOpenids: jsonb('im_openids').$type<Json>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('members_ws_no_uniq').on(t.workspaceId, t.memberNo)])

export const profiles = pgTable('profiles', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  workspaceId: bigint('workspace_id', { mode: 'number' }).notNull().references(() => workspaces.id),
  profileType: text('profile_type', { enum: ['agent', 'human', 'workspace'] }).notNull(),
  name: text('name').notNull(),
  version: text('version').notNull(),
  preset: jsonb('preset').$type<Json>().notNull().default({}),
  fenceBindings: jsonb('fence_bindings').$type<string[]>().notNull().default([]),
  status: text('status', { enum: ['active', 'inactive', 'invalid'] }).notNull().default('active'),
  invalidReason: text('invalid_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('profiles_ws_name_ver_uniq').on(t.workspaceId, t.name, t.version)])

export const tasks = pgTable('tasks', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  workspaceId: bigint('workspace_id', { mode: 'number' }).notNull().references(() => workspaces.id),
  taskNo: text('task_no').notNull(),
  title: text('title').notNull(),
  status: text('status', { enum: ['running', 'suspended', 'waiting_review', 'done', 'error'] })
    .notNull().default('running'),
  progressDone: integer('progress_done').notNull().default(0),
  progressTotal: integer('progress_total').notNull().default(0),
  assigneeProfileId: bigint('assignee_profile_id', { mode: 'number' }).references(() => profiles.id),
  createdByMemberId: bigint('created_by_member_id', { mode: 'number' }).references(() => members.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('tasks_ws_no_uniq').on(t.workspaceId, t.taskNo)])

export const bizEvents = pgTable('biz_events', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  eventId: text('event_id').notNull().unique(),
  workspaceId: bigint('workspace_id', { mode: 'number' }).notNull().references(() => workspaces.id),
  taskId: bigint('task_id', { mode: 'number' }).references(() => tasks.id),
  who: jsonb('who').$type<Json>().notNull(),
  context: jsonb('context').$type<Json>().notNull(),
  object: jsonb('object').$type<Json>().notNull(),
  decision: jsonb('decision').$type<Json>().notNull(),
  ruleImpact: jsonb('rule_impact').$type<Json[]>().notNull().default([]),
  receipt: jsonb('receipt').$type<Json>(),
  modelTrace: jsonb('model_trace').$type<Json>(),
  metering: jsonb('metering').$type<Json>().notNull().default({}),
  prevHash: text('prev_hash').notNull().default(''),
  hash: text('hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('biz_events_ws_created_idx').on(t.workspaceId, t.createdAt),
  index('biz_events_task_idx').on(t.taskId),
])

export const fenceRules = pgTable('fence_rules', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  workspaceId: bigint('workspace_id', { mode: 'number' }).notNull().references(() => workspaces.id),
  ruleKey: text('rule_key').notNull(),
  version: integer('version').notNull(),
  name: text('name').notNull(),
  level: text('level', { enum: ['auto', 'review', 'block'] }).notNull(),
  source: text('source', { enum: ['baseline', 'custom'] }).notNull().default('custom'),
  expr: jsonb('expr').$type<Json>().notNull(),
  status: text('status', { enum: ['draft', 'active', 'retired'] }).notNull().default('draft'),
  dryRunReport: jsonb('dry_run_report').$type<Json>(),
  createdByMemberId: bigint('created_by_member_id', { mode: 'number' }).references(() => members.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('fence_rules_ws_key_ver_uniq').on(t.workspaceId, t.ruleKey, t.version)])

export const approvals = pgTable('approvals', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  approvalId: text('approval_id').notNull().unique(),
  workspaceId: bigint('workspace_id', { mode: 'number' }).notNull().references(() => workspaces.id),
  taskId: bigint('task_id', { mode: 'number' }).notNull().references(() => tasks.id),
  eventId: text('event_id').notNull().references(() => bizEvents.eventId),
  snapshot: jsonb('snapshot').$type<Json>().notNull(),
  hitRules: jsonb('hit_rules').$type<Json[]>().notNull().default([]),
  status: text('status', { enum: ['pending', 'approved', 'edited_approved', 'rejected', 'expired'] })
    .notNull().default('pending'),
  editedParams: jsonb('edited_params').$type<Json>(),
  rejectReason: text('reject_reason'),
  decidedByMemberId: bigint('decided_by_member_id', { mode: 'number' }).references(() => members.id),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  imPush: jsonb('im_push').$type<Json[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const credentials = pgTable('credentials', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  workspaceId: bigint('workspace_id', { mode: 'number' }).notNull().references(() => workspaces.id),
  system: text('system').notNull(),
  vaultRef: text('vault_ref').notNull(),
  scopes: jsonb('scopes').$type<string[]>().notNull().default([]),
  healthStatus: text('health_status', { enum: ['ok', 'degraded', 'failed', 'unknown'] })
    .notNull().default('unknown'),
  lastProbeAt: timestamp('last_probe_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('credentials_ws_system_uniq').on(t.workspaceId, t.system)])

export const imCallbacks = pgTable('im_callbacks', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  workspaceId: bigint('workspace_id', { mode: 'number' }).notNull().references(() => workspaces.id),
  channel: text('channel', { enum: ['feishu', 'dingtalk'] }).notNull(),
  eventId: text('event_id').notNull(),
  direction: text('direction', { enum: ['push', 'callback'] }).notNull(),
  payload: jsonb('payload').$type<Json>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('im_callbacks_idem_uniq').on(t.channel, t.eventId, t.direction)])
