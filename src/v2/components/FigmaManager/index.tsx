
import Left from "./Left"
import Right from "./Right"

interface Props {
    setTab: (tab: string | null) => void;
  }

const FigmaManager: React.FC<Props> = () => {
  return (
    <div className="border-2 flex w-[800px] h-[600px] overflow-hidden">
      <div className="flex-1 min-w-0 overflow-y-auto">
        <Left/>
      </div>
      <div className="flex-1 min-w-0 overflow-y-auto">
        <Right />
      </div>
    </div>
  )
}

export default FigmaManager
