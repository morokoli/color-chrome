interface SlashNameInputsProps {
  inputs: string[]
  onInputChange: (inputs: string[]) => void
  onChangeslash_naming: () => void
}

// Slash Name Inputs Component
export const SlashNameInputs = ({
  inputs,
  onInputChange,
  onChangeslash_naming,
}: SlashNameInputsProps) => {
  return (
    <>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {inputs.map((value, index) => (
          <input
            key={index}
            type="text"
            value={value}
            onChange={(e) => {
              const updated = [...inputs]
              updated[index] = e.target.value
              onInputChange(updated)
            }}
            placeholder={`Slash Name ${index + 1}`}
            className="px-3 py-2 text-[12px] border border-gray-200 rounded focus:outline-none focus:border-gray-400"
          />
        ))}
        <button
          onClick={onChangeslash_naming}
          className="px-3 py-2 text-[12px] bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
        >
          Change Slash Name
        </button>
      </div>
    </>
  )
}
