import { FC, useState, useEffect, memo, ChangeEvent } from 'react'
import { useGlobalState } from '@/v2/hooks/useGlobalState'
import { useToast } from "@/v2/hooks/useToast"
import { config } from '@/v2/others/config'
import { useAPI } from "@/v2/hooks/useAPI"
import Input from '@/v2/components/Input';
import {
  DriveFileCreateRequest,
  DriveFileCreateResponse,
  DriveFileGetByURLRequest,
  DriveFileGetByURLResponse,
} from "@/v2/types/api"

interface Props {
  setTab: (tab: string | null) => void;
}

const AddSheet: FC<Props> = memo(({ setTab }) => {
  const toast = useToast()
  const { state, dispatch } = useGlobalState();
  const [isExisting, setIsExisting] = useState(true);
  const [sheetUrl, setSheetUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [sheetName, setSheetName] = useState('');

  const { call: callCreateSheet, isStatusLoading: loadingCreateSheet } = useAPI<
    DriveFileCreateRequest,
    DriveFileCreateResponse
  >({
    url: config.api.endpoints.sheetCreate,
    method: "POST",
  })

  const { call: callGetSheetByUrl, isStatusLoading: loadindGetSheetByUrl } = useAPI<
    DriveFileGetByURLRequest,
    DriveFileGetByURLResponse
  >({
    url: config.api.endpoints.sheetGetByURL,
    method: "POST",
  })

  const handleChangeUrl = (event: ChangeEvent<HTMLInputElement>) => {
    setSheetUrl(event.target.value);
  };

  const getFileDataByUrl = () => {
    callGetSheetByUrl({ url: sheetUrl})
      .then((data) => {
        if (data.spreadsheet) {
          dispatch({ type: "ADD_FILES", payload: data.spreadsheet })
          dispatch({ type: "SET_SELECTED_FILE", payload: data.spreadsheet.spreadsheetId });
          toast.display("success", "Spreadsheet added successfully")
          setTab(null);
        }

      })
      .catch(() =>
        toast.display("error", "Failed to fetch spreadsheet details"),
      )
  };

  const createSheetFile = () => {
    callCreateSheet({ fileName, sheetName })
    .then((data) => {
      if (data.spreadsheetId) {
        const fileObj = {
          fileName,
          spreadsheetId: data.spreadsheetId,
          sheets: [{
            name: sheetName,
            id: data.sheetId,
          }],
        };

        dispatch({ type: "ADD_FILES", payload: fileObj })
        dispatch({ type: "SET_SELECTED_FILE", payload: data.spreadsheetId });
        toast.display("success", "Spreadsheet added successfully")
        setTab(null);
      }

    })
    .catch(() =>
      toast.display("error", "Failed to fetch spreadsheet details"),
    )
  };

  const openLogin = () => {
    const url = config.api.baseURL + config.api.endpoints.auth
    window.open(url, "Google Sign-in", "width=1000,height=700")
  }

  useEffect(() => {
    if (!state.user) {
      setTab(null);
      openLogin();
    }
  }, [state.user]);

  return (
    <div className="w-[450px] border-2 flex-col p-3">
      <div className="flex mb-3">
        <div className="mr-5">
          <input type="checkbox" id="existing" name="existing" checked={isExisting} onChange={() => setIsExisting(true)}/>
          <label htmlFor="existing" className="ml-2">Existing Sheet</label>
        </div>
        <div>
          <input type="checkbox" id="new" name="new" checked={!isExisting} onChange={() => setIsExisting(false)}/>
          <label htmlFor="new" className="ml-2">New Sheet</label>
        </div>
      </div>

      {isExisting && (
        <>
          <div className="mb-2">
            <Input key='url' name='url' placeholder="Paste URL Sheet Here" value={sheetUrl} onChange={handleChangeUrl} />
          </div>
            <div className="w-full flex justify-between mt-2">
            <button
                onClick={() => setTab(null)}
                className="h-[40px] w-[100px] text-black text-[16px] border border-solid border-black"
              >
                Back
              </button>
              <button
                disabled={!sheetUrl || loadindGetSheetByUrl} 
                onClick={getFileDataByUrl}
                className="h-[40px] w-[100px] text-white text-[16px] bg-black disabled:bg-gray-400"
              >
                {loadindGetSheetByUrl ? 'Loading...' : 'Add'}
              </button>
           </div>
        </>

      )}
      {!isExisting && (
        <>
          <div>
            <Input key='sheetName' name='sheetName' placeholder="Sheet Name" value={fileName} onChange={e => setFileName(e.target.value)} />
            <Input key='tabName' name='tabName' placeholder="Tab Name" value={sheetName} onChange={e => setSheetName(e.target.value)} />
          </div>
           <div className="w-full flex justify-between mt-2 mb-2">
            <button
                onClick={() => setTab(null)}
                className="h-[40px] w-[100px] text-black text-[16px] border border-solid border-black"
              >
                Back
              </button>
            <button
              disabled={!fileName || !sheetName || loadingCreateSheet}
              onClick={createSheetFile}
              className="h-[40px] w-[100px] text-white text-[16px] bg-black disabled:bg-gray-400"
            >
                {loadingCreateSheet ? 'Loading...' : 'Create'}
            </button>
         </div>
        </>
       
      )}

    </div>
  )
})

export default AddSheet;
