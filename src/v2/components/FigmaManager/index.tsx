
import Left from "./Left"
import Right from "./Right"

interface Props {
    setTab: (tab: string | null) => void;
  }

const FigmaManager: React.FC<Props> = ({setTab}) => {
  return (
    <div className="border-2 flex w-[800px] h-full max-h-[600px] overflow-hidden">
      <div className="flex-1 min-w-0 overflow-y-auto">
        <Left setTab={setTab}/>
      </div>
      <div className="flex-1 min-w-0 overflow-y-auto">
        <Right />
      </div>
    </div>
  )
}

export default FigmaManager
