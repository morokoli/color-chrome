import { FC, useRef, useState } from "react"
import PaletteModal, { type PaletteModalHandle } from "./PaletteModal"
import SectionHeader from "./common/SectionHeader"

interface Props {
    setTab: (tab: string | null) => void
    onPickColor?: () => void
    onPickColorFromBrowser?: () => void
}

const Generator: FC<Props> = ({ setTab, onPickColor, onPickColorFromBrowser }) => {
    const paletteRef = useRef<PaletteModalHandle | null>(null)
    const [primaryDisabled, setPrimaryDisabled] = useState(false)

    const handleClose = () => {
        setTab(null)
    }

    const handleSuccess = () => {
        setTab(null)
    }

    const handleStateChange = () => {}

    return (
        <div className="w-[800px] h-[600px] flex flex-col generator-container">
            <SectionHeader
                title="Generator"
                setTab={setTab}
                onPickColor={onPickColor}
                onPickColorFromBrowser={onPickColorFromBrowser}
            />
            <div className="flex-1 overflow-hidden flex justify-center items-start">
                <PaletteModal
                    ref={paletteRef}
                    open={true}
                    onClose={handleClose}
                    onSuccess={handleSuccess}
                    hidePrimaryActionButton={true}
                    onPrimaryActionMetaChange={({ disabled }) => {
                        setPrimaryDisabled(disabled)
                    }}
                    onStateChange={handleStateChange}
                />
            </div>
            {/* Save button at bottom - same area as AI Generator */}
            <div className="px-3 pb-3 pt-2 border-t border-gray-200 flex-shrink-0 flex justify-end">
                <button
                    onClick={() => paletteRef.current?.submit()}
                    disabled={primaryDisabled}
                    className={`flex items-center justify-center py-2.5 min-w-[140px] text-[12px] rounded transition-colors ${
                        !primaryDisabled
                            ? "bg-gray-900 text-white hover:bg-gray-800"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                >
                    Save
                </button>
            </div>
        </div>
    )
}

export default Generator
