import { useEffect, useState } from "react"
import cancel from "@/v2/assets/images/icons/menu/cancel.svg"

export type Color = {
  color: string
  name: string
  hex: string
  prevalence: number
}

const testColors: Color[] = [
  {
    color: "red",
    name: "Red",
    hex: "#FF0000",
    prevalence: 0.5,
  },
  {
    color: "blue",
    name: "Blue",
    hex: "#0000FF",
    prevalence: 0.3,
  },
  {
    color: "green",
    name: "Green",
    hex: "#00FF00",
    prevalence: 0.2,
  },
  {
    color: "yellow",
    name: "Yellow",
    hex: "#FFFF00",
    prevalence: 0.1,
  },
  {
    color: "purple",
    name: "Purple",
    hex: "#800080",
    prevalence: 0.05,
  },
  {
    color: "orange",
    name: "Orange",
    hex: "#FFA500",
    prevalence: 0.01,
  },
  {
    color: "brown",
    name: "Brown",
    hex: "#A52A2A",
    prevalence: 0.005,
  },
  {
    color: "pink",
    name: "Pink",
    hex: "#FFC0CB",
    prevalence: 0.005,
  },
]

export const PageColorExtraction = ({
  setTab,
}: {
  setTab: React.Dispatch<React.SetStateAction<string | null>>
}) => {
  const [colorArray, setColorArray] = useState<Color[]>(testColors)

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
      .then((results) => {
        const html = results[0].result
        console.log(html)
      })
      .catch((error) => {
        console.log(error)
      })
  }, [])

  const handleDeleteColor = (index: number) => {
    setColorArray(colorArray.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col h-[937px] w-[817px] gap-16 bg-white p-9 overflow-y-scroll">
      <div className="flex flex-col gap-2">
        {colorArray.map((color, index) => (
          <div className="flex flex-row gap-4">
            <div className="min-w-[40px] h-10 border border-black flex items-center justify-center text-base">
              {color.prevalence > 0.01 ? color.prevalence * 100 + "%" : "<1%"}
            </div>
            <div
              className="min-w-[40px] h-10 border-2 border-black"
              style={{ backgroundColor: color.hex }}
            />
            <input
              type="text"
              className="w-full border border-grey p-1 p-y-2 text-xl"
              value={color.name}
              onChange={(e) => {
                setColorArray(
                  colorArray.map((c) =>
                    c.name === color.name ? { ...c, name: e.target.value } : c,
                  ),
                )
              }}
            />
            <img
              className="min-w-[40px] h-10 cursor-pointer"
              onClick={() => handleDeleteColor(index)}
              src={cancel}
            />
          </div>
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
  )
}

const scanPageHtml = () => {
  const styleArr: any[] = []
  const regexExtractor = /\d*/

  const coreNode = document.body
  let totalWeight = 0
  console.log("coreNode", coreNode)

  const colorMap = new Map()

  const scanNode = (htmlNode: HTMLElement) => {
    if (htmlNode.attributeStyleMap.size > 0) {
      const styleMap = []
      const style = window.getComputedStyle(htmlNode)
      const valueWeight = Number(regexExtractor.exec(style.width)?.[0]) * Number(regexExtractor.exec(style.height)?.[0])
      console.log("valueWeight", valueWeight)
      for (const [key, value] of Object.entries(style)) {
        if (key.includes("color") || key.includes("Color")) {
          if (colorMap.has(value+key)) {
            const existing = colorMap.get(value+key)
            colorMap.set(value+key, { ...existing, weight: existing.weight + valueWeight })
          } else {
            colorMap.set(value+key, { key, value: value.toString(), weight: valueWeight })
          }
          styleMap.push({ key, value: value, weight: valueWeight })
        }
      }
      styleArr.push(styleMap)
      if (styleMap.length > 0) totalWeight += valueWeight
    }

    for (const child of htmlNode.children) {
      scanNode(child as HTMLElement)
    }
  }

  scanNode(coreNode)
  for (const [key, value] of colorMap.entries()) {
    colorMap.set(key, { ...value, weight: value.weight / totalWeight })
  }

  console.log("colorMap", colorMap)

  return { totalWeight, styleArr }
}
