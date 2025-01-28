import { FC, useEffect } from 'react'
import { DeleteRowRequest, DeleteRowResponse } from '@/v2/types/api'
import { useGlobalState } from '@/v2/hooks/useGlobalState'
import { useToast } from '@/v2/hooks/useToast'
import { config } from '@/v2/others/config'
import { useAPI } from '@/v2/hooks/useAPI'

interface Props {
  selectedColor: number;
  setTab: (tab: string | null) => void;
  setSelectedColor: (value: number | null) => void;
}

const ColorHistory: FC<Props> = ({ setTab, selectedColor, setSelectedColor }) => {
  const toast = useToast()
  const { state, dispatch } = useGlobalState();
  const { colorHistory, selectedFile } = state;
  // not more then 38 colors
  const filteredColorHistory = colorHistory.slice(0, 38);

  const { call } = useAPI<
    DeleteRowRequest,
    DeleteRowResponse
  >({
    url: config.api.endpoints.deleteRow,
    method: "POST",
  })

  const colorChangeHandler = (colorIndex: number) => {
    // [] because at the first iteration user could select multiple colors
    if (selectedColor !== colorIndex) {
      setSelectedColor(colorIndex)
    } else {
      setSelectedColor(null)
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

  const openFileHandler = () => {
    const fileUrl = import.meta.env.VITE_SPREADSHEET_URL + selectedFile;
    window.open(fileUrl, '_blank');
  }

  // set Selected last color from Color history
  useEffect(() => {
    setSelectedColor(colorHistory.length - 1);
  }, [colorHistory])

  return (
    <div className="w-full h-[47px] flex mb-1.5 relative content-start">
      <div className='flex flex-col justify-between mr-[1px]'>
        <button
          onClick={() => setTab(null)}
          className="h-[22px] w-[50px] text-black text-[10px] bg-white disabled:bg-gray-400 border border-black"
        >
          {'<- Back'}
        </button>
        <button
          onClick={openFileHandler}
          disabled={!selectedFile}
          className="h-[22px] w-[50px] text-black text-[10px] bg-white disabled:bg-gray-400 border border-black"
        >
          {'Open file'}
        </button>
      </div>

      <div className='flex flex-wrap content-baseline'>
        {filteredColorHistory.map(
          (color, index) => (
            <div
              key={color + index}
              style={{ backgroundColor: color }}
              onClick={() => colorChangeHandler(index)}
              className={`w-[15px] h-[15px] mr-[1px] mb-[1px] ${selectedColor === index ? "border-2 border-solid border-black zoom-15" : ""}`}
            />
          ))
          .reverse()}
        <div className='delete-square' onClick={() => colorsDeleteHandler()}/>
      </div>
     
    
    </div>
  )
}

export default ColorHistory;
