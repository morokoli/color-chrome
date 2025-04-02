/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { useToast } from "@/v2/hooks/useToast"
import { useAPI } from "@/v2/hooks/useAPI"
import { config } from "@/v2/others/config"
import { CheckSheetValidRequest, CheckSheetValidResponse } from "@/v2/types/api"

import { RowData } from "@/v2/types/general"

const Left: React.FC = () => {
  const { state, dispatch } = useGlobalState()
  const toast = useToast()
  const { files } = state
  const [visibleFileIds, setVisibleFileIds] = useState<string[]>(
    files.map((f) => f.spreadsheetId),
  )
  const [confirmFileId, setConfirmFileId] = useState<string | null>(null)

  const checkSheetValid = useAPI<
    CheckSheetValidRequest,
    CheckSheetValidResponse
  >({
    url: config.api.endpoints.checkSheetValid,
    method: "POST",
    jwtToken: state.user?.jwtToken,
  })

  // Функція, яка підвантажує parsedData для конкретного файлу
  const handleColorClick = async (fileId: string, color: string) => {
    const fileData = files.find((f) => f.spreadsheetId === fileId)
    if (!fileData) return

    try {
      const response = await checkSheetValid.call({
        spreadsheetId: fileId,
        sheetId: fileData.sheets?.[0].id,
        sheetName: `'${fileData.sheets?.[0].name}'`,
      })

      const parsed: RowData[] = response.sheetData.parsed

      // шукаємо відповідний рядок
      const matchedRow = parsed.find((row) => row.hex === color)

      const slashNaming =
        matchedRow?.slashNaming ||
        matchedRow?.additionalColumns?.find((col) => col.name === "slashNaming")
          ?.value ||
        ""

      dispatch({
        type: "ADD_SELECTED_COLOR_FROM_FILE",
        payload: { color, slashNaming },
      })
    } catch (err) {
      toast.display("error", "Failed to load sheet data")
      console.error("Sheet load error:", err)
    }
  }

  const handleRemoveFile = () => {
    if (confirmFileId) {
      setVisibleFileIds((prev) => prev.filter((id) => id !== confirmFileId))
      setConfirmFileId(null)
    }
  }

  return (
    <div className="relative min-h-[100vh] overflow-y-auto p-4">
      <div className="flex mb-4">
        <input
          type="text"
          placeholder="Sheet URL"
          className="border p-2 flex-grow"
        />
        <button className="ml-2 border p-2">Add</button>
      </div>

      {/* Search Input */}
      <div className="mb-4">
        <input type="text" placeholder="Search" className="border p-2 w-full" />
      </div>

      {/* Sliders */}
      <div className="flex justify-around mb-4">
        {["Hue", "Saturation", "Lightness", "Ranking"].map((label) => (
          <div key={label} className="text-center">
            <input
              type="range"
              className="w-full appearance-none h-1 bg-black rounded-lg"
              style={{
                WebkitAppearance: "none",
                appearance: "none",
                height: "4px",
                backgroundColor: "#000",
                borderRadius: "8px",
                outline: "none",
                cursor: "pointer",
              }}
            />
            <style>
              {`
                input[type='range']::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  appearance: none;
                  width: 16px;
                  height: 16px;
                  background-color: #000;
                  border-radius: 50%;
                  cursor: pointer;
                }

                input[type='range']::-moz-range-thumb {
                  width: 16px;
                  height: 16px;
                  background-color: #000;
                  border-radius: 50%;
                  cursor: pointer;
                }
              `}
            </style>
            <div>{label}</div>
          </div>
        ))}
      </div>
      {files
        .filter((file) => visibleFileIds.includes(file.spreadsheetId))
        .map((item) => (
          <div key={item.spreadsheetId} className="mb-4">
            <div className="flex mb-2">
              <input
                type="text"
                placeholder={`${item.fileName} - ${
                  item.sheets?.[0]?.name || ""
                }`}
                className="border p-2 flex-grow"
              />
              <button
                className="border p-2"
                onClick={() => setConfirmFileId(item.spreadsheetId)}
              >
                ✖
              </button>
            </div>

            {/* Color Grid per file */}
            <div className="w-[355px] h-[284px] relative color-history">
              <div className="flex flex-wrap content-baseline gap-[1px] color-history-container">
                {(item.colorHistory || [])
                  .slice()
                  .reverse()
                  .map((color, index) => (
                    <div
                      key={color + index}
                      style={{ backgroundColor: color }}
                      className="w-[20px] h-[21px] cursor-pointer"
                      onClick={() =>
                        handleColorClick(item.spreadsheetId, color)
                      }
                    />
                  ))}
              </div>
            </div>
          </div>
        ))}

      {confirmFileId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded w-[400px] text-center border shadow-lg">
            <p className="text-[#CC0000] font-bold text-lg mb-4">
              Sheet will be removed from this page only. If you want to remove
              from extension, go to Sheet Manager.
            </p>
            <div className="flex justify-around">
              <button
                className="px-6 py-2 border text-gray-700 font-semibold"
                onClick={() => setConfirmFileId(null)}
              >
                Cancel
              </button>
              <button
                className="px-6 py-2 border border-[#CC0000] text-[#CC0000] font-semibold"
                onClick={handleRemoveFile}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Left
