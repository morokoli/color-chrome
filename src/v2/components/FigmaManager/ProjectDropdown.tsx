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
