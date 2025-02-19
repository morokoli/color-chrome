import { FC, useEffect, useState } from 'react'
import { AddColorRequest, AddColorResponse } from '@/v2/types/api'
import { useGlobalState } from '@/v2/hooks/useGlobalState'
import { useToast } from '@/v2/hooks/useToast'
import { colors } from '@/v2/helpers/colors'
import { config } from '@/v2/others/config'
import { useAPI } from '@/v2/hooks/useAPI'
import axios from 'axios'

import ColorCodeButtons from './ColorCodeButtons';

import commentIcon from '@/v2/assets/images/icons/menu/comment.svg'

interface Props {
  selected: null | string;
  setTab: (tab: string | null) => void;
  copyToClipboard: (text: string, selection: null | string) => void
}

const Comment: FC<Props> = ({ setTab, selected, copyToClipboard }) => {
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
    setLoading(true);

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
          tags: '',
          additionalColumns: [],
        },
      })
      .then(() => {
        toast.display("success", "Color saved successfully")
      })
      .catch((err) => toast.display("error", err))
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!selectedFile) {
      setShowTooltip(true)
    } else {
      setShowTooltip(false)
    }
  }, [selectedFile]);

  return (
    <div className="border-2 flex flex-col w-[275px] min-h-[370px] relative items-center">
      <div className="text-center font-bold w-[200px] mt-2 bg-gray-900 text-white text-[12px] rounded py-1 px-2">
        Free as of Now - Beta
      </div>
      <div
        style={{ backgroundColor: respColor }}
        className={`w-[80px] h-[80px] mt-3 mb-3 border border-solid border-gray-500`}
      />
      <div className='mb-3 max-w-[275px] pl-3 pr-3'>
        <ColorCodeButtons
          isCompact
          color={respColor}
          isPanelOpen={true}
          selected={selected!}
          copyToClipboard={copyToClipboard}
        />
      </div>
      <textarea
        name='description'
        value={colorDescription}
        placeholder='Describe color ex: blue sky'
        onChange={e => setColorDescription(e.target.value)}
        className="w-[220px] h-[30px] mb-3 min-h-[50px] bg-slate-200 px-2 py-1 text-xs focus:outline-none border border-slate-200 focus:border-slate-700"
      />

      <button
        onClick={handleGenerate}
        disabled={colorDescription === ''}
        className="h-[40px] w-[100px] text-white text-[16px] bg-black disabled:bg-gray-400 relative mb-3"
      >
        {loading ? 'Loading...' : 'Generate'}
        {showTooltip  && (
          <div className="text-center w-[200px] absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 text-white text-[9px] rounded py-1 px-2 z-10">
            You need to login and add sheet
          </div>
        )}
      </button>

      <button
        onClick={() => setTab('COMMENT')}
        className="h-[40px] w-[100px] text-[20px] flex justify-center"
      >
        <img src={commentIcon} alt="comment" className="h-[40px] w-[40px]" />
      </button>

      <div className="w-full flex justify-between p-3">
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
