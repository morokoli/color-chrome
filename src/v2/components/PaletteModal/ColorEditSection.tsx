import { useState } from "react"
import { ColorPicker } from "primereact/colorpicker"
import tinycolor from "tinycolor2"
import { Copy, Check, Pipette } from "lucide-react"
import { createDefaultColorObject } from "@/v2/helpers/createDefaultColorObject"
import { useToast } from "@/v2/hooks/useToast"
import { openEyeDropper } from "@/v2/helpers/colorPicker"
import SingleThumbSlider from "./SingleThumbSlider"

const getColorHex = (color: any) => {
    if (typeof color === "string") return color
    return color?.hex || "#FFB3B3"
}

interface ColorEditSectionProps {
    selectedColor: any
    onColorChange: (color: any) => void
    colorPickerIndex: number | null
}

const ColorEditSection = ({
    selectedColor,
    onColorChange,
    colorPickerIndex,
}: ColorEditSectionProps) => {
    const toast = useToast()
    const [hslCopied, setHslCopied] = useState(false)

    if (colorPickerIndex === null) {
        return (
            <div style={{ textAlign: "center", padding: "20px", color: "#999" }}>
                Select a color to edit
            </div>
        )
    }

    const colorObject =
        typeof selectedColor === "string"
            ? createDefaultColorObject(selectedColor)
            : selectedColor

    const tc = tinycolor(getColorHex(colorObject))
    const rgb = tc.toRgb()
    const hsl = tc.toHsl()
    const h = hsl.h
    const s = hsl.s
    const l = hsl.l

    const handleHexChange = (e: any) => {
        let hex = typeof e === "object" && e?.value ? e.value : e
        if (typeof hex !== "string") return
        if (!hex.startsWith("#")) hex = "#" + hex
        const updatedColor = {
            ...colorObject,
            hex,
            rgb: tinycolor(hex).toRgb(),
            hsl: tinycolor(hex).toHsl(),
        }
        onColorChange(updatedColor)
    }

    const handleRgbChange = (index: number, value: number) => {
        const newRgb = { r: rgb.r, g: rgb.g, b: rgb.b }
        newRgb[["r", "g", "b"][index] as keyof typeof newRgb] = value
        const hex = tinycolor(newRgb).toHexString()
        const updatedColor = {
            ...colorObject,
            hex,
            rgb: newRgb,
            hsl: tinycolor(newRgb).toHsl(),
        }
        onColorChange(updatedColor)
    }

    const handleHslChange = (index: number, value: any) => {
        const newHsl = { h, s, l }
        // allow strings here to match webapp behavior
        newHsl[["h", "s", "l"][index] as "h" | "s" | "l"] = value
        const hex = tinycolor(newHsl).toHexString()
        const updatedColor = {
            ...colorObject,
            hex,
            rgb: tinycolor(newHsl).toRgb(),
            hsl: newHsl,
        }
        onColorChange(updatedColor)
    }

    const handleHueChange = (value: number) => {
        const hex = tinycolor({ h: value, s, l }).toHexString()
        const updatedColor = {
            ...colorObject,
            hex,
            rgb: tinycolor({ h: value, s, l }).toRgb(),
            hsl: { h: value, s, l },
        }
        onColorChange(updatedColor)
    }

    const hslString = `hsl(${Math.round(h)}, ${Math.round((s ?? 0) * 100)}%, ${Math.round((l ?? 0) * 100)}%)`
    const handleCopyHsl = () => {
        navigator.clipboard.writeText(hslString)
        setHslCopied(true)
        toast.display("success", "HSL copied to clipboard")
        setTimeout(() => setHslCopied(false), 1500)
    }

    const handlePickFromScreen = async () => {
        if (typeof window === "undefined" || !("EyeDropper" in window)) {
            toast.display("error", "Eyedropper is not supported in this browser")
            return
        }
        try {
            const hex = await openEyeDropper()
            if (hex) {
                handleHexChange(hex)
                toast.display("success", "Color applied")
            }
        } catch {
            toast.display("error", "Could not pick color")
        }
    }

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                width: "100%",
            }}
        >
            {/* Color Picker Section */}
            <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
                <div
                    style={{
                        padding: "6px 0px",
                        width: 180,
                        transform: "scale(0.9)",
                        transformOrigin: "top left",
                    }}
                >
                    <ColorPicker
                        value={getColorHex(colorObject)}
                        onChange={handleHexChange}
                        inline
                    />
                </div>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        position: "absolute",
                        left: "52%",
                        transform: "translateX(-50%)",
                    }}
                >
                    <span style={{ fontSize: "12px", marginBottom: "6px" }}>Selected Color</span>
                    <div
                        style={{
                            width: 56,
                            height: 56,
                            background: getColorHex(colorObject),
                            border: "2px solid black",
                        }}
                    />
                    <button
                        type="button"
                        onClick={handlePickFromScreen}
                        title="Pick color from screen"
                        style={{
                            marginTop: "6px",
                            padding: "6px",
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            borderRadius: "4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#f0f0f0"
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent"
                        }}
                    >
                        <Pipette className="w-4 h-4" style={{ color: "#374151" }} />
                    </button>
                </div>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        position: "relative",
                    }}
                >
                    <span style={{ fontSize: "14px" }}>100</span>
                    <span
                        style={{
                            position: "absolute",
                            top: 68,
                            left: -32,
                            transform: "rotate(-90deg)",
                            fontSize: "13px",
                        }}
                    >
                        Lightness
                    </span>
                    <div
                        style={{
                            display: "grid",
                            padding: "0px 12px",
                            gridTemplateColumns: "repeat(10, 1fr)",
                        }}
                    >
                        {Array.from({ length: 9 }).map((_, row) =>
                            Array.from({ length: 10 }).map((_, col) => {
                                const s = (col / 9) * 100
                                const l = ((9 - row) / 10) * 100
                                const color = `hsl(${h}, ${s}%, ${l}%)`
                                const hex = tinycolor(color).toHexString()
                                return (
                                    <div
                                        key={`${row}-${col}`}
                                        onClick={() => handleHexChange({ value: hex })}
                                        style={{
                                            width: "12px",
                                            height: "12px",
                                            backgroundColor: color,
                                            boxSizing: "border-box",
                                            border:
                                                hex === getColorHex(colorObject) ? "2px solid black" : "none",
                                            cursor: "pointer",
                                        }}
                                    />
                                )
                            })
                        )}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "13px" }}>0</span>
                        <span style={{ fontSize: "13px" }}>Saturation</span>
                        <span style={{ fontSize: "13px" }}>100</span>
                    </div>
                </div>
            </div>

            {/* Color Controls */}
            <div style={{ display: "flex", gap: 16, width: "100%" }}>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        width: "100%",
                        marginBottom: 8,
                    }}
                >
                    <input
                        value={getColorHex(colorObject)}
                        onChange={(e) => handleHexChange(e.target.value)}
                        style={{
                            width: "100%",
                            height: "32px",
                            padding: "4px 11px",
                            fontSize: "14px",
                            border: "1px solid #d9d9d9",
                            marginBottom: 8,
                            outline: "none",
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = "#4096ff"
                            e.currentTarget.style.boxShadow = "0 0 0 2px rgba(5, 145, 255, 0.1)"
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = "#d9d9d9"
                            e.currentTarget.style.boxShadow = "none"
                        }}
                    />
                    <SingleThumbSlider
                        value={rgb.r}
                        onValueChange={(v) => handleRgbChange(0, v)}
                        max={255}
                        min={0}
                        step={1}
                        label="Red"
                        inlineLabel
                        color={`rgb(${rgb.r},0,0)`}
                        backgroundColor={`linear-gradient(to right, rgb(0, 0, 0), rgb(255, 0, 0))`}
                    />
                    <SingleThumbSlider
                        value={rgb.g}
                        onValueChange={(v) => handleRgbChange(1, v)}
                        max={255}
                        min={0}
                        step={1}
                        label="Green"
                        inlineLabel
                        color={`rgb(0,${rgb.g},0)`}
                        backgroundColor={`linear-gradient(to right, rgb(0, 0, 0), rgb(0, 255, 0))`}
                    />
                    <SingleThumbSlider
                        value={rgb.b}
                        onValueChange={(v) => handleRgbChange(2, v)}
                        max={255}
                        min={0}
                        step={1}
                        label="Blue"
                        inlineLabel
                        color={`rgb(0,0,${rgb.b})`}
                        backgroundColor={`linear-gradient(to right, rgb(0, 0, 0), rgb(0, 0, 255))`}
                    />
                </div>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-end",
                        width: "100%",
                        gap: 8,
                        marginBottom: 8,
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input
                            value={Number(h || 0).toFixed(0)}
                            onChange={(e) => handleHslChange(0, e.target.value)}
                            style={{
                                width: "100%",
                                height: "32px",
                                padding: "4px 11px",
                                fontSize: "14px",
                                border: "1px solid #d9d9d9",
                                marginBottom: 8,
                                outline: "none",
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = "#4096ff"
                                e.currentTarget.style.boxShadow = "0 0 0 2px rgba(5, 145, 255, 0.1)"
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = "#d9d9d9"
                                e.currentTarget.style.boxShadow = "none"
                            }}
                        />
                        <input
                            value={(Number(s || 0) * 100).toFixed(0)}
                            onChange={(e) => handleHslChange(1, Number(e.target.value) / 100)}
                            style={{
                                width: "100%",
                                height: "32px",
                                padding: "4px 11px",
                                fontSize: "14px",
                                border: "1px solid #d9d9d9",
                                borderRadius: "6px",
                                marginBottom: 8,
                                outline: "none",
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = "#4096ff"
                                e.currentTarget.style.boxShadow = "0 0 0 2px rgba(5, 145, 255, 0.1)"
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = "#d9d9d9"
                                e.currentTarget.style.boxShadow = "none"
                            }}
                        />
                        <input
                            value={(Number(l || 0) * 100).toFixed(0)}
                            onChange={(e) => handleHslChange(2, Number(e.target.value) / 100)}
                            style={{
                                width: "100%",
                                height: "32px",
                                padding: "4px 11px",
                                fontSize: "14px",
                                border: "1px solid #d9d9d9",
                                marginBottom: 8,
                                outline: "none",
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = "#4096ff"
                                e.currentTarget.style.boxShadow = "0 0 0 2px rgba(5, 145, 255, 0.1)"
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = "#d9d9d9"
                                e.currentTarget.style.boxShadow = "none"
                            }}
                        />
                        <button
                            type="button"
                            onClick={handleCopyHsl}
                            title="Copy HSL"
                            style={{
                                padding: "6px",
                                marginBottom: 8,
                                border: "none",
                                background: "transparent",
                                cursor: "pointer",
                                borderRadius: "4px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#f5f5f5"
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "transparent"
                            }}
                        >
                            {hslCopied ? (
                                <Check className="w-4 h-4" style={{ color: "#22c55e" }} />
                            ) : (
                                <Copy className="w-4 h-4" style={{ color: "#6b7280" }} />
                            )}
                        </button>
                    </div>
                    <SingleThumbSlider
                        value={h}
                        onValueChange={handleHueChange}
                        max={359}
                        min={0}
                        step={1}
                        label="Hue"
                        inlineLabel
                        color={`hsl(${h},100%,50%)`}
                        backgroundColor={`linear-gradient(to right, hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%), hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%), hsl(359, 100%, 50%))`}
                    />
                    <SingleThumbSlider
                        value={s}
                        onValueChange={(v) => handleHslChange(1, v)}
                        max={1}
                        min={0}
                        step={0.01}
                        label="Saturation"
                        inlineLabel
                        color={`hsl(${h},100%,50%)`}
                        backgroundColor={`linear-gradient(to right, hsl(${h}, 0%, ${l}%), hsl(${h}, 100%, ${l}%))`}
                    />
                    <SingleThumbSlider
                        value={l}
                        onValueChange={(v) => handleHslChange(2, v)}
                        max={1}
                        min={0}
                        step={0.01}
                        label="Lightness"
                        inlineLabel
                        color={`hsl(${h},100%,50%)`}
                        backgroundColor={`linear-gradient(to right, hsl(${h}, 100%, 0%), hsl(${h}, 100%, 100%))`}
                    />
                </div>
            </div>
        </div>
    )
}

export default ColorEditSection
