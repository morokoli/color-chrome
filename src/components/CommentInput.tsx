import { FC } from "react"

type Props = {
  currentValue: string
  setCurrentValue: (value: string) => void
}

export const CommentInput: FC<Props> = (props) => {
  return (
    <fieldset className="flex">
      <label
        className="w-40 bg-slate-300 text-xs text-slate-800 py-2 px-3 my-auto rounded-l"
        title="Comment"
      >
        Comment
      </label>
      <input
        type="text"
        className="flex-1 bg-slate-200 rounded-r px-2 py-1 text-xs text-slate-800 focus:outline-none border border-slate-200 focus:border-slate-700"
        placeholder="Color comments"
        onChange={(e) => props.setCurrentValue(e.target.value)}
        value={props.currentValue}
      />
    </fieldset>
  )
}
