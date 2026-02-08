import {
  Pipette,
  Sparkles,
  History,
  Copy,
  FileSpreadsheet,
  Figma,
  PanelTop,
  Palette,
  Edit3,
  Monitor,
} from "lucide-react"

export type SectionMenuActionKey = "pickColor" | "pickFromBrowser"

export interface SectionMenuItem {
  title: string
  Icon: React.ComponentType<React.SVGAttributes<SVGElement>>
  menuName?: string | null
  actionKey?: SectionMenuActionKey
  /** For MainMenu grouping */
  section: string | null
}

/** Flat list of all section menu items for dropdown and for MainMenu */
export const SECTION_MENU_ITEMS: SectionMenuItem[] = [
  { title: "Pick Color", Icon: Pipette, actionKey: "pickColor", section: "Color Actions" },
  { title: "Pick color outside browser", Icon: Monitor, actionKey: "pickFromBrowser", section: "Color Actions" },
  { title: "Website Colors", Icon: PanelTop, menuName: "COLOR_EXTRACTION", section: "Color Actions" },
  { title: "Generator", Icon: Palette, menuName: "GENERATOR", section: "Color Actions" },
  { title: "AI Generator", Icon: Sparkles, menuName: "AI_GENERATOR", section: "Color Actions" },
  { title: "Copy", Icon: Copy, menuName: "COPY", section: null },
  { title: "History & Editor", Icon: History, menuName: "COMMENT", section: null },
  { title: "Bulk Editor", Icon: Edit3, menuName: "BULK_EDITOR", section: null },
  { title: "Figma", Icon: Figma, menuName: "FIGMA_MANAGER", section: "Integration" },
  { title: "Sheet", Icon: FileSpreadsheet, menuName: "EXPORT_TO_SHEET", section: "Export to" },
]
