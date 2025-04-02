import { useState } from "react"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { ChevronDown, Plus } from "lucide-react"

const MOCK_PROJECTS = [
  "Figma Project 1",
  "Figma Project 2",
  "Figma Project 3",
  "Figma Project 4",
]

const Right = () => {
  const { state, dispatch } = useGlobalState()
  const { selectedColorsFromFile } = state
  const [slashNameInputs, setSlashNameInputs] = useState<string[]>([
    "",
    "",
    "",
    "",
    "",
  ])
  const [activeColor, setActiveColor] = useState<string | null>(null)

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [accounts, setAccounts] = useState([
    "Figma Account 1",
    "Figma Account 2",
  ])
  const [selectedAccount, setSelectedAccount] = useState("Figma Account")

  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const [isProjectsOpen, setIsProjectsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [projectInputValue, setProjectInputValue] = useState("")

  const handleCheckboxClick = (item: {
    color: string
    slashNaming: string
  }) => {
    if (activeColor === item.color) {
      setActiveColor(null)
      setSlashNameInputs(["", "", "", "", ""])
    } else {
      const parts = item.slashNaming
        .split("/")
        .map((p) => p.trim())
        .slice(0, 5)
      const filled = [...parts, "", "", "", "", ""].slice(0, 5)
      setSlashNameInputs(filled)
      setActiveColor(item.color)
    }
  }

  const handleChangeSlashNaming = () => {
    if (!activeColor) return
    const newSlashNaming = slashNameInputs.filter(Boolean).join(" / ")
    dispatch({
      type: "UPDATE_SELECTED_COLOR_SLASHNAMING",
      payload: { color: activeColor, slashNaming: newSlashNaming },
    })
  }

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen)

  const handleSelectAccount = (account: string) => {
    setSelectedAccount(account)
    setIsDropdownOpen(false)
    setIsProjectsOpen(true)
  }

  const handleSignIn = () => {
    if (!email.trim()) return
    setAccounts([...accounts, email])
    setEmail("")
    setPassword("")
    setIsSignInModalOpen(false)
    setSelectedAccount(email)
    setIsProjectsOpen(true)
  }

  const handleToggleProject = (project: string) => {
    setSelectedProjects((prev) =>
      prev.includes(project)
        ? prev.filter((p) => p !== project)
        : [...prev, project],
    )
    setIsProjectsOpen(false)
    setProjectInputValue(project)
  }

  return (
    <div className="relative min-h-[100vh] overflow-y-auto p-4">
      {/* Dropdown */}
      <div className="flex mb-4 gap-4">
        <div className="relative w-[200px] text-sm">
          <button
            onClick={toggleDropdown}
            className="w-full flex justify-between items-center border px-3 py-2"
          >
            {selectedAccount}
            <ChevronDown size={18} />
          </button>

          {isDropdownOpen && (
            <div className="absolute w-full border mt-1 bg-white z-10">
              {accounts.map((account, i) => (
                <div
                  key={i}
                  onClick={() => handleSelectAccount(account)}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b"
                >
                  {account}
                </div>
              ))}
              <div
                onClick={() => {
                  setIsDropdownOpen(false)
                  setIsSignInModalOpen(true)
                }}
                className="flex justify-center items-center py-2 cursor-pointer hover:bg-gray-100"
              >
                <Plus size={20} />
              </div>
            </div>
          )}
        </div>

        {/* <select value={projectInputValue} className="border p-1 w-[150px] text-sm h-[40px]">
          <option>Figma Project</option>
        </select> */}
        <button className="w-full flex justify-between items-center border px-3 py-2">
          {projectInputValue}
        </button>

        <button className="border p-1 w-[150px] text-sm">
          Connect Figma Account
        </button>
      </div>

      {isProjectsOpen && (
        <div className="border w-[300px] p-2 bg-white z-10 mb-4">
          <div className="flex items-center border-b pb-2 mb-2">
            <span className="mr-2">🔍</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search"
              className="w-full outline-none"
            />
          </div>
          <div className="flex flex-col gap-2">
            {MOCK_PROJECTS.filter((p) =>
              p.toLowerCase().includes(searchTerm.toLowerCase()),
            ).map((project) => (
              <label
                key={project}
                className="flex justify-between items-center border-b py-1 px-2"
              >
                {project}
                <input
                  type="checkbox"
                  checked={selectedProjects.includes(project)}
                  onChange={() => handleToggleProject(project)}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Slash Name Inputs */}
      <div className="flex mb-4 overflow-x-auto">
        {slashNameInputs.map((value, index) => (
          <input
            key={index}
            type="text"
            value={value}
            onChange={(e) => {
              const updated = [...slashNameInputs]
              updated[index] = e.target.value
              setSlashNameInputs(updated)
            }}
            placeholder={`Slash Name ${index + 1}`}
            className="border p-2 mr-2 min-w-[150px]"
          />
        ))}
      </div>
      <button
        onClick={handleChangeSlashNaming}
        className="border p-2 mb-4 bg-black text-white"
      >
        Change Slash Name
      </button>

      {/* Warning */}
      <div className="bg-[#F6FF03] p-2 mb-4 border text-sm">
        <strong>!!! Warning !!!:</strong> Slash Name changes are temporarily to
        export into Figma.
      </div>

      {/* Color List */}
      {Array.isArray(selectedColorsFromFile) &&
        selectedColorsFromFile.map((item, i) => (
          <div key={item.color + i} className="flex items-center mb-2">
            <input
              type="checkbox"
              checked={activeColor === item.color}
              className="mr-2"
              onChange={() => handleCheckboxClick(item)}
            />
            <div
              className="w-8 h-8 border mr-2"
              style={{ backgroundColor: item.color }}
            />
            <div className="border p-2 flex-grow bg-gray-100 rounded">
              {item.slashNaming || "No slashNaming"}
            </div>
            <button
              className="border p-2 ml-2"
              onClick={() =>
                dispatch({
                  type: "REMOVE_SELECTED_COLOR_FROM_FILE",
                  payload: item.color,
                })
              }
            >
              ✖
            </button>
          </div>
        ))}

      {/* Export Message */}
      <div className="bg-[#03FF26] p-2 mb-4 border">
        70 / 70 colors exported to your Figma Project XXX, Project YYY, Project
        ZZZ
      </div>

      <div className="flex justify-between">
        <button className="border p-2">Save Changes</button>
        <button className="bg-black text-white p-2">Export</button>
      </div>

      {/* Sign In Modal */}
      {isSignInModalOpen && (
        <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 w-[300px] rounded border">
            <h2 className="text-xl mb-4 text-center">Figma sign in</h2>
            <input
              type="text"
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border w-full p-2 mb-2"
            />
            <input
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border w-full p-2 mb-4"
            />
            <button
              onClick={handleSignIn}
              className="bg-black text-white w-full p-2"
            >
              sign in
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Right
