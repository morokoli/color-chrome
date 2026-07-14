/** Plan limit helpers for workspace (and related) entitlement checks. */

export type Entitlements = {
  limits?: {
    workspace_limit?: number | string | null
  }
  usage?: {
    workspaces?: number
  }
}

export function isUnlimited(limit: unknown): boolean {
  return (
    limit === "unlimited" ||
    limit === undefined ||
    limit === null ||
    String(limit).toLowerCase() === "unlimited"
  )
}

/**
 * Plan `workspace_limit` includes the personal/default workspace.
 * Backend usage.workspaces counts team (non-personal) only, so add 1.
 */
export function isAtWorkspaceLimit(entitlements: Entitlements | null | undefined): boolean {
  if (!entitlements) return false
  const limit = entitlements.limits?.workspace_limit
  if (isUnlimited(limit)) return false
  const teamOwned = Number(entitlements.usage?.workspaces ?? 0) || 0
  const totalOwned = teamOwned + 1
  return totalOwned >= Number(limit)
}

/** Backend uses `workspace_limit_exceeded` (not `PLAN_LIMIT`). */
export function isWorkspaceLimitError(errorOrResult: unknown): boolean {
  const err = errorOrResult as {
    response?: { data?: { code?: string; err?: string; message?: string } }
    code?: string
    message?: string
    err?: string
    error?: string
  }
  const code = err?.response?.data?.code || err?.code || ""
  if (code === "workspace_limit_exceeded") return true
  const message = String(
    err?.response?.data?.err ||
      err?.response?.data?.message ||
      err?.error ||
      err?.message ||
      "",
  ).toLowerCase()
  return message.includes("workspace limit")
}
