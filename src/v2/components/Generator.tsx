import { FC, useRef, useState } from "react"
import { ArrowLeft, RotateCcw } from "lucide-react"
import PaletteModal, { type PaletteModalHandle } from "./PaletteModal"

interface Props {
    setTab: (tab: string | null) => void
}

const Generator: FC<Props> = ({ setTab }) => {
    const paletteRef = useRef<PaletteModalHandle | null>(null)
    const [primaryLabel, setPrimaryLabel] = useState("Add Palette")
    const [primaryDisabled, setPrimaryDisabled] = useState(false)
    const [colorsCount, setColorsCount] = useState(2)
    const [canUndo, setCanUndo] = useState(false)
    const [canRedo, setCanRedo] = useState(false)

    const handleClose = () => {
        setTab(null)
    }

    const handleSuccess = () => {
        setTab(null)
    }

    const handleStateChange = (state: { colorsCount: number; canUndo: boolean; canRedo: boolean }) => {
        setColorsCount(state.colorsCount)
        setCanUndo(state.canUndo)
        setCanRedo(state.canRedo)
    }

    const heading = colorsCount === 1 ? "Create Your Color" : "Create Your Palette"

    return (
        <div className="w-[800px] h-[600px] flex flex-col generator-container">
            <div className="flex items-center gap-2 p-4 border-b flex-shrink-0">
                <button
                    onClick={() => setTab(null)}
                    className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="text-lg font-semibold flex-1">{heading}</h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => paletteRef.current?.handleUndo()}
                        title="Undo (Ctrl+Z)"
                        disabled={!canUndo}
                        style={{
                            padding: "2px 6px",
                            minWidth: "auto",
                            opacity: canUndo ? 1 : 0.5,
                            border: "none",
                            background: "transparent",
                            cursor: canUndo ? "pointer" : "not-allowed",
                        }}
                    >
                        <RotateCcw style={{ width: "14px", height: "14px" }} />
                    </button>
                    <button
                        onClick={() => paletteRef.current?.handleRedo()}
                        title="Redo (Ctrl+Shift+Z)"
                        disabled={!canRedo}
                        style={{
                            padding: "2px 6px",
                            minWidth: "auto",
                            opacity: canRedo ? 1 : 0.5,
                            border: "none",
                            background: "transparent",
                            cursor: canRedo ? "pointer" : "not-allowed",
                        }}
                    >
                        <RotateCcw style={{ width: "14px", height: "14px", transform: "scaleX(-1)" }} />
                    </button>
                    <button
                        onClick={() => paletteRef.current?.submit()}
                        disabled={primaryDisabled}
                        style={{
                            padding: "4px 12px",
                            fontSize: "14px",
                            height: "32px",
                            border: "2px solid #000",
                            borderRadius: "0px",
                            background: "#000",
                            color: "#fff",
                            cursor: primaryDisabled ? "not-allowed" : "pointer",
                            opacity: primaryDisabled ? 0.6 : 1,
                        }}
                    >
                        {primaryLabel}
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-hidden flex justify-center items-start">
                <PaletteModal
                    ref={paletteRef}
                    open={true}
                    onClose={handleClose}
                    onSuccess={handleSuccess}
                    hidePrimaryActionButton={true}
                    onPrimaryActionMetaChange={({ label, disabled }) => {
                        setPrimaryLabel(label)
                        setPrimaryDisabled(disabled)
                    }}
                    onStateChange={handleStateChange}
                />
            </div>
        </div>
    )
}

export default Generator
