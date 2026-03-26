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
