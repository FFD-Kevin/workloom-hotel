/**
 * tenancy · 成员与角色读服务（F5.6；越权返回空 L7.1 由 RLS+显式 scope 双保险）
 */
import type pg from "pg";
import type { MemberRole } from "@workloom/shared";

export interface MemberRow {
  id: string;
  memberNo: string;
  name: string;
  role: MemberRole;
}

export async function getMember(
  app: pg.Pool,
  scope: { tenantId: string; workspaceId: string },
  memberNo: string,
): Promise<MemberRow | null> {
  const client = await app.connect();
  try {
    await client.query("SELECT set_config('app.workspace_id', $1, false)", [scope.workspaceId]);
    await client.query("SELECT set_config('app.tenant_id', $1, false)", [scope.tenantId]);
    const r = await client.query<MemberRow & { member_no: string }>(
      `SELECT id, member_no, name, role FROM members WHERE workspace_id=$1 AND member_no=$2`,
      [scope.workspaceId, memberNo],
    );
    const row = r.rows[0];
    return row ? { id: row.id, memberNo: row.member_no, name: row.name, role: row.role } : null;
  } finally {
    client.release();
  }
}

export async function listMembers(
  app: pg.Pool,
  scope: { tenantId: string; workspaceId: string },
): Promise<MemberRow[]> {
  const client = await app.connect();
  try {
    await client.query("SELECT set_config('app.workspace_id', $1, false)", [scope.workspaceId]);
    await client.query("SELECT set_config('app.tenant_id', $1, false)", [scope.tenantId]);
    const r = await client.query<{ id: string; member_no: string; name: string; role: MemberRole }>(
      `SELECT id, member_no, name, role FROM members WHERE workspace_id=$1 ORDER BY member_no`,
      [scope.workspaceId],
    );
    return r.rows.map((row) => ({ id: row.id, memberNo: row.member_no, name: row.name, role: row.role }));
  } finally {
    client.release();
  }
}
