import { FC, useEffect, useState } from 'react'
import { AddColorRequest, AddColorResponse } from '@/v2/types/api'
import { useGlobalState } from '@/v2/hooks/useGlobalState'
import { useToast } from '@/v2/hooks/useToast'
import { colors } from '@/v2/helpers/colors'
import { config } from '@/v2/others/config'
import { useAPI } from '@/v2/hooks/useAPI'
import axios from 'axios'

interface Props {
  setTab: (tab: string | null) => void;
}

const Comment: FC<Props> = ({ setTab }) => {
  const toast = useToast()
  const [loading, setLoading] = useState<boolean>(false);
  const [respColor, setRespColor] = useState<string>('');
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const [colorDescription, setColorDescription] = useState<string>('');

  const addColor = useAPI<AddColorRequest, AddColorResponse>({
    url: config.api.endpoints.addColor,
    method: "POST",
  })

  const { state } = useGlobalState();
  const { files, selectedFile } = state;
  const selectedFileData = files.find(file => file.spreadsheetId === selectedFile);

  const handleGenerate = () => {
    try {
      setLoading(true);

      axios.get(`${import.meta.env.VITE_API_TEXT_TO_COLOR_URL}/${colorDescription}`, {
        headers: {
          'X-API-Key': import.meta.env.VITE_TEXT_TO_COLOR_API_KEY
        }
      })
      .then((response) => {
        console.log('RESP_!!!', response)
        setRespColor(response.data.hex_code);
      })
      .finally(() => {
        setLoading(false);
      });
    } catch (error) {
      console.log(error)
    }
  };

  const addColorToFile = () => {
    addColor
      .call({
        spreadsheetId: selectedFile!,
        sheetName: selectedFileData?.sheets?.[0]?.name || '',
        sheetId: selectedFileData?.sheets?.[0]?.id || null!,
        row: {
          timestamp: new Date().valueOf(),
          url: 'AI Generated Color',
          hex: respColor,
          hsl: colors.hexToHSL(respColor),
          rgb: colors.hexToRGB(respColor),
          comments: colorDescription,
          ranking: '',
          slashNaming: '',
          projectName: '',
          additionalColumns: [],
        },
      })
      .then(() => {
        toast.display("success", "Color saved successfully")
      })
      .catch((err) => toast.display("error", err))
  };

  useEffect(() => {
    if (!selectedFile) {
      setShowTooltip(true)
    } else {
      setShowTooltip(false)
    }
  }, [selectedFile]);

  return (
    <div className="border-2 flex flex-col w-[275px] min-h-[370px] p-1.5 relative items-center">
      <div
        style={{ backgroundColor: respColor }}
        className={`w-[80px] h-[80px] mt-[35px] mb-[35px] border border-solid border-gray-500`}
      />
      <textarea
        name='description'
        value={colorDescription}
        placeholder='Describe color ex: blue sky'
        onChange={e => setColorDescription(e.target.value)}
        className="w-[220px] h-[30px] mb-[25px] min-h-[25px] bg-slate-200 px-2 py-1 text-xs focus:outline-none border border-slate-200 focus:border-slate-700"
      />

      <button
        onClick={handleGenerate}
        disabled={colorDescription === ''}
        className="h-[40px] w-[100px] text-white text-[16px] bg-black disabled:bg-gray-400 relative"
      >
        {loading ? 'Loading...' : 'Generate'}
        {showTooltip  && (
          <div className="w-[200px] absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 text-white text-[9px] rounded py-1 px-2 z-10">
            You need to login and add sheet
          </div>
        )}
      </button>

      <div className="w-full flex justify-between absolute bottom-0 p-3">
        <button
          onClick={() => setTab(null)}
          className="h-[40px] w-[100px] text-black text-[16px] border border-solid border-black"
        >
          Back
        </button>
        <button
          onClick={addColorToFile}
          disabled={respColor === ''}
          className="h-[40px] w-[100px] text-white text-[16px] bg-black disabled:bg-gray-400"
        >
          {loading ? 'Loading...' : 'Save'}
        </button>
      </div>

    </div>
  )
}

export default Comment;
