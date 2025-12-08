import { useState, useCallback } from "react"
import { useGlobalState } from "@/v2/hooks/useGlobalState"

export function useSlashNaming() {
  const { state, dispatch } = useGlobalState()
  const { selectedColorsFromFile } = state

  const [slashNameInputs, setSlashNameInputs] = useState<string[]>(["", "", "", "", ""])
  const [activeColors, setActiveColors] = useState<number[]>([])

  const getSlashNameParts = useCallback(
    (colorId: number) => {
      const parts = selectedColorsFromFile[colorId]?.slash_naming
        .split("/")
        .map((p) => p.trim())
        .slice(0, 5)
      return parts || []
    },
    [selectedColorsFromFile]
  )

  const handleCheckboxClick = useCallback(
    (colorId: number) => {
      // Handling the "Select All" checkbox
      if (colorId === selectedColorsFromFile.length) {
        if (activeColors.length === 0) {
          setActiveColors(selectedColorsFromFile.map((_, i) => i))
          const parts = getSlashNameParts(0)
          const sharedParts = parts.map((part) =>
            selectedColorsFromFile.every((color) =>
              color.slash_naming.includes(part)
            )
              ? part
              : ""
          )
          const filled = [...sharedParts, "", "", "", "", ""].slice(0, 5)
          setSlashNameInputs(filled)
        } else {
          setActiveColors([])
          setSlashNameInputs(["", "", "", "", ""])
        }
        return
      }

      if (activeColors.includes(colorId)) {
        const filteredColors = activeColors.filter((color) => color !== colorId)
        setActiveColors(filteredColors)

        if (filteredColors.length === 0) {
          setSlashNameInputs(["", "", "", "", ""])
        } else if (filteredColors.length === 1) {
          const parts = getSlashNameParts(filteredColors[0])
          const filled = [...parts, "", "", "", "", ""].slice(0, 5)
          setSlashNameInputs(filled)
        } else {
          const parts = getSlashNameParts(filteredColors[0])
          const sharedParts = parts.map((part) =>
            selectedColorsFromFile
              .filter(
                (_, index) => activeColors.includes(index) && index !== colorId
              )
              .every((color) => color.slash_naming.includes(part))
              ? part
              : ""
          )
          const filled = [...sharedParts, "", "", "", "", ""].slice(0, 5)
          setSlashNameInputs(filled)
        }
      } else {
        const parts = getSlashNameParts(colorId)
        const sharedParts = parts.map((part) =>
          selectedColorsFromFile
            .filter((_, index) => activeColors.includes(index))
            .every((color) => color.slash_naming.includes(part))
            ? part
            : ""
        )
        const filled = [...sharedParts, "", "", "", "", ""].slice(0, 5)
        setSlashNameInputs(filled)
        setActiveColors([...activeColors, colorId])
      }
    },
    [activeColors, selectedColorsFromFile, getSlashNameParts]
  )

  const handleChangeSlashNaming = useCallback(() => {
    if (!activeColors.length) return
    const newSlashNaming = slashNameInputs.filter(Boolean).join(" / ")
    dispatch({
      type: "UPDATE_SELECTED_COLOR_slash_naming",
      payload: { colors: activeColors, slash_naming: newSlashNaming },
    })
  }, [activeColors, slashNameInputs, dispatch])

  const handleManualSlashNamingChange = useCallback(
    (colorId: number, slashNameInput: string) => {
      const newSlashNaming = slashNameInput
        .replace(/\s+/g, "")
        .replace(/ /g, "/")
        .replace(/\//g, " / ")
      dispatch({
        type: "UPDATE_SELECTED_COLOR_slash_naming",
        payload: { colors: [colorId], slash_naming: newSlashNaming },
      })
    },
    [dispatch]
  )

  const clearColors = useCallback(() => {
    setActiveColors([])
    setSlashNameInputs(["", "", "", "", ""])
    dispatch({ type: "CLEAR_SELECTED_COLORS_FROM_FILE" })
  }, [dispatch])

  return {
    slashNameInputs,
    setSlashNameInputs,
    activeColors,
    handleCheckboxClick,
    handleChangeSlashNaming,
    handleManualSlashNamingChange,
    clearColors,
  }
}
