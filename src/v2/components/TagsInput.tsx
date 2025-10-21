import { FC, useState, useEffect } from 'react'

interface TagsInputProps {
  name: string
  value?: string
  disabled?: boolean
  placeholder: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const TagsInput: FC<TagsInputProps> = ({
  name,
  value = '', 
  disabled,
  placeholder,
  onChange
}) => {
  const [tags, setTags] = useState<string[]>([])
  const [inputValue, setInputValue] = useState('')

  // Инициализируем теги из value
  useEffect(() => {
    if (value) {
      const tagsArray = value.split(',').map(tag => tag.trim()).filter(tag => tag)
      setTags(tagsArray)
    } else {
      setTags([])
    }
  }, [value])


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag()
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      removeTag(tags.length - 1)
    }
  }

  const addTag = () => {
    const newTag = inputValue.trim()
    if (newTag && !tags.includes(newTag)) {
      const tagsString = [...tags, newTag].join(", ")
      const syntheticEvent = {
        target: {
          name,
          value: tagsString,
        },
      } as React.ChangeEvent<HTMLInputElement>
      onChange(syntheticEvent)
      setTags([...tags, newTag])
      setInputValue('')
    }
  }

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index))
  }

  const handleBlur = () => {
    if (inputValue.trim()) {
      addTag()
    }
  }

  return (
    <div className="w-full mb-3">
      <div className="flex flex-wrap gap-2 mb-2 min-h-[28px] p-2 bg-slate-200 border border-slate-200 focus-within:border-slate-700">
        {tags.map((tag, index) => (
          <div
            key={index}
            className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs"
          >
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(index)}
              disabled={disabled}
              className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >
              ×
            </button>
          </div>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={tags.length === 0 ? placeholder : "Add tag..."}
          className="flex-1 min-w-[120px] bg-transparent text-xs focus:outline-none"
        />
      </div>
    </div>
  )
}

export default TagsInput
