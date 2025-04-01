import { useState } from "react"
import { useGlobalState } from "@/v2/hooks/useGlobalState"

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
      payload: {
        color: activeColor,
        slashNaming: newSlashNaming,
      },
    })
  }

  return (
    <div className="relative min-h-[100vh] overflow-y-auto p-4">
      {/* Dropdowns and Connect Button */}
      <div className="flex mb-4">
        <select className="border p-1 mr-2 w-[150px] text-sm h-[40px]">
          <option>Figma Account</option>
        </select>
        <select className="border p-1 mr-2 w-[150px] text-sm h-[40px]">
          <option>Figma Project</option>
        </select>
        <button className="border p-1 w-[150px] text-sm">
          Connect Figma Account
        </button>
      </div>

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

      {/* Warning Message */}
      <div className="bg-[#F6FF03] p-2 mb-4 border text-sm">
        <strong>!!! Warning !!!:</strong> Slash Name changes are temporarily to
        export into Figma as color styles. Save Changes button below if you want
        to make those changes permanent.
      </div>

      {/* Color List with Checkboxes */}
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

      {/* Export Confirmation Message */}
      <div className="bg-[#03FF26] p-2 mb-4 border">
        70 / 70 colors exported to your Figma Project XXX, Project YYY, Project
        ZZZ
      </div>

      {/* Save Changes and Export Buttons */}
      <div className="flex justify-between">
        <button className="border p-2">Save Changes</button>
        <button className="bg-black text-white p-2">Export</button>
      </div>
    </div>
  )
}

export default Right
