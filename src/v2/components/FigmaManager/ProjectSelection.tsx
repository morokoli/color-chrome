interface ProjectSelectionProps {
  isOpen: boolean
  searchTerm: string
  onSearchChange: (value: string) => void
  selectedProjects: {
    name: string
    id: string
  }[]
  onToggleProject: (project: { name: string; key: string }) => void
  projects: {
    name: string
    key: string
  }[]
}

export const ProjectSelection = ({
  isOpen,
  searchTerm,
  onSearchChange,
  selectedProjects,
  onToggleProject,
  projects,
}: ProjectSelectionProps) => {
  if (!isOpen) return null

  return (
    <div className="border w-[300px] p-2 bg-white z-10 mb-4">
      <div className="flex items-center border-b pb-2 mb-2">
        <span className="mr-2">🔍</span>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search"
          className="w-full outline-none"
        />
      </div>
      <div className="flex flex-col gap-2">
        {projects
          .map((project) => (
            <label
              key={project.key}
              className="flex justify-between items-center border-b py-1 px-2"
            >
              {project.name}
              <input
                type="checkbox"
                checked={
                  selectedProjects.find((p) => p.name === project.name)
                    ? true
                    : false
                }
                onChange={() => onToggleProject(project)}
              />
            </label>
          ))}
      </div>
    </div>
  )
}
