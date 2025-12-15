import { FC, useState, useMemo, useEffect, useRef } from "react"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { useToast } from "@/v2/hooks/useToast"
import { colors } from "@/v2/helpers/colors"
import { config } from "@/v2/others/config"
import { ArrowLeft, Sparkles, Loader2, History, Link, Copy } from "lucide-react"
import axios from "axios"
import { axiosInstance } from "@/v2/hooks/useAPI"

interface Props {
  selected: null | string
  setTab: (tab: string | null) => void
  copyToClipboard: (text: string, selection: null | string) => void
}

const AIGenerator: FC<Props> = ({ setTab, copyToClipboard }) => {
  const toast = useToast()
  const [loading, setLoading] = useState<boolean>(false)
  const [respColor, setRespColor] = useState<string>("")
  const [colorDescription, setColorDescription] = useState<string>("")
  const lastAddedColorsRef = useRef<string>("")

  const { state, dispatch } = useGlobalState()
  const { selectedFile, files, user } = state
  const selectedFileData = files.find(file => file.spreadsheetId === selectedFile)

  // Open login popup
  const openLogin = () => {
    const url = config.api.baseURL + config.api.endpoints.auth
    window.open(url, "Google Sign-in", "width=1000,height=700")
  }

  // Parse multiple colors from response
  const colorList = useMemo(() => {
    if (!respColor) return []
    // Split by comma, space, or newline and filter valid hex codes
    return respColor
      .split(/[\s,]+/)
      .map((c) => c.trim())
      .filter((c) => /^#[0-9A-Fa-f]{3,6}$/.test(c))
  }, [respColor])

  // Helper to save color to Google Sheets
  const saveColorToSheet = async (hexColor: string, description: string) => {
    if (!selectedFile || !user?.jwtToken || !selectedFileData) return

    try {
      await axiosInstance.post(
        config.api.endpoints.addColor,
        {
          spreadsheetId: selectedFile,
          sheetName: selectedFileData.sheets?.[0]?.name || "",
          sheetId: selectedFileData.sheets?.[0]?.id ?? 0,
          row: {
            timestamp: new Date().valueOf(),
            url: "AI Generated",
            hex: hexColor,
            hsl: colors.hexToHSL(hexColor),
            rgb: colors.hexToRGB(hexColor),
            comments: description,
            ranking: "",
            slash_naming: "",
            tags: [],
            additionalColumns: [],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${user.jwtToken}`,
          },
        }
      )
    } catch (error) {
      console.error("Failed to save AI color to sheet:", error)
    }
  }

  // Automatically add colors to history and sheet when generated
  useEffect(() => {
    if (colorList.length > 0 && respColor !== lastAddedColorsRef.current) {
      lastAddedColorsRef.current = respColor
      colorList.forEach((hex) => {
        dispatch({ type: "ADD_COLOR_HISTORY", payload: hex })
        if (selectedFile) {
          dispatch({
            type: "ADD_FILE_COLOR_HISTORY",
            payload: { spreadsheetId: selectedFile, color: hex },
          })
          // Also save to Google Sheets
          saveColorToSheet(hex, colorDescription)
        }
      })
      toast.display("success", `${colorList.length} color${colorList.length > 1 ? 's' : ''} added to history`)
    }
  }, [colorList, respColor, dispatch, selectedFile])

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
        toast.display("error", "Unexpected error occurred.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-[320px] bg-white rounded-md shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab(null)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-[13px] font-medium text-gray-800">AI Generator</span>
          <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Beta</span>
        </div>
        <button
          onClick={() => setTab('COMMENT')}
          className="p-1.5 hover:bg-gray-100 rounded transition-colors"
          title="History & Editor"
        >
          <History className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Output section */}
      <div className="p-3 bg-gray-50 border-b border-gray-200">
        <div className="flex h-16 rounded-lg overflow-hidden border border-gray-200 bg-white">
          {colorList.length > 0 ? (
            colorList.map((hex, index) => (
              <div
                key={index}
                className="flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                style={{ backgroundColor: hex }}
                onClick={() => {
                  navigator.clipboard.writeText(hex)
                  copyToClipboard(hex, "HEX")
                  toast.display("success", `Copied ${hex}`)
                }}
                title={`Click to copy ${hex}`}
              />
            ))
          ) : (
            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-gray-400 mr-2" />
              <span className="text-[11px] text-white">Generated colors will appear here</span>
            </div>
          )}
        </div>

        {/* Hex color chips */}
        {colorList.length > 0 && (
          <div className="grid grid-cols-3 gap-1 mt-2">
            {colorList.map((hex, index) => (
              <button
                key={index}
                onClick={() => {
                  navigator.clipboard.writeText(hex)
                  copyToClipboard(hex, "HEX")
                  toast.display("success", `Copied ${hex}`)
                }}
                className="flex items-center justify-center gap-1 text-[10px] text-gray-600 bg-white border border-gray-200 py-1 px-1 rounded hover:bg-gray-100 transition-colors"
              >
                <div
                  className="w-2.5 h-2.5 rounded-sm border border-gray-300 flex-shrink-0"
                  style={{ backgroundColor: hex }}
                />
                {hex}
                <Copy className="w-2.5 h-2.5 text-gray-400" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input section */}
      <div className="p-3">
        <textarea
          name="description"
          value={colorDescription}
          placeholder="Describe your colors... (e.g., sunset palette, ocean vibes, forest theme)"
          onChange={(e) => setColorDescription(e.target.value)}
          className="w-full h-20 px-3 py-2 text-[12px] bg-white border border-gray-200 rounded resize-none focus:outline-none focus:border-gray-400 transition-colors"
        />
      </div>

      {/* Generate button */}
      <div className="px-3 pb-3">
        <button
          onClick={() => {
            if (!user?.jwtToken) {
              openLogin()
            } else if (!selectedFile) {
              setTab('ADD_SHEET')
            } else {
              handleGenerate()
            }
          }}
          disabled={!!user?.jwtToken && !!selectedFile && (colorDescription === "" || loading)}
          className={`w-full flex items-center justify-center gap-2 py-2.5 text-[12px] rounded transition-colors ${
            (!user?.jwtToken || !selectedFile || (colorDescription && !loading))
              ? 'bg-gray-900 text-white hover:bg-gray-800'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : !user?.jwtToken ? (
            'Login to generate'
          ) : !selectedFile ? (
            <>
              <Link className="w-4 h-4" />
              Link a sheet
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Colors
            </>
          )}
        </button>
      </div>

    </div>
  )
}

export default AIGenerator
