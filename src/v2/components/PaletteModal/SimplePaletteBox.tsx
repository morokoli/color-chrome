import { Flex } from "antd"

const isColorDark = (color: string) => {
  const hex = color.replace("#", "")
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance < 0.5
}

const getColorHex = (color: any) => {
  if (typeof color === "string") return color
  return color?.hex || color
}

const SimplePaletteBox = ({
  colors,
  style = {},
}: {
  colors: any[]
  style?: React.CSSProperties
}) => {
  if (!colors || colors.length === 0) return null

  return (
    <Flex
      style={{
        width: "100%",
        height: "200px",
        border: "1px solid black",
        overflow: "hidden",
        ...(style || {}),
      }}
    >
      {colors.map((color: any, index: number) => {
        const backgroundColor = getColorHex(color) || "#FFB3B3"
        const dark = isColorDark(backgroundColor)
        const textColor = dark ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.6)"

        return (
          <div
            key={index}
            style={{
              flex: 1,
              backgroundColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              cursor: "pointer",
              transition: "transform 0.1s ease",
              borderRight:
                index < colors.length - 1 ? "1px solid rgba(0,0,0,0.1)" : "none",
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLDivElement).style.transform = "scale(1.05)"
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLDivElement).style.transform = "scale(1)"
            }}
          >
            <span
              style={{
                fontSize: "10px",
                fontWeight: "500",
                color: textColor,
                textShadow: dark
                  ? "0 1px 2px rgba(0,0,0,0.5)"
                  : "0 1px 2px rgba(255,255,255,0.5)",
                userSelect: "none",
              }}
            />
          </div>
        )
      })}
    </Flex>
  )
}

export default SimplePaletteBox

