import { useEffect, useState } from "react"
import Color from "color"
import { extractColors } from "extract-colors"
import * as Tooltip from "@radix-ui/react-tooltip"
import { ColorDropdown } from "./ColorDropdown"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { useAddMultipleColors } from "@/v2/api/sheet.api"
import { useToast } from "@/v2/hooks/useToast"

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
  const { state } = useGlobalState()
  const { addMultipleColors, data: addMultipleColorsData } =
    useAddMultipleColors()
  const toast = useToast()

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

        return chrome.scripting.executeScript({
          target: { tabId: activeTabId! },
          // injectImmediately: true,  // uncomment this to make it execute straight away, other wise it will wait for document_idle
          func: scanPageHtml,
          // args: ['body']  // you can use this to target what element to get the html for
        })
      })
      .then(async (results) => {
        const html: {
          totalWeight: number
          styleArr: ImportedColor[][]
          imageSrcArr: { src: string; weight: number }[]
        } = results[0].result
        const colorMap = new Map<string, ImportedColor[]>()
        const sumMap = new Map<string, ImportedColor>()
        const promiseArr: Promise<any>[] = []
        for (const src of html.imageSrcArr) {
          promiseArr.push(
            new Promise(async (resolve, reject) => {
              try {
                const colors = await extractColors(src.src)
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
                console.log(error)
                reject(error)
              }
            }),
          )
        }
       
        for (const styleArr of html.styleArr) {
          for (const style of styleArr) {
            try {
              const color = Color(style.value)
              if (sumMap.has(color.hex().toString() + style.key)) {
                const existing: ImportedColor = sumMap.get(
                  color.hex().toString() + style.key,
                )!
                sumMap.set(color.hex().toString() + style.key, {
                  ...existing,
                  weight: existing.weight + style.weight,
                })
              } else {
                sumMap.set(color.hex().toString() + style.key, {
                  key: style.key,
                  value: color.hex().toString(),
                  weight: style.weight,
                })
              }
            } catch (error) {}
          }
        }

        await Promise.all(promiseArr)

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
      })
      .catch((error) => {
        console.log(error)
      })
  }, [])

  const handleDeleteColor = (arrIndex: number, index: number) => {
    const newColorArray = new Array(...colorArray)
    newColorArray[arrIndex].splice(index, 1)
    setColorArray(newColorArray)
  }

  const handleDeleteColorArr = (index: number) => {
    setColorArray(colorArray.filter((_, i) => i !== index))
  }

  const handleChangeColor = (
    arrIndex: number,
    index: number,
    color: ColorType,
  ) => {
    const newColorArray = new Array(...colorArray)
    newColorArray[arrIndex][index] = color
    setColorArray(newColorArray)
  }

  const handleSave = () => {
    const { files, selectedFile } = state
    const selectedFileData = files.find(
      (file) => file.spreadsheetId === selectedFile,
    )
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0].url
      const rows = selectedColors.map((color) => {
        const colorObj = new Color(color.hex)
        return {
          timestamp: Date.now(),
          url,
          hex: colorObj.hex(),
          hsl: colorObj.hsl().toString(),
          rgb: colorObj.rgb().toString(),
          ranking: "0",
          comments: "",
          slashNaming: color.name,
          tags: "",
          additionalColumns: [],
        }
      })
      addMultipleColors({
        spreadsheetId: selectedFile!,
        sheetName: selectedFileData?.sheets?.[0]?.name || "",
        sheetId: selectedFileData?.sheets?.[0]?.id || null!,
        rows,
      })
    })
  }

  return (
    <Tooltip.Provider>
      <div className="flex flex-col w-[800px] h-[600px] gap-16 bg-white p-9 overflow-y-scroll">
        <div className="flex flex-col gap-2 max-h-[calc(100%-100px)] overflow-y-scroll">
          {colorArray.length > 0 ? (
            colorArray.map((colorArr, arrIndex) => (
              <ColorDropdown
                key={arrIndex + "color-dropdown"}
                handleDeleteColorArr={handleDeleteColorArr}
                colorArray={colorArr}
                handleChangeColor={handleChangeColor}
                arrIndex={arrIndex}
                handleDeleteColor={handleDeleteColor}
                selectedColors={selectedColors}
                setSelectedColors={setSelectedColors}
              />
            ))
          ) : (
            <div className="flex flex-col gap-2 text-lg">
              <p>Scanning page...</p>
            </div>
          )}
        </div>
        <div className="fixed bottom-10 left-0 right-0 flex flex-row justify-between p-8 pb-2 bg-white z-1">
          <button
            className="bg-white p-4 px-8 border-2 border-black text-xl"
            onClick={() => setTab(null)}
          >
            Back
          </button>
          <button
            onClick={handleSave}
            className="bg-black text-white p-4 px-8 border-2 border-black text-xl"
          >
            Save
          </button>
        </div>
      </div>
    </Tooltip.Provider>
  )
}

const scanPageHtml = () => {
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

  const scanPage = async () => {
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
      const styleMap = []

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

        if (checkStyle(key)) {
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
          })
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

  return { totalWeight, styleArr, imageSrcArr }
}
