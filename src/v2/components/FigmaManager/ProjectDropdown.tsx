import { MultiSelectDropdown } from "./MultiSelectDropdown"

interface ProjectDropdownProps {
  selectedProjects: string[]
  projects: {
    name: string
    id: string
  }[]
  onSelectProjects: (projects: string[]) => void
}

export const ProjectDropdown = ({
  selectedProjects,
  projects,
  onSelectProjects,
}: ProjectDropdownProps) => {
  return (
    <MultiSelectDropdown
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
