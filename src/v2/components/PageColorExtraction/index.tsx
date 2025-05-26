import { useEffect, useState } from "react"
import Color from "color"
import { extractColors } from "extract-colors"
import * as Tooltip from '@radix-ui/react-tooltip'
import { ColorDropdown } from "./ColorDropdown"

export type Color = {
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
  const [colorArray, setColorArray] = useState<Color[][]>([])

  useEffect(() => {
    console.log("Color Extraction")
    chrome.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => {
        const activeTab = tabs[0]
        const activeTabId = activeTab.id

        console.log(chrome.scripting)

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
        console.log(html)
        const colorMap = new Map<string, ImportedColor[]>()
        const sumMap = new Map<string, ImportedColor>()
        for (const src of html.imageSrcArr) {
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

        console.log(colorMap)

        const colorArray: Color[][] = Array.from(colorMap.values())
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

  const handleChangeColor = (arrIndex: number, index: number, color: Color) => {
    const newColorArray = new Array(...colorArray)
    newColorArray[arrIndex][index] = color
    setColorArray(newColorArray)
  }

  return (
    <Tooltip.Provider>
      <div className="flex flex-col h-[937px] w-[817px] gap-16 bg-white p-9 overflow-y-scroll">
        <div className="flex flex-col gap-2">
          {colorArray.map((colorArr, arrIndex) => (
            <ColorDropdown
              handleDeleteColorArr={handleDeleteColorArr}
              colorArray={colorArr}
              handleChangeColor={handleChangeColor}
              arrIndex={arrIndex}
              handleDeleteColor={handleDeleteColor}
            />
          ))}
        </div>
        <div className="flex flex-row justify-between">
          <button
            className="bg-white p-4 px-8 border-2 border-black text-xl"
            onClick={() => setTab(null)}
          >
            Back
          </button>
          <button className="bg-black text-white p-4 px-8 border-2 border-black text-xl">
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

  const coreNode = document.body
  let totalWeight = 0
  console.log("coreNode", coreNode)

  const colorMap = new Map()
  const dummy = document.createElement("element-" + new Date().getTime())
  document.body.appendChild(dummy)

  const defaultStyles = getComputedStyle(dummy)
  const sampleObjectStyleMap = new Map(
    Object.entries(defaultStyles),
  )
  const imageSrcArr: { src: string; weight: number }[] = []
  const fetchStyleList = ["color", "Color", "Fill", "fill"]

  const checkStyle = (style: string) => {
    return fetchStyleList.some((fetchStyle) => style.includes(fetchStyle))
  }

  const scanNode = (htmlNode: HTMLElement, prefix: string = "") => {
    const styleMap = []
    const style = window.getComputedStyle(htmlNode)
    const tagName = htmlNode.tagName.toLowerCase()

    const extractUrlRegex = /url\((['"]?)([^'"]+)\1\)/

    const areaWeight =
      Number(regexExtractor.exec(style.width)?.[0]) *
      Number(regexExtractor.exec(style.height)?.[0])
    const perimeterWeight =
      (Number(regexExtractor.exec(style.width)?.[0]) +
        Number(regexExtractor.exec(style.height)?.[0])) *
      2

    if (tagName === "img") {
      console.log("img", htmlNode)
      imageSrcArr.push({
        src: (htmlNode as HTMLImageElement).src,
        weight: areaWeight,
      })
    }

    for (const [key, value] of Object.entries(style)) {
      if (value === sampleObjectStyleMap.get(key)) {
        continue
      }
      if (key === "backgroundImage" && !!value && value !== "none") {
        const match = value.match(extractUrlRegex)
        if (match) {
          imageSrcArr.push({
            src: match[2],
            weight: areaWeight,
          })
        }
      }
      if (checkStyle(key)) {
        if (colorMap.has(value + tagName + "/" + key)) {
          const existing = colorMap.get(value + tagName + "/" + key)
          if (key.includes("border") || key.includes("Border")) {
            colorMap.set(value + tagName + "/" + key, {
              ...existing,
              weight: existing.weight + perimeterWeight,
            })
          } else {
            colorMap.set(value + tagName + "/" + key, {
              ...existing,
              weight: existing.weight + areaWeight,
            })
          }
        } else {
          if (key.includes("border") || key.includes("Border")) {
            colorMap.set(value + tagName + key, {
              key: tagName + "/" + key,
              value: value.toString(),
              weight: perimeterWeight,
            })
          } else {
            colorMap.set(value + tagName + "/" + key, {
              key: tagName + "/" + key,
              value: value.toString(),
              weight: areaWeight,
            })
          }
        }
        if (key.includes("border") || key.includes("Border")) {
          styleMap.push({
            key: tagName + "/" + key,
            value: value,
            weight: perimeterWeight,
          })
        } else {
          styleMap.push({
            key: tagName + "/" + key,
            value: value,
            weight: areaWeight,
          })
        }
      }
    }
    styleArr.push(styleMap)
    if (styleMap.length > 0) totalWeight += areaWeight

    for (const child of htmlNode.children) {
      scanNode(child as HTMLElement)
    }
  }

  scanNode(coreNode)
  for (const [key, value] of colorMap.entries()) {
    colorMap.set(key, { ...value, weight: value.weight / totalWeight })
  }

  console.log("colorMap", colorMap)
  console.log("imageSrcArr", imageSrcArr)

  return { totalWeight, styleArr, imageSrcArr }
}
