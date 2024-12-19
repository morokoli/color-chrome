import { FC } from "react"
// import ColorCodeButtons from './ColorCodeButtons';

// interface Props {
//   selected: null | string;
//   copyToClipboard: (text: string, selection: null | string) => void
// }

// const Copy: FC<Props> = ({ selected, copyToClipboard }) => {

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
  {
    name: 'comment',
    placeholder: 'Comment',
  },
];


const Comment: FC = () => {
  function getRandomHexColor() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  }
  
  const randomColors = Array.from({ length: 47 }, getRandomHexColor);

  console.log('randomColors', randomColors)

  const Input = ({name, placeholder}: {name: string, placeholder: string}) => (
    <div className="w-full h-[24px] mb-2">
      <input className="w-full bg-slate-200 px-2 py-1 text-xs focus:outline-none border border-slate-200 focus:border-slate-700" name={name} placeholder={placeholder} />
    </div>
  );

  return (
    <div className="border-2 flex flex-col w-[275px] h-[350px] p-1.5">
      <div className="w-full h-[50px] flex flex-wrap justify-between mb-1.5">
        {randomColors.map(color => <div key={color} className='w-[15px] h-[15px] mr-[1px]' style={{ backgroundColor: color }} />)}
        <div className='delete-square' onClick={() => console.log('DELETE COLOR')}/>
      </div>

      {inputData.map(data => <Input name={data.name} placeholder={data.placeholder} />)}


    </div>
  )
}

export default Comment;
