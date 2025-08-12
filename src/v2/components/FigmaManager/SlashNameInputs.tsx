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
      <div className="flex mb-4 grid grid-cols-2 gap-2">
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
            className="border p-2"
          />
        ))}
        <button
          onClick={onChangeslash_naming}
          className="border p-2 bg-black text-white min-w-[154px]"
        >
          Change Slash Name
        </button>
      </div>
    </>
  )
}
