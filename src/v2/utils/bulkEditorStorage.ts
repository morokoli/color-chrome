const LEGACY_FOLDERS_KEY = "bulk_editor_selected_folders"
const LEGACY_NON_FOLDERED_KEY = "bulk_editor_include_non_foldered"
const LEGACY_COLORS_KEY = "bulk_editor_selected_colors"

export function bulkEditorFoldersKey(workspaceId: string | null | undefined): string {
  return workspaceId ? `bulk_editor_selected_folders_${workspaceId}` : LEGACY_FOLDERS_KEY
}

export function bulkEditorNonFolderedKey(workspaceId: string | null | undefined): string {
  return workspaceId ? `bulk_editor_include_non_foldered_${workspaceId}` : LEGACY_NON_FOLDERED_KEY
}

export function bulkEditorColorsKey(workspaceId: string | null | undefined): string {
  return workspaceId ? `bulk_editor_selected_colors_${workspaceId}` : LEGACY_COLORS_KEY
}
