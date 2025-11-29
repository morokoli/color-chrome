import { FC, useEffect, useState, useMemo } from "react"
import { AddColorRequest, AddColorResponse } from "@/v2/types/api"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { useToast } from "@/v2/hooks/useToast"
import { colors } from "@/v2/helpers/colors"
import { config } from "@/v2/others/config"
import { useAPI } from "@/v2/hooks/useAPI"
import axios from "axios"

import commentIcon from "@/v2/assets/images/icons/menu/comment.svg"

interface Props {
  selected: null | string
  setTab: (tab: string | null) => void
  copyToClipboard: (text: string, selection: null | string) => void
}

const AIGenerator: FC<Props> = ({ setTab, copyToClipboard }) => {
  const toast = useToast()
  const [loading, setLoading] = useState<boolean>(false)
  const [respColor, setRespColor] = useState<string>("")
  const [showTooltip, setShowTooltip] = useState<boolean>(false)
  const [colorDescription, setColorDescription] = useState<string>("")

  const { state } = useGlobalState()

  const addColor = useAPI<AddColorRequest, AddColorResponse>({
    url: config.api.endpoints.addColor,
    method: "POST",
    jwtToken: state.user?.jwtToken,
  })

  const { files, selectedFile } = state
  const selectedFileData = files.find(
    (file) => file.spreadsheetId === selectedFile,
  )

  // Parse multiple colors from response
  const colorList = useMemo(() => {
    if (!respColor) return []
    // Split by comma, space, or newline and filter valid hex codes
    return respColor
      .split(/[\s,]+/)
      .map((c) => c.trim())
      .filter((c) => /^#[0-9A-Fa-f]{3,6}$/.test(c))
  }, [respColor])

  const handleGenerate = async () => {
    try {
      setLoading(true)
      const token = state.user?.jwtToken
      if (!token) {
        toast.display("error", "You are not authorized.")
        setLoading(false)
        return
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/ai/color`,
        { description: colorDescription },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )
      setRespColor(response.data.hexCode)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403 || error.response?.status === 429) {
          toast.display(
            "error",
            "Generation limit reached. Please try again later or upgrade.",
          )
        } else {
          toast.display("error", "Failed to generate color. Please try again.")
        }
      } else {
        toast.display("error", "Unexpected error. Check console.")
        console.error(error)
      }
    } finally {
      setLoading(false)
    }
  }

  const addAllColorsToFile = async () => {
    if (colorList.length === 0) return
    setLoading(true)

    try {
      // Save all colors
      const sheetId = selectedFileData?.sheets?.[0]?.id
      for (const hex of colorList) {
        await addColor.call({
          spreadsheetId: selectedFile!,
          sheetName: selectedFileData?.sheets?.[0]?.name || "",
          sheetId: sheetId !== undefined ? sheetId : null!,
          row: {
            timestamp: new Date().valueOf(),
            url: "AI Generated Color",
            hex: hex,
            hsl: colors.hexToHSL(hex),
            rgb: colors.hexToRGB(hex),
            comments: colorDescription,
            ranking: "",
            slash_naming: "",
            tags: [],
            additionalColumns: [],
          },
        })
      }
      toast.display("success", `${colorList.length} color${colorList.length > 1 ? 's' : ''} saved successfully`)
    } catch (err) {
      toast.display("error", String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!state.user || !selectedFile) {
      setShowTooltip(true)
    } else {
      setShowTooltip(false)
    }
  }, [state.user, selectedFile])

  return (
    <div className="border-2 flex flex-col w-[275px] min-h-[370px] relative items-center">
      <div className="text-center font-bold w-[200px] mt-2 bg-gray-900 text-white text-[12px] rounded py-1 px-2">
        Free as of Now - Beta
      </div>

      {/* Color palette preview */}
      <div className="flex mt-3 mb-3 border border-solid border-gray-500 overflow-hidden" style={{ width: '200px', height: '80px' }}>
        {colorList.length > 0 ? (
          colorList.map((hex, index) => (
            <div
              key={index}
              style={{
                backgroundColor: hex,
                flex: 1,
              }}
              title={hex}
            />
          ))
        ) : (
          <div className="w-full h-full bg-white" />
        )}
      </div>

      {/* Hex color buttons - only show hex codes */}
      <div className="mb-3 max-w-[275px] pl-3 pr-3 flex flex-wrap gap-1 justify-center">
        {colorList.map((hex, index) => (
          <button
            key={index}
            onClick={() => {
              navigator.clipboard.writeText(hex)
              copyToClipboard(hex, "HEX")
              toast.display("success", `Copied ${hex}`)
            }}
            className="text-xs border border-gray-300 px-2 py-1 hover:bg-gray-100"
            style={{ borderLeftColor: hex, borderLeftWidth: '4px' }}
          >
            {hex}
          </button>
        ))}
      </div>

      <textarea
        name="description"
        value={colorDescription}
        placeholder="Describe color ex: blue sky, sunset palette"
        onChange={(e) => setColorDescription(e.target.value)}
        className="w-[220px] h-[30px] mb-3 min-h-[50px] bg-slate-200 px-2 py-1 text-xs focus:outline-none border border-slate-200 focus:border-slate-700"
      />

      <button
        onClick={handleGenerate}
        disabled={colorDescription === ""}
        className="h-[40px] w-[100px] text-white text-[16px] bg-black disabled:bg-gray-400 relative mb-3"
      >
        {loading ? "Loading..." : "Generate"}
        {showTooltip && (
          <div className="text-center w-[200px] absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 text-white text-[9px] rounded py-1 px-2 z-10">
            {!state.user ? "You need to login first" : "You need to add a sheet first"}
          </div>
        )}
      </button>

      <button
        onClick={() => setTab("COMMENT")}
        className="h-[40px] w-[100px] text-[20px] flex justify-center"
      >
        <img src={commentIcon} alt="comment" className="h-[40px] w-[40px]" />
      </button>

      <div className="w-full flex justify-between p-3">
        <button
          onClick={() => setTab(null)}
          className="h-[40px] w-[100px] text-black text-[16px] border border-solid border-black"
        >
          Back
        </button>
        <button
          onClick={addAllColorsToFile}
          disabled={colorList.length === 0}
          className="h-[40px] w-[100px] text-white text-[16px] bg-black disabled:bg-gray-400"
        >
          {loading ? "Loading..." : `Save${colorList.length > 1 ? ` (${colorList.length})` : ''}`}
        </button>
      </div>
    </div>
  )
}

export default AIGenerator
