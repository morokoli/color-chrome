import { useEffect, useState } from "react"
import Color from "color"
import { extractColors } from "extract-colors"
import * as Tooltip from "@radix-ui/react-tooltip"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { useAddMultipleColors } from "@/v2/api/sheet.api"
import { useToast } from "@/v2/hooks/useToast"
import { Check, ArrowLeft, Loader2, History } from "lucide-react"

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
  const [isScanning, setIsScanning] = useState(true)
  const { state, dispatch } = useGlobalState()
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle")
  const { addMultipleColorsAsync, data: addMultipleColorsData } =
    useAddMultipleColors()
  const toast = useToast()

  useEffect(() => {
    if (addMultipleColorsData && addMultipleColorsData.done) {
      toast.display("success", "Colors added successfully")
    }
  }, [addMultipleColorsData])

  useEffect(() => {
    // Add overall timeout for scanning
    const scanTimeout = setTimeout(() => {
      console.warn("Scan timeout - stopping scan")
      setIsScanning(false)
      setColorArray([])
    }, 15000) // 15 second timeout

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
          clearTimeout(scanTimeout)
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

          // Limit image processing to first 20 images with 3s timeout each
          const limitedImages = html.imageSrcArr.slice(0, 20)
          for (const src of limitedImages) {
            promiseArr.push(
              Promise.race([
                new Promise(async (resolve) => {
                  try {
                    const colors = await extractColors(src.src).catch(() => [])
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
                  } catch {
                    resolve(false)
                  }
                }),
                // 3 second timeout per image
                new Promise((resolve) => setTimeout(() => resolve(false), 3000))
              ])
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
          setIsScanning(false)
          clearTimeout(scanTimeout)
        } catch {
          setIsScanning(false)
          clearTimeout(scanTimeout)
        }
      })
      .catch(() => {
        setIsScanning(false)
        clearTimeout(scanTimeout)
      })

    return () => clearTimeout(scanTimeout)
  }, [])

  const handleSave = async () => {
    const { files, selectedFile, user } = state
    const selectedFileData = files.find(
      (file) => file.spreadsheetId === selectedFile,
    )

    // Always save colors to local history
    selectedColors.forEach((color) => {
      let hexValue = color.hex
      if (hexValue.includes(' ')) {
        hexValue = hexValue.split(' ')[0]
      }
      dispatch({ type: "ADD_COLOR_HISTORY", payload: hexValue })
      if (selectedFile) {
        dispatch({
          type: "ADD_FILE_COLOR_HISTORY",
          payload: { spreadsheetId: selectedFile, color: hexValue },
        })
      }
    })

    // If not logged in or no sheet selected, just save locally
    if (!selectedFile || !user?.jwtToken) {
      toast.display("success", "Colors saved to local history")
      setSelectedColors([])
      return
    }
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
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
      return {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        url: url || "",
        hex: colorObj.hex(),
        hsl: colorObj.hsl().round(1).toString(),
        rgb: colorObj.rgb().round(1).toString(),
        ranking: "0",
        comments: comments,
        slash_naming: color.name,
        tags: "",
        additionalColumns: [],
      }
    })
    setSaveStatus("loading")
    try {
      await addMultipleColorsAsync({
        spreadsheetId: selectedFile!,
        sheetName: selectedFileData?.sheets?.[0]?.name || "",
        sheetId: selectedFileData?.sheets?.[0]?.id ?? 0,
        rows: rows,
      })
      setSaveStatus("success")
      setSelectedColors([])
    } catch (error) {
      console.error("Error saving colors:", error)
      setSaveStatus("error")
      toast.display("error", "Failed to save colors")
    }
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
      <div className="w-[360px] bg-white rounded-md shadow-sm border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab(null)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-[13px] font-medium text-gray-800">Website Colors</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-500">
              {selectedColors.length} / {colorArray.length}
            </span>
            <button
              onClick={() => setTab('COMMENT')}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title="History & Editor"
            >
              <History className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Select/Deselect All */}
        <div className="px-3 py-2 border-b border-gray-200">
          {selectedColors.length === 0 ? (
            <button
              onClick={handleSelectAllColors}
              className="text-[12px] text-gray-600 hover:text-gray-900 transition-colors"
            >
              Select all
            </button>
          ) : (
            <button
              onClick={handleDeselectAllColors}
              className="text-[12px] text-gray-600 hover:text-gray-900 transition-colors"
            >
              Deselect all
            </button>
          )}
        </div>

        {/* Color Grid */}
        <div className="p-3 max-h-[300px] overflow-y-auto">
          {isScanning ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <p className="text-[12px]">Scanning page colors...</p>
            </div>
          ) : colorArray.length > 0 ? (
            <div className="grid grid-cols-8 gap-1.5">
              {colorArray.map((colorArr, arrIndex) => {
                const isDark = Color(colorArr[0].hex).isDark()
                const isSelected = selectedColors.some(
                  (c) => c.hex === colorArr[0].hex,
                )
                return (
                  <Tooltip.Root key={arrIndex}>
                    <Tooltip.Trigger asChild>
                      <button
                        onClick={() => handleSelectColorGroup(colorArr[0])}
                        className="w-9 h-9 rounded border flex items-center justify-center transition-all hover:scale-110"
                        style={{
                          backgroundColor: colorArr[0].hex,
                          borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                        }}
                      >
                        {isSelected && (
                          <Check
                            strokeWidth={3}
                            className="w-4 h-4"
                            style={{ color: isDark ? 'white' : 'black' }}
                          />
                        )}
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="bg-gray-900 text-white px-2 py-1 rounded text-[11px]"
                        sideOffset={5}
                      >
                        {colorArr[0].hex}
                        <Tooltip.Arrow className="fill-gray-900" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <p className="text-[12px]">No colors found</p>
              <p className="text-[11px] text-gray-400 mt-1">Cannot scan chrome:// or extension pages</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={selectedColors.length === 0 || saveStatus === "loading"}
            className={`w-full py-2 text-[12px] rounded transition-colors ${
              selectedColors.length > 0
                ? 'bg-gray-900 text-white hover:bg-gray-800'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {selectedColors.length === 0
              ? 'Select colors to save'
              : saveStatus === "loading"
                ? "Saving..."
                : saveStatus === "success"
                  ? "Saved!"
                  : `Save ${selectedColors.length} color${selectedColors.length > 1 ? 's' : ''}`}
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
  const fetchStyleList = ["color", "Color", "Fill", "fill", "stroke", "Stroke", "Shadow"]
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
    const allElements = document.querySelectorAll("*, svg *")
    // Limit to first 2000 elements to prevent hanging on heavy pages
    const elements = Array.from(allElements).slice(0, 2000)
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
  }

  scanPage()

  for (const [key, value] of colorMap.entries()) {
    colorMap.set(key, { ...value, weight: value.weight / totalWeight })
  }

  return { totalWeight, styleArr, imageSrcArr }
}
