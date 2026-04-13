/** Same tree shape as Sidebar `buildFolderTree` (parent → childFolders links). */
export function buildFolderTreeFromFlat<T extends { _id: string; childFolders?: string[] }>(
  folders: T[]
): Array<T & { children: unknown[]; isChild?: boolean }> {
  if (!Array.isArray(folders) || folders.length === 0) return []
  const folderMap = Object.create(null) as Record<
    string,
    T & { children: unknown[]; isChild?: boolean }
  >
  folders.forEach((folder) => {
    if (!folder._id) return
    folderMap[folder._id] = { ...folder, children: [] }
  })
  folders.forEach((folder) => {
    if (!folder._id) return
    ;(folder.childFolders || []).forEach((childId) => {
      if (childId && folderMap[childId]) {
        folderMap[folder._id].children.push(folderMap[childId])
        folderMap[childId].isChild = true
      }
    })
  })
  return Object.values(folderMap).filter((f) => !f.isChild)
}

/** Depth-first preorder — parents before descendants (matches sidebar hierarchy). */
export function flattenFoldersHierarchyOrder<T extends { _id: string; childFolders?: string[] }>(
  folders: T[]
): T[] {
  const roots = buildFolderTreeFromFlat(folders)
  const out: T[] = []
  const walk = (node: T & { children?: unknown[]; isChild?: boolean }) => {
    const { children, isChild: _ic, ...rest } = node
    out.push(rest as T)
    ;(children as typeof roots).forEach(walk)
  }
  roots.forEach(walk)
  return out
}

/** Build child folder id → direct parent folder id from the flat folder list. */
export function buildParentIdByChildId(
  folders: { _id?: string; childFolders?: string[] }[] | undefined | null
): Record<string, string> {
  const parentByChild = Object.create(null) as Record<string, string>
  if (!Array.isArray(folders)) return parentByChild
  for (const f of folders) {
    if (!f?._id) continue
    for (const childId of f.childFolders || []) {
      if (childId) parentByChild[childId] = f._id
    }
  }
  return parentByChild
}

export function getFolderLabelWithParent(
  folder: { _id: string; name: string } | null | undefined,
  folders: { _id: string; name: string; childFolders?: string[] }[],
  parentByChildMap?: Record<string, string>
): string {
  if (!folder) return ""
  const map = parentByChildMap || buildParentIdByChildId(folders)
  const parentId = map[folder._id]
  if (!parentId) return folder.name
  const parent = folders.find((f) => f._id === parentId)
  if (!parent?.name) return folder.name
  return `${folder.name} (Child of: ${parent.name})`
}

/** Depth in the folder tree (root = 0). */
export function getFolderDepthById(
  folderId: string,
  parentByChildId: Record<string, string>
): number {
  let depth = 0
  let cur = folderId
  // Guard against cycles / bad data
  for (let i = 0; i < 50; i++) {
    const parent = parentByChildId[cur]
    if (!parent) break
    depth++
    cur = parent
  }
  return depth
}

/** True if this folder lists at least one child that exists in the same folder list. */
export function folderHasChildrenInList(
  folder: { _id: string; childFolders?: string[] },
  existingIds: Set<string>,
): boolean {
  for (const cid of folder.childFolders || []) {
    if (cid && existingIds.has(cid)) return true
  }
  return false
}

/**
 * Pre-order folder ids respecting expand/collapse (like Figma folder tree).
 * `expandedIds`: folder id is expanded iff it is in the set (leaves may be omitted).
 */
export function flattenVisibleFolderIdsInOrder<T extends { _id: string; childFolders?: string[] }>(
  folders: T[],
  expandedIds: Set<string>,
): string[] {
  const roots = buildFolderTreeFromFlat(folders)
  const out: string[] = []
  const walk = (node: T & { children?: unknown[] }) => {
    out.push(node._id)
    const children = (node.children || []) as (T & { children?: unknown[] })[]
    if (expandedIds.has(node._id) && children.length > 0) {
      children.forEach(walk)
    }
  }
  roots.forEach(walk)
  return out
}

/** "Parent / Child / Grandchild" label for selected display/search. */
export function getFolderPathLabelById(
  folderId: string,
  folders: { _id: string; name: string }[],
  parentByChildId: Record<string, string>
): string {
  const byId = new Map(folders.map((f) => [f._id, f.name]))
  const parts: string[] = []
  let cur: string | undefined = folderId
  for (let i = 0; i < 50 && cur; i++) {
    const name = byId.get(cur)
    if (name) parts.push(name)
    cur = parentByChildId[cur]
  }
  return parts.reverse().join(" / ")
}
