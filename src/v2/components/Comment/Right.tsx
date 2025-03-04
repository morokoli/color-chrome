import { FC, useState, useEffect } from "react"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { useToast } from "@/v2/hooks/useToast"

import Input from "../Input"
import Select from "../Select"
import RangeSlider from "../RangeSlider"
import AddColumnForm from "../AddColumnForm"

import logoIcon from "@/v2/assets/images/logo.png"

type initialState = {
  url: string
  ranking: number
  comments: string
  slashNaming: string
  tags: string
}

interface Props {
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  formData: any
  setTab: (tab: string | null) => void
  selectedColor: null | number
  initialState: initialState
  handleSave: () => void
  loading: boolean
  checkValidFlag: boolean
  setFormData: (value: any) => void
  setCheckValidFlag: (value: boolean) => void
}

const colData = [
  {
    name: "url",
    placeholder: "Url",
  },
  {
    name: "slashNaming",
    placeholder: "Slash Naming ex: a/b/c",
  },
  {
    name: "tags",
    placeholder: "Tags ex: a/b/c or a, b, c",
  },
]

const additionalColumns = [{ name: "comments" }, { name: "ranking" }]

const Right: FC<Props> = ({
  setTab,
  selectedColor,
  initialState,
  handleSave,
  loading,
  formData,
  setFormData,
  checkValidFlag,
  setCheckValidFlag,
}) => {
  const toast = useToast()
  const [error, setError] = useState<boolean>(false)

  const { state, dispatch } = useGlobalState()
  const { selectedFile, parsedData, newColumns } = state
  const isDisable = !selectedFile || selectedColor === null

  const openFileHandler = () => {
    const fileUrl = import.meta.env.VITE_SPREADSHEET_URL + selectedFile
    window.open(fileUrl, "_blank")
  }

  const openLink = () => {
    window.open("https://colorswithyou.com/", "_blank")
  }

  const handleChange = (event: any) => {
    const { name, value } = event.target

    setFormData((prevState: any) => ({
      ...prevState,
      [name]: value,
    }))
  }

  const getAdditionalColumns = (columns: any) => {
    const obj = columns.reduce((acc: any, curr: any) => {
      acc[curr.name] = curr.value
      return acc
    }, {})
    return obj
  }

  const getInputValue = (inputName: string) => {
    const valuesArr = parsedData.filter(
      (_data, index) => selectedColor === index,
    )
    const transformedArr = valuesArr.map((item) => ({
      ...item,
      ...getAdditionalColumns(item.additionalColumns),
    }))
    const filtered = transformedArr.map((color: any) => color?.[inputName])
    const inputString = filtered[0] || ""

    setFormData((prevState: any) => ({
      ...prevState,
      [inputName]: inputString,
    }))
  }

  const handleSuccessRemoveColumn = (colName: string) => {
    const newColumnsArr = state?.newColumns?.filter(
      (column) => column.name !== colName,
    )
    dispatch({ type: "CLEAR_NEW_COLUMNS" })

    if (newColumnsArr.length > 0) {
      newColumnsArr.forEach((column) =>
        dispatch({ type: "ADD_NEW_COLUMN", payload: column }),
      )
    }
  }

  const handleErrorRemoveColumn = () => {
    toast.display("error", "Something went wrong, please relogin and try again")
  }

  useEffect(() => {
    const colNamesArr = [...colData, ...additionalColumns, ...newColumns]

    if (selectedColor !== null && parsedData.length !== 0) {
      colNamesArr.forEach((data) => getInputValue(data.name))
    } else {
      setFormData(initialState)
    }
  }, [selectedColor, parsedData])

  useEffect(() => {
    if (!selectedFile) {
      setFormData(initialState)
    }
  }, [selectedFile])

  return (
    <div className="flex flex-col w-[245px] min-h-[370px] pr-[15px] pt-[15px] pb-[5px] relative">
      <div className="flex justify-between mb-3">
        <div className="flex items-center">
          <div className="h-[27px] w-[30px] mr-0.5">
            <img src={logoIcon} alt="pick" className="w-full h-full" />
          </div>

          <a
            href="https://colorswithyou.com/"
            className="text-[10px] underline text-blue-600"
            onClick={openLink}
          >
            colorswithyou.com
          </a>
        </div>
        <button
          onClick={openFileHandler}
          disabled={!selectedFile}
          className="h-[40px] w-[85px] text-black text-[14px] border border-solid border-black"
        >
          {"Go to sheet"}
        </button>
      </div>
      <Select
        isComment
        setTab={setTab}
        ckeckFlag={checkValidFlag}
        setCheckValidFlag={setCheckValidFlag}
        placeholder="Add Google Sheet to Save Colors"
      />
      {colData.map((data) => (
        <Input
          error={error}
          key={data.name}
          name={data.name}
          setError={setError}
          disabled={isDisable}
          onChange={handleChange}
          value={formData[data.name]}
          placeholder={data.placeholder}
        />
      ))}
      <textarea
        name="comments"
        placeholder="Comment"
        disabled={isDisable}
        onChange={handleChange}
        value={formData["comments"]}
        className="w-full h-[24px] mb-3 min-h-[25px] bg-slate-200 px-2 py-1 text-xs focus:outline-none border border-slate-200 focus:border-slate-700"
      />
      {state?.newColumns?.map((data, index) => (
        <Input
          name={data.name}
          hasRemoveBtn
          disabled={isDisable}
          key={data.name + index}
          placeholder={data.name}
          onChange={handleChange}
          value={formData[data.name] || ""}
          handleError={handleErrorRemoveColumn}
          handleSuccess={() => handleSuccessRemoveColumn(data.name)}
        />
      ))}
      <AddColumnForm disabled={!selectedFile} />
      <RangeSlider
        disabled={isDisable}
        onChange={handleChange}
        value={+formData["ranking"]}
      />

      <div className="flex absolute bottom-1.5  justify-between w-[93%]">
        <button
          onClick={() => setTab(null)}
          className="h-[40px] w-[85px] text-black text-[14px] border border-solid border-black"
        >
          Back
        </button>

        <button
          onClick={() => handleSave()}
          disabled={isDisable || error}
          className="h-[40px] w-[85px] text-white text-[14px] bg-black disabled:bg-gray-400"
        >
          {loading ? "Loading..." : "Save"}
        </button>
      </div>
    </div>
  )
}

export default Right
