import { FC } from "react"
import AddColumnForm from "./AddColumnForm";
import RangeSlider from "./RangeSlider";
import Input from "./common/Input";
import { useGlobalState } from "@/v2/hooks/useGlobalState"

import logoIcon from "@/v2/assets/images/logo.png"

// interface Props {
//   selected: null | string;
//   copyToClipboard: (text: string, selection: null | string) => void
// }


const inputData = [
  {
    name: 'url',
    placeholder: 'Url',
  },
  {
    name: 'slashNaming',
    placeholder: 'Slash Naming',
  },
  {
    name: 'projecyName',
    placeholder: 'Project or Brand Name',
  },
];


const Comment: FC = () => {
  const { state } = useGlobalState();

  return (
    <div className="border-2 flex flex-col w-[275px] min-h-[350px] p-1.5 relative">
      <div className="w-full h-[47px] flex flex-wrap mb-1.5 relative content-start">
        {state.colorHistory.map(color => <div key={color} className='w-[15px] h-[15px] mr-[1px] mb-[1px]' style={{ backgroundColor: color }} />)}
        <div className='delete-square' onClick={() => console.log('DELETE COLOR')}/>
      </div>

      {inputData.map(data => <Input key={data.name} name={data.name} placeholder={data.placeholder} />)}

      <textarea
        className="w-full h-[24px] mb-2 min-h-[25px] bg-slate-200 px-2 py-1 text-xs focus:outline-none border border-slate-200 focus:border-slate-700"
        name='comment'
        placeholder='Comment'
      />

      <AddColumnForm />

      <RangeSlider/>

      <div className="flex absolute bottom-1.5  justify-between w-[95%]">

      <div className="flex items-center">
        <div className="h-[27px] w-[30px] mr-1.5">
          <img src={logoIcon} alt="pick" className="w-full h-full" />
        </div>

        <a href='https://colorwithyou.com/' className="text-xs underline text-blue-600">
          colorwithyou.com
        </a>
      </div>

      <button
        onClick={() => {}}
        className="h-[40px] w-[100px] text-white text-[16px] bg-black"
      >
        Save
      </button>

      </div>

    </div>
  )
}

export default Comment;
