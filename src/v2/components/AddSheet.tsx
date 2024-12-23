import { FC, useState } from "react"
import Input from "./common/Input";
// import { useGlobalState } from "@/v2/hooks/useGlobalState"

// interface Props {
//   setTab: (tab: string | null) => void;
// }

// const AddSheet: FC<Props> = ({ setTab }) => {
const AddSheet: FC = () => {
  const [isExisting, setIsExisting] = useState(true);
  // const { dispatch } = useGlobalState()

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
        <div className="">
          <Input key='url' name='url' placeholder="Past URL" />
          <Input key='tab' name='tab' placeholder="Select Tab"  />
        </div>
      )}
      {!isExisting && (
        <div className="">
          <Input key='sheetName' name='sheetName' placeholder="Sheet Name" />
          <Input key='tabName' name='tabName' placeholder="Tab Name"  />
        </div>
      )}

      <div className="w-full flex justify-end">
        <button
          onClick={() => {}}
          className="h-[40px] w-[100px] text-white text-[16px] bg-black"
        >
          {isExisting ? 'Add' : 'Create'}
        </button>
      </div>

    </div>
  )
}

export default AddSheet;
