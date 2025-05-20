
import Left from "./Left"
import Right from "./Right"

interface Props {
    setTab: (tab: string | null) => void;
  }

const FigmaManager: React.FC<Props> = ({setTab}) => {
  return (
    <div className="border-2 flex w-[800px] max-h-[566px] h-full">
      <div className="flex-1 min-w-0 overflow-y-scroll">
        <Left setTab={setTab}/>
      </div>
      <div className="flex-1 min-w-0 overflow-y-scroll">
        <Right />
      </div>
    </div>
  )
}

export default FigmaManager
