import { FC, useEffect } from 'react'
import { DeleteRowRequest, DeleteRowResponse } from '@/v2/types/api'
import { useGlobalState } from '@/v2/hooks/useGlobalState'
import { useToast } from '@/v2/hooks/useToast'
import { config } from '@/v2/others/config'
import { useAPI } from '@/v2/hooks/useAPI'

interface Props {
  selectedColor: number;
  setSelectedColor: (value: number | null) => void;
  setCurrentColor: (value: string) => void;
  setColorFromPallete: (value: string) => void;
  setCheckValidFlag: (value: boolean) => void
}

const ColorHistory: FC<Props> = ({ selectedColor, setSelectedColor, setCurrentColor, setColorFromPallete, setCheckValidFlag }) => {
  const toast = useToast()
  const { state, dispatch } = useGlobalState();
  const { colorHistory, selectedFile } = state;

  const { call } = useAPI<
    DeleteRowRequest,
    DeleteRowResponse
  >({
    url: config.api.endpoints.deleteRow,
    method: "POST",
  })

  const colorChangeHandler = (colorIndex: number, color: string) => {
    if (selectedColor !== colorIndex) {
      setSelectedColor(colorIndex)
      setCurrentColor(color)
      setColorFromPallete(color)
    } else {
      setSelectedColor(null)
      setCurrentColor('#fff')
      setColorFromPallete('#fff')
    }
  };

  const deleteColorFromState = () => {
    const res = colorHistory.filter((_, index) => selectedColor !== index);
    setSelectedColor(null);
    dispatch({ type: "CLEAR_COLOR_HISTORY" });

    res.forEach(color => dispatch({ type: "ADD_COLOR_HISTORY", payload: color }))
  };

  const colorsDeleteHandler = () => {
    if (selectedColor === null) return;
    if (selectedFile) {
      const isConfirmed = window.confirm(
        "It will be deleted from sheet as well. Are you sure to continue?",
      )
      if (!isConfirmed) return
      
      const selectedFileData = state.files.find(item => item.spreadsheetId === selectedFile);

      call({
        spreadsheetId: selectedFile,
        sheetId: selectedFileData?.sheets?.[0]?.id,
        deleteRows: [selectedColor],
       })
      .then((data) => {
        if (data.done) {
          toast.display("success", "Color removed successfully")
        }
        setCheckValidFlag(true)
      })
      .catch(() => toast.display("error", "Failed to fetch spreadsheet details"))
    }
    deleteColorFromState();
  };

  // set Selected last color from Color history
  useEffect(() => setSelectedColor(colorHistory.length - 1), [colorHistory])

  return (
    <div className="w-[125px] h-[284px] relative color-history">
      <div className='flex flex-wrap content-baseline gap-[1px] color-history-container'>
        {colorHistory.map(
          (color, index) => (
            <div
              key={color + index}
              style={{ backgroundColor: color }}
              onClick={() => colorChangeHandler(index, color)}
              className={`w-[20px] h-[21px] ${selectedColor === index ? "border border-solid border-black scale-180 z-10" : ""}`}
            />
          ))
          .reverse()
          }
        <div className='delete-square' onClick={colorsDeleteHandler} />
      </div>
    </div>
  )
}

export default ColorHistory;
