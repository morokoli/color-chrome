import { AlertTriangle } from "lucide-react"
import { MultiSelectDropdown } from "./MultiSelectDropdown"

interface ProjectDropdownProps {
  selectedProjects: string[]
  projects: {
    name: string
    id: string
  }[]
  onSelectProjects: (projects: string[]) => void
  isVisible?: boolean
}

export const ProjectDropdown = ({
  selectedProjects,
  projects,
  onSelectProjects,
  isVisible = true,
}: ProjectDropdownProps) => {
  if (!isVisible) return null

  if (projects.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-700">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
        <span>No projects found. Create a project in Figma first.</span>
      </div>
    )
  }

  return (
    <MultiSelectDropdown
      isVisible={isVisible}
      placeholder="Select Projects"
      selected={selectedProjects}
      items={projects.map((project) => project.name)}
      renderSelected={(selected) => {
        if (selected.length === 0) return "Select Projects"
        if (selected.length === 1) return selected[0]
        return `${selected.length} projects selected`
      }}
      renderItem={(project) => project}
      onSelect={onSelectProjects}
    />
  )
}
