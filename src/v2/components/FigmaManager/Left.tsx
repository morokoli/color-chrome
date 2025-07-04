/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { useToast } from "@/v2/hooks/useToast"
import { useAPI } from "@/v2/hooks/useAPI"
import { config } from "@/v2/others/config"
import { CheckSheetValidRequest, CheckSheetValidResponse } from "@/v2/types/api"
import { RowData, SheetData } from "@/v2/types/general"
import { useGetSheet } from "@/v2/api/sheet.api"
import DualThumbSlider from "./DualThumbSlider"
import SheetItem from "./SheetItem"
import { MultiSelectDropdown } from "./MultiSelectDropdown"

interface Props {
  setTab: (tab: string | null) => void  
}

const Left: React.FC<Props> = ({ setTab }) => {
  const { state, dispatch } = useGlobalState()
  const toast = useToast()
  const { files, selectedColorsFromFile } = state
  const [sheets, setSheets] = useState<any[]>([])
  const [visibleSheets, setVisibleSheets] = useState<any[]>([])
  const [hueFilter, setHueFilter] = useState<[number, number]>([0, 360])
  const [saturationFilter, setSaturationFilter] = useState<[number, number]>([
    0, 100,
  ])
  const [lightnessFilter, setLightnessFilter] = useState<[number, number]>([
    0, 100,
  ])
  const [rankingFilter, setRankingFilter] = useState<[number, number]>([1, 100])
  const [searchQuery, setSearchQuery] = useState<string>("")

  useEffect(() => {
    const fetchSheets = async () => {
      const promises = files.map((file) => {
        return checkSheetValid.call({
          spreadsheetId: file.spreadsheetId,
          sheetId: file.sheets?.[0]?.id,
          sheetName: file.sheets?.[0]?.name,
        })
      })
      const results = await Promise.all(promises)
      const newSheets = results.map((result, index) => ({
        spreadsheetId: files[index].spreadsheetId,
        sheetId: files[index].sheets?.[0]?.id,
        sheetName: files[index].sheets?.[0]?.name,
        colorHistory: result.sheetData.parsed.map((elem) => {
          const splitHSL = elem?.hsl?.match(/\d*/g)
          const filteredSplitHSL = splitHSL?.filter((item) => item !== "")
          return {
            ...elem,
            hue: filteredSplitHSL?.[0],
            saturation: filteredSplitHSL?.[1],
            lightness: filteredSplitHSL?.[2],
            ranking: elem.ranking,
          }
        }),
      }))
      setSheets(newSheets)
      setVisibleSheets(newSheets) // Initially all sheets are visible
    }
    fetchSheets()
  }, [files])

  const [fileURL, setFileURL] = useState<string>("")
  const { getSheet, data: getSheetData } = useGetSheet(fileURL)

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
  const handleColorClick = async (
    color: RowData,
    sheetData: SheetData,
    rowIndex: number,
  ) => {
    try {
      // шукаємо відповідний рядок
      const slashNaming = color?.slashNaming || ""

      const presentColor = selectedColorsFromFile.find(
        (selectedColor) => selectedColor.color.hex === color.hex,
      )

      if (presentColor) {
        toast.display("error", "Color already added")
        return
      }

      const fullColor = {
        ...color,
        sheetData: sheetData,
        rowIndex: rowIndex,
      }

      dispatch({
        type: "ADD_SELECTED_COLOR_FROM_FILE",
        payload: { color: fullColor, slashNaming },
      })
    } catch (err) {
      toast.display("error", "Failed to load sheet data")
      console.error("Sheet load error:", err)
    }
  }

  const onRemoveFileRequest = (fileId: string) => {
    setConfirmFileId(fileId)
  }

  const handleAddFile = async () => {
    await getSheet()
  }

  useEffect(() => {
    const fetchSheetData = async () => {
      if (getSheetData) {
        const sheetData = await checkSheetValid.call({
          spreadsheetId: getSheetData.spreadsheet.spreadsheetId,
          sheetId: getSheetData.spreadsheet.sheets?.[0].id,
          sheetName: `${getSheetData.spreadsheet.sheets?.[0].name}`,
        })

        // Add the sheet to the global state
        dispatch({
          type: "ADD_FILES",
          payload: {
            ...getSheetData.spreadsheet,
            colorHistory: [], // Required field
          },
        })

        // Set as selected file
        dispatch({
          type: "SET_SELECTED_FILE",
          payload: getSheetData.spreadsheet.spreadsheetId,
        })

        // Add to local state for display
        setSheets((prev) => [
          ...prev,
          {
            spreadsheetId: getSheetData.spreadsheet.spreadsheetId,
            sheetId: getSheetData.spreadsheet.sheets?.[0].id,
            sheetName: `${getSheetData.spreadsheet.sheets?.[0].name}`,
            colorHistory: sheetData.sheetData.parsed.map((elem) => {
              const splitHSL = elem?.hsl?.match(/\d*/g)
              return {
                ...elem,
                hue: splitHSL?.[1],
                saturation: splitHSL?.[2],
                lightness: splitHSL?.[3],
                slashNaming:
                  elem?.additionalColumns?.find(
                    (col) => col.name === "slashNaming",
                  )?.value || "",
              }
            }),
          },
        ])

        // Clear the input field
        setFileURL("")

        // Show success message
        toast.display("success", "Spreadsheet added successfully")
      }
    }
    fetchSheetData()
  }, [getSheetData])

  const handleBack = () => {
    setTab(null)
  }

  return (
    <>
      <div className="relative h-full overflow-y-auto p-4">
        <div className="flex mb-4">
          <input
            type="text"
            onChange={(e) => setFileURL(e.target.value)}
            placeholder="Sheet URL"
            className="border p-2 flex-grow"
          />
          <button onClick={handleAddFile} className="ml-2 border p-2">
            Add
          </button>
        </div>

        {/* Search Input */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search"
            className="border p-2 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Sheet Selection Dropdown */}
        <div className="mb-4">
          <MultiSelectDropdown
            isSearchable
            placeholder="Select Sheets"
            selected={visibleSheets}
            items={sheets}
            renderItem={(sheet) => sheet.sheetName}
            renderSelected={(selected) =>
              selected.length === sheets.length
                ? "All Sheets"
                : `${selected.length} Sheet${selected.length === 1 ? "" : "s"}`
            }
            onSelect={(selectedSheets) => setVisibleSheets(selectedSheets)}
            width="100%"
          />
        </div>

        {/* Sliders */}
        <div className="flex justify-around mb-4 gap-4">
          <DualThumbSlider
            value={hueFilter}
            onValueChange={(value) => setHueFilter(value as [number, number])}
            max={360}
            step={1}
            label="Hue"
            unit="°"
            showGradient
            thumbColors={[
              `hsl(${hueFilter[0]}, 100%, 50%)`,
              `hsl(${hueFilter[1]}, 100%, 50%)`,
            ]}
          />

          <DualThumbSlider
            value={saturationFilter}
            onValueChange={(value) =>
              setSaturationFilter(value as [number, number])
            }
            max={100}
            step={1}
            label="Saturation"
            unit="%"
          />

          <DualThumbSlider
            value={lightnessFilter}
            onValueChange={(value) =>
              setLightnessFilter(value as [number, number])
            }
            max={100}
            step={1}
            label="Lightness"
            unit="%"
          />

          <DualThumbSlider
            value={rankingFilter}
            onValueChange={(value) =>
              setRankingFilter(value as [number, number])
            }
            max={100}
            min={1}
            step={1}
            label="Ranking"
          />
        </div>

        {/* Sheets List */}
        {visibleSheets.map((sheet) => (
          <SheetItem
            key={sheet.spreadsheetId}
            sheet={sheet}
            hueFilter={hueFilter}
            saturationFilter={saturationFilter}
            lightnessFilter={lightnessFilter}
            rankingFilter={rankingFilter}
            searchQuery={searchQuery}
            onColorClick={handleColorClick}
            onRemove={onRemoveFileRequest}
          />
        ))}

        {/* Confirmation Dialog */}
        {confirmFileId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded w-[400px] text-center border shadow-lg">
              <p className="text-[#CC0000] font-bold text-lg mb-4">
                Sheet will be removed from the entire extension. Are you sure?
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
                  onClick={() => {
                    // Remove from global state
                    dispatch({ type: "REMOVE_FILES", payload: confirmFileId })

                    // Remove from local state
                    setSheets((prev) =>
                      prev.filter(
                        (sheet) => sheet.spreadsheetId !== confirmFileId,
                      ),
                    )
                    setVisibleSheets((prev) =>
                      prev.filter(
                        (sheet) => sheet.spreadsheetId !== confirmFileId,
                      ),
                    )
                    setConfirmFileId(null)

                    // Show success message
                    toast.display("success", "Spreadsheet removed successfully")
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}
        <button onClick={handleBack} style={{zIndex: 1000}} className="fixed bottom-4 border p-2">
          Go Back
        </button>
      </div>
      <div style={{ width: "1px", marginTop: "10px", height: "545px", marginLeft: "7px", backgroundColor: "#E0E0E0" }}></div>
      <div style={{ height: "50px" }}/>
    </>
  )
}

export default Left
