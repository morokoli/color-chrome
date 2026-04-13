import type { MouseEvent } from "react"
import { Folder } from "lucide-react"

const DEPTH_INDENT_PX = 14

type Props = {
  depth: number
  name: string
  title?: string
  /** Show expand/collapse control (Figma-style); spacer when false */
  hasChildren?: boolean
  expanded?: boolean
  onToggleExpand?: (e: MouseEvent<HTMLButtonElement>) => void
}

/** Folder row: chevron (if nested branch) + folder icon + name — matches Figma Sync folder tree. */
export function FolderDropdownRow({
  depth,
  name,
  title,
  hasChildren = false,
  expanded = true,
  onToggleExpand,
}: Props) {
  return (
    <div
      className="flex w-full min-w-0 items-center gap-0.5"
      style={{ paddingLeft: depth * DEPTH_INDENT_PX }}
      title={title ?? name}
    >
      {hasChildren ? (
        <button
          type="button"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-gray-600 transition-colors hover:bg-gray-200/70 hover:text-gray-900 focus:outline-none"
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand?.(e)
          }}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
            aria-hidden
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      ) : (
        <span className="h-5 w-5 shrink-0" aria-hidden />
      )}
      <span className="ml-0.5 inline-flex shrink-0 text-gray-500" aria-hidden>
        <Folder className="h-4 w-4" strokeWidth={1.5} />
      </span>
      <span className="min-w-0 flex-1 truncate pl-1.5 text-[12px] text-gray-800">{name}</span>
    </div>
  )
}
