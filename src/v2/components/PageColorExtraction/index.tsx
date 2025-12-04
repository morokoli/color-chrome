import { useEffect, useState } from "react"
import Color from "color"
import { extractColors } from "extract-colors"
import * as Tooltip from "@radix-ui/react-tooltip"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { useAddMultipleColors } from "@/v2/api/sheet.api"
import { useToast } from "@/v2/hooks/useToast"
import copyIcon from "@/v2/assets/images/icons/menu/copy.svg"
import { CheckIcon } from "lucide-react"
import { CollapsibleBoxHorizontal } from "@/v2/components/CollapsibleBoxHorizontal"
import { UpdateRowRequest } from "@/v2/types/api"

export type ColorType = {
  color: string
  name: string
  hex: string
  prevalence: number
}

export type ImportedColor = {
  key: string
  value: string
  weight: number
}

export const PageColorExtraction = ({
  setTab,
}: {
  setTab: React.Dispatch<React.SetStateAction<string | null>>
}) => {
  const [colorArray, setColorArray] = useState<ColorType[][]>([])
  const [selectedColors, setSelectedColors] = useState<ColorType[]>([])
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false)
  const { state } = useGlobalState()
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle")
  const { addMultipleColors, data: addMultipleColorsData } =
    useAddMultipleColors()
  const toast = useToast()

  // Update right panel state based on color selection
  useEffect(() => {
    const shouldBeOpen = selectedColors.length > 0 && 
      selectedColors.every((color) => color.hex === selectedColors[0].hex)
    setIsRightPanelOpen(shouldBeOpen)
  }, [selectedColors])

  useEffect(() => {
    if (addMultipleColorsData && addMultipleColorsData.done) {
      toast.display("success", "Colors added successfully")
    }
  }, [addMultipleColorsData])

  useEffect(() => {
    chrome.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => {
        const activeTab = tabs[0]
        const activeTabId = activeTab.id
        const url = activeTab.url || ""

        // Check if we're on a restricted page
        if (url.startsWith("chrome://") || url.startsWith("chrome-extension://") || url.startsWith("about:")) {
          console.warn("Cannot scan chrome:// or extension pages")
          setColorArray([])
          return Promise.reject(new Error("Cannot scan this page type"))
        }

        return chrome.scripting.executeScript({
          target: { tabId: activeTabId! },
          // injectImmediately: true,  // uncomment this to make it execute straight away, other wise it will wait for document_idle
          func: scanPageHtml,
          // args: ['body']  // you can use this to target what element to get the html for
        })
      })
      .then(async (results) => {
        try {
          const html: {
            totalWeight: number
            styleArr: ImportedColor[][]
            imageSrcArr: { src: string; weight: number }[]
          } = results[0].result
          const colorMap = new Map<string, ImportedColor[]>()
          const sumMap = new Map<string, ImportedColor>()
          const promiseArr: Promise<unknown>[] = []
          for (const src of html.imageSrcArr) {
            promiseArr.push(
              new Promise(async (resolve, reject) => {
                try {
                  const colors = await extractColors(src.src).catch((error) => {
                    console.log("Heh", error)
                    return []
                  })
                  for (const color of colors) {
                    if (sumMap.has(color.hex)) {
                      const existing: ImportedColor = sumMap.get(color.hex)!
                      sumMap.set(color.hex, {
                        ...existing,
                        weight: existing.weight + src.weight,
                      })
                    } else {
                      sumMap.set(color.hex, {
                        key: "image/color",
                        value: color.hex,
                        weight: src.weight * color.area,
                      })
                    }
                  }
                  resolve(true)
                } catch (error) {
                  console.log("fgdf", error)
                  reject(error)
                }
              }),
            )
          }

          for (const styleArr of html.styleArr) {
            for (const style of styleArr) {
              try {
                // Handle color values
                if (!style.value) continue

                const color = Color(style.value)
                const hexKey = color.hex().toString() + style.key

                if (sumMap.has(hexKey)) {
                  const existing: ImportedColor = sumMap.get(hexKey)!
                  sumMap.set(hexKey, {
                    ...existing,
                    weight: existing.weight + style.weight,
                  })
                } else {
                  sumMap.set(hexKey, {
                    key: style.key,
                    value: color.hex().toString(),
                    weight: style.weight,
                  })
                }
              } catch {
                // Skip invalid color values
              }
            }
          }

          await Promise.allSettled(promiseArr)

          console.log(sumMap)

          const colorArr: ImportedColor[] = Array.from(sumMap.values())

          for (const color of colorArr) {
            if (colorMap.has(color.value)) {
              const existing: ImportedColor[] = colorMap.get(color.value)!
              colorMap.set(color.value, [
                ...existing,
                { key: color.key, value: color.value, weight: color.weight },
              ])
            } else {
              colorMap.set(color.value, [
                { key: color.key, value: color.value, weight: color.weight },
              ])
            }
          }

          const colorArray: ColorType[][] = Array.from(colorMap.values())
            .map((colorArr) =>
              colorArr
                .map((color) => ({
                  color: color.value,
                  name: color.key,
                  hex: color.value,
                  prevalence: color.weight / html.totalWeight,
                }))
                .sort((a, b) => {
                  return b.prevalence - a.prevalence
                }),
            )
            .sort((a, b) => {
              return b[0].prevalence - a[0].prevalence
            })

          setColorArray(colorArray)
        } catch (error) {
          console.log("Heh", error)
        }
      })
      .catch((error) => {
        console.log("fgdf", error)
      })
  }, [])

  const handleSave = () => {
    const { files, selectedFile } = state
    const selectedFileData = files.find(
      (file) => file.spreadsheetId === selectedFile,
    )
    if (!selectedFile) {
      toast.display("error", "Login or add sheet first")
      return
    }
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0].url
      const rows = selectedColors.map((color) => {
        const colorArr = colorArray.find(
          (arr) => arr[0].hex === color.hex,
        )
        const comments =
          "This color is used as: " +
            colorArr?.map((color) => color.name).join(", ") || "No comments"

        // Extract first hex color if multiple are present (e.g., from border-color)
        let hexValue = color.hex
        if (hexValue.includes(' ')) {
          hexValue = hexValue.split(' ')[0]
        }

        const colorObj = new Color(hexValue)
        console.log("state.user", state.user)
        return {
          timestamp: Date.now(),
          url,
          hex: colorObj.hex(),
          hsl: colorObj.hsl().round(1).toString(),
          rgb: colorObj.rgb().round(1).toString(),
          ranking: "0",
          comments: comments,
          slash_naming: color.name,
          tags: "",
          added_by: state.user?.email || "unknown",
          additionalColumns: [],
        }
      })
      setSaveStatus("loading")
      addMultipleColors({
        spreadsheetId: selectedFile!,
        sheetName: selectedFileData?.sheets?.[0]?.name || "",
        sheetId: selectedFileData?.sheets?.[0]?.id || null!,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        rows: rows as unknown as UpdateRowRequest[],
      })
      setSaveStatus("success")
    })
  }

  useEffect(() => {
    if (saveStatus === "success") {
      setTimeout(() => {
        setSaveStatus("idle")
      }, 2000)
    }
  }, [saveStatus])

  const handleSelectColorGroup = (color: ColorType) => {
    if (selectedColors.some((c) => c.hex === color.hex)) {
      setSelectedColors(selectedColors.filter((c) => c.hex !== color.hex))
    } else {
      setSelectedColors([...selectedColors, color])
    }
  }

  const handleSelectAllColors = () => {
    setSelectedColors(colorArray.map((arr) => arr[0]))
  }

  const handleDeselectAllColors = () => {
    setSelectedColors([])
  }

  return (
    <Tooltip.Provider>
      <div
        className="flex flex-col w-[800px] bg-white p-9"
        style={{ height: toast.state.message ? "556px" : "640px" }}
      >
        <div className="flex flex-row justify-between items-center w-full mb-4">
          <div className="flex-1">
            {selectedColors.length === 0 ? (
              <button
                className="border-none p-2 text-xl max-w-[160px]"
                onClick={handleSelectAllColors}
              >
                Select All
              </button>
            ) : (
              <button
                className="bg-gray-200 text-black p-2 text-xl max-w-[160px]"
                onClick={handleDeselectAllColors}
              >
                Deselect All
              </button>
            )}
          </div>
          <div className="flex-1 flex justify-center">
            <p className="text-lg">Selected Colors: {selectedColors.length} / {colorArray.length}</p>
          </div>
          <div className="flex-1"></div>
        </div>

        {/* Vertical split layout */}
        <div className="flex flex-row gap-6 flex-1 min-h-0 max-h-[calc(100%-200px)]">
          {/* Left section - Color swatches */}
          <div className="flex flex-col flex-1">
            <div className="flex flex-row flex-wrap gap-2 overflow-y-scroll">
              {colorArray.length > 0 ? (
                colorArray.map((colorArr, arrIndex) => {
                  const isDark = Color(colorArr[0].hex).isDark()
                  const isSelected = selectedColors.some(
                    (c) => c.hex === colorArr[0].hex,
                  )
                  return (
                    <Tooltip.Root key={arrIndex}>
                      <Tooltip.Trigger asChild>
                        <div
                          onClick={() => handleSelectColorGroup(colorArr[0])}
                          className={`min-w-[40px] min-h-10 border-2 cursor-pointer`}
                          style={{
                            transition: "all 0.2s ease-in-out",
                            backgroundColor: colorArr[0].hex,
                            border: isSelected
                              ? `4px solid ${isDark ? "lightgrey" : "black"}`
                              : `2px solid ${isDark ? "lightgrey" : "black"}`,
                          }}
                        >
                            <CheckIcon
                              strokeWidth={3}
                              color={isDark ? "lightgrey" : "black"}
                              className="w-8 h-8"
                              opacity={isSelected ? 1 : 0}
                              style={{
                                transition: "all 0.2s ease-in-out",
                              }}
                            />
                        </div>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content
                          className="bg-black text-white px-2 py-1 rounded text-sm"
                          sideOffset={5}
                        >
                          {colorArr[0].hex}
                          <Tooltip.Arrow className="fill-black" />
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  )
                })
              ) : (
                <div className="flex flex-col gap-2 text-lg">
                  <p>Scanning page...</p>
                  <p className="text-sm text-gray-500">Note: Cannot scan chrome:// or extension pages</p>
                </div>
              )}
            </div>
          </div>

          {/* Right section - Color information (only shown when one color is selected) */}
          <CollapsibleBoxHorizontal
            isOpen={isRightPanelOpen}
            maxWidth="256px"
            transitionDuration={300}
          >
            <div className="w-64 flex flex-col border-l border-gray-300 pl-6 overflow-y-scroll">
              {(() => {
                const colorArr =
                  colorArray[
                    colorArray.findIndex(
                      (arr) => arr[0].hex === selectedColors?.[0]?.hex,
                    )
                  ]
                const titleColor = new Color(colorArr?.[0]?.hex)
                return (
                  <>
                    <div className="flex flex-row gap-2 text-lg mb-2 flex-wrap max-h-[200px] overflow-y-scroll">
                      <div
                        className="min-w-[40px] min-h-10 border-2 border-black cursor-pointer"
                        style={{
                          backgroundColor: selectedColors?.[0]?.hex,
                        }}
                      />
                      <button
                        className="text-sm border-2 border-black bg-gray-200 p-1 cursor-pointer flex items-center"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            titleColor.hex().toString(),
                          )
                          toast.display("success", "Copied to clipboard")
                        }}
                      >
                        <img
                          src={copyIcon}
                          alt="copy"
                          className="w-4 h-4 mr-1"
                        />
                        {titleColor.hex().toString()}
                      </button>
                      <button
                        className="text-sm border-2 border-black bg-gray-200 p-1 cursor-pointer flex items-center"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            titleColor.hsl().round().toString(),
                          )
                          toast.display("success", "Copied to clipboard")
                        }}
                      >
                        <img
                          src={copyIcon}
                          alt="copy"
                          className="w-4 h-4 mr-1"
                        />
                        {titleColor.hsl().round().toString()}
                      </button>
                      <button
                        className="text-sm border-2 border-black bg-gray-200 p-1 cursor-pointer flex items-center"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            titleColor.rgb().round().toString(),
                          )
                          toast.display("success", "Copied to clipboard")
                        }}
                      >
                        <img
                          src={copyIcon}
                          alt="copy"
                          className="w-4 h-4 mr-1"
                        />
                        {titleColor.rgb().round().toString()}
                      </button>
                    </div>
                    <div className="flex flex-row gap-2 flex-wrap mb-4 max-h-[200px] overflow-y-scroll">
                      {colorArr?.map((color, index) => (
                        <div
                          key={index}
                          style={{
                            lineHeight: "1.7rem",
                          }}
                          className="text-sm border-2 border-black p-1"
                        >
                          {color.name}
                        </div>
                      ))}
                    </div>
                  </>
                )
              })()}
            </div>
          </CollapsibleBoxHorizontal>
        </div>
          
        <div className="flex flex-row justify-between mt-8">
          <div className="flex gap-4">
            <button
              className="bg-white p-4 px-8 border-2 border-black text-xl"
              onClick={() => setTab(null)}
            >
              Back
            </button>
            {addMultipleColorsData?.done && (
              <button
                className="bg-white p-4 px-8 border-2 border-black text-xl"
                onClick={() => setTab("COMMENT")}
              >
                Edit
              </button>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={!state.selectedFile}
            className={`${state.selectedFile ? "bg-black text-white" : "bg-gray-200 text-black"} p-4 px-8 border-2 border-black text-xl`}
          >
            {state.selectedFile
              ? saveStatus === "loading"
                ? "Saving..."
                : saveStatus === "success"
                  ? "Saved"
                  : "Save"
              : "Please Select Google Sheet"}
          </button>
        </div>
      </div>
    </Tooltip.Provider>
  )
}

const scanPageHtml = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const styleArr: any[] = []
  const regexExtractor = /\d*/
  const extractUrlRegex = /url\((['"]?)([^'"]+)\1\)/
  const fetchStyleList = ["color", "Color", "Fill", "fill"]
  const borderKeywords = ["border", "Border"]

  let totalWeight = 0

  const colorMap = new Map()

  const imageSrcArr: { src: string; weight: number }[] = []

  // Cache for computed styles
  const styleCache = new Map<HTMLElement, CSSStyleDeclaration>()

  const checkStyle = (style: string) => {
    return fetchStyleList.some((fetchStyle) => style.includes(fetchStyle))
  }

  const isBorderStyle = (key: string) => {
    return borderKeywords.some((border) => key.includes(border))
  }

  const getComputedStyleCached = (node: HTMLElement) => {
    if (!styleCache.has(node)) {
      styleCache.set(node, window.getComputedStyle(node))
    }
    return styleCache.get(node)!
  }

  const scanPage = () => {
    console.log("scanning page")
    const elements = document.querySelectorAll("*, svg *")
    console.log("elements", elements)
    for (const element of elements) {
      const style = getComputedStyleCached(element as HTMLElement)
      const properties = {
        backgroundColor: style.backgroundColor,
        color: style.color,
        borderColor: style.borderColor,
        boxShadow: style.boxShadow,
        fill: style.fill,
        stroke: style.stroke,
        svgfill: element.getAttribute("fill"), // Direct SVG attributes
        svgstroke: element.getAttribute("stroke"), // Direct SVG attributes
        backgroundImage: style.backgroundImage,
      }
      const tagName = element.tagName.toLowerCase()
      const styleMap: unknown[] = []

      // Calculate weights
      const width = Number(regexExtractor.exec(style.width)?.[0]) || 0
      const height = Number(regexExtractor.exec(style.height)?.[0]) || 0
      const areaWeight = width * height
      const perimeterWeight = (width + height) * 2

      // Handle images
      if (tagName === "img") {
        const imgSrc = (element as HTMLImageElement).src
        if (imgSrc) {
          imageSrcArr.push({
            src: imgSrc,
            weight: areaWeight,
          })
        }
      }

      // Process styles
      for (const [key, value] of Object.entries(properties)) {
        if (key === "backgroundImage" && value && value !== "none") {
          const match = value.match(extractUrlRegex)
          if (match) {
            imageSrcArr.push({
              src: match[2],
              weight: areaWeight,
            })
          }
        }

        if (checkStyle(key) && value && value !== "none" && value !== "rgba(0, 0, 0, 0)" && value !== "transparent") {
          const isBorder = isBorderStyle(key)
          const weight = isBorder ? perimeterWeight : areaWeight
          const mapKey = value + tagName + "/" + key

          if (colorMap.has(mapKey)) {
            const existing = colorMap.get(mapKey)
            colorMap.set(mapKey, {
              ...existing,
              weight: existing.weight + weight,
            })
          } else {
            colorMap.set(mapKey, {
              key: tagName + "/" + key,
              value: value?.toString() || "",
              weight,
            })
          }

          styleMap.push({
            key: tagName + "/" + key,
            value,
            weight,
          } as unknown)
        }
      }

      if (styleMap.length > 0) {
        styleArr.push(styleMap)
        totalWeight += areaWeight
      }
    }
    console.log("styleArr", styleArr)
  }

  scanPage()

  for (const [key, value] of colorMap.entries()) {
    colorMap.set(key, { ...value, weight: value.weight / totalWeight })
  }

  //temporarily removes imageSrcArr due to chrome extension limitations

  return { totalWeight, styleArr, imageSrcArr: [] }
}
