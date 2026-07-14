let activeWorkspaceId: string | null = null

export function getActiveWorkspaceId(): string | null {
  return activeWorkspaceId
}

export function setActiveWorkspaceId(workspaceId: string | null): void {
  activeWorkspaceId = workspaceId
}
