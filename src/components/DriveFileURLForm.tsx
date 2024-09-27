import { FC, useEffect } from "react"
import { useForm } from "react-hook-form"
import { ErrorMessage } from "@hookform/error-message"
import { InputError } from "@/components/InputError"
import { Loader } from "./Loader"
import { sheets } from "@/helpers/sheets"
import { useAPI } from "@/hooks/useAPI"
import { config } from "@/others/config"
import {
  DriveFileGetByURLRequest,
  DriveFileGetByURLResponse,
} from "@/types/api"
import { Sheet } from "@/types/general"
import { useToast } from "@/hooks/useToast"
import { setCookie, getSheetUrlCookie } from '@/helpers/cookie'

type Props = {
  setFileInfo: (args: {
    spreadsheetId: string
    fileName: string
    url: string
    sheets: Sheet[]
  }) => void
}

type Form = {
  fileURL: string
}

const formValidators = {
  fileURL: {
    required: "File URL is required",
    pattern: {
      value: sheets.BASE_REGEX,
      message: "Please provide a valid Google Spreadsheet URL",
    },
  },
}

export const DriveFileURLForm: FC<Props> = (props) => {
  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors, isDirty, isValid },
  } = useForm<Form>()

  const toast = useToast()

  const { call, isStatusLoading } = useAPI<
    DriveFileGetByURLRequest,
    DriveFileGetByURLResponse
  >({
    url: config.api.endpoints.sheetGetByURL,
    method: "POST",
  })

  useEffect(() => {
    async function getCookie() {
      const sheetUrl = await getSheetUrlCookie();
      if (sheetUrl) {
        setValue("fileURL", sheetUrl, { shouldDirty: true, shouldValidate: true });
      }
    }
    getCookie();
  }, []);

  return (
    <form
      className="flex flex-col space-y-1"
      onSubmit={handleSubmit((form: Form) => {
        setCookie(config.cookie.cookieNameSheetUrl, form.fileURL);

        call({ url: form.fileURL })
          .then((data) => {
            props.setFileInfo({
              spreadsheetId: data.spreadsheet.spreadsheetId,
              fileName: data.spreadsheet.fileName,
              url: form.fileURL,
              sheets: data.spreadsheet.sheets,
            })
          })
          .catch(() =>
            toast.display("error", "Failed to fetch spreadsheet details"),
          )
      })}
    >
      <fieldset className="flex-1 flex">
        <input
          placeholder="Google Spreadsheet URL"
          className=" flex-1 px-3 py-2 text-xs bg-slate-200 rounded-l focus:outline-none border border-slate-200 focus:border-slate-700"
          type="url"
          required
          {...register("fileURL", formValidators.fileURL)}
        />

        <button
          className="bg-slate-800 disabled:opacity-75 rounded-r px-4 py-2 flex"
          disabled={!isDirty || !isValid}
        >
          <div className="flex m-auto space-x-2">
            {isStatusLoading && (
              <span className="my-auto">
                <Loader type="dark" size="small" />
              </span>
            )}
            <span className="text-white text-xs my-auto">Get spreadsheet</span>
          </div>
        </button>
      </fieldset>

      <ErrorMessage
        errors={errors}
        name="fileURL"
        render={({ message }) => <InputError message={message} />}
      />
    </form>
  )
}
