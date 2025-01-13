import { FC } from "react"
import classNames from "classnames"
import { ModeTab } from "@/v1/types/general"

export type Tab = {
  type: ModeTab
  title: string
}

type Props = {
  tabs: Tab[]
  selected: string
  setSelected: (selected: ModeTab) => void
}

export const Tabs: FC<Props> = (props) => {
  return (
    <div className="flex">
      {props.tabs.map((tab) => (
        <button
          key={tab.type}
          onClick={() => props.setSelected(tab.type)}
          className={classNames(
            "flex-1 px-3 py-2 text-xs text-slate-800 bg-slate-200 border-b-2",
            {
              "border-slate-800": tab.type === props.selected,
              "border-slate-300": tab.type !== props.selected,
            },
          )}
        >
          {tab.title}
        </button>
      ))}
    </div>
  )
}
