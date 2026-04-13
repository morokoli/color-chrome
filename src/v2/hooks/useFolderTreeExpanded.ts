import { useCallback, useEffect, useMemo, useRef, useState } from "react"

/**
 * Tracks which folder nodes are expanded in a tree dropdown (Figma-style).
 * New folders default to expanded; existing expand/collapse is preserved across refetches.
 */
export function useFolderTreeExpanded(allFolderIds: readonly string[]) {
  const sortedKey = useMemo(() => [...allFolderIds].sort().join(","), [allFolderIds])
  const prevKeyRef = useRef<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(allFolderIds))

  useEffect(() => {
    if (sortedKey === prevKeyRef.current) return
    const oldKey = prevKeyRef.current ?? ""
    prevKeyRef.current = sortedKey
    const prevIdSet = oldKey ? new Set(oldKey.split(",").filter(Boolean)) : new Set<string>()

    setExpandedIds((prev) => {
      const newIdSet = new Set(allFolderIds)
      const next = new Set<string>()
      // keep previous expand state for existing ids
      for (const id of prev) {
        if (newIdSet.has(id)) next.add(id)
      }
      // default newly introduced ids to expanded
      for (const id of allFolderIds) {
        if (!prevIdSet.has(id)) next.add(id)
      }
      return next
    })
  }, [sortedKey, allFolderIds])

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    setExpandedIds(new Set(allFolderIds))
  }, [sortedKey])

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set())
  }, [])

  const allExpanded = expandedIds.size >= allFolderIds.length && allFolderIds.length > 0

  return { expandedIds, toggleExpanded, expandAll, collapseAll, allExpanded }
}

