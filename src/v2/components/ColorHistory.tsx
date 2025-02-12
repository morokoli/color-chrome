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
}

const ColorHistory: FC<Props> = ({ selectedColor, setSelectedColor, setCurrentColor, setColorFromPallete }) => {
  const toast = useToast()
  const { state, dispatch } = useGlobalState();
  const { colorHistory, selectedFile } = state;
  // not more then 65 colors
  const filteredColorHistory = colorHistory.slice(0, 65);

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

  const colorsDeleteHandler = () => {
    const res = filteredColorHistory.filter((_, index) => selectedColor !== index);
    setSelectedColor(null);
    dispatch({ type: "CLEAR_COLOR_HISTORY" });

    res.forEach(color => dispatch({ type: "ADD_COLOR_HISTORY", payload: color }))

    if (selectedFile) {
      const selectedFileData = state.files.find(item => item.spreadsheetId === selectedFile);

      call({
        spreadsheetId: selectedFile,
        sheetId: selectedFileData?.sheets?.[0]?.id,
        // sort need for right deletion from file
        deleteRows: [selectedColor],
       })
      .then((data) => {
        if (data.done) {
          toast.display("success", "Color removed successfully")
        }
      })
      .catch(() => toast.display("error", "Failed to fetch spreadsheet details"))
    }
  };

  // set Selected last color from Color history
  useEffect(() => {
    setSelectedColor(colorHistory.length - 1);
  }, [colorHistory])

  return (
    <div className="w-[125px] h-[241px] relative">
      <div className='flex flex-wrap content-baseline gap-[1px]'>
        {filteredColorHistory.map(
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
        <div className='delete-square' onClick={() => colorsDeleteHandler()}/>
      </div>
    </div>
  )
}

export default ColorHistory;
