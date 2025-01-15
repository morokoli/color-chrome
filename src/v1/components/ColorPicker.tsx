import { FC, useCallback } from "react"
import classNames from "classnames"
import { ColorCodeButtons } from "./ColorCodeButtons"
import { colors } from "@/v1/helpers/colors"
import useEyeDropper from "use-eye-dropper";

type Props = {
  disabled: boolean
  currentColor: string
  handleChange: (color: string) => void
}

export const ColorPicker: FC<Props> = (props) => {
  const { open, isSupported } = useEyeDropper();
  const pickColor = useCallback(() => {
    const openPicker = async () => {
      try {
        const color = await open();
        props.handleChange(color.sRGBHex);
      } catch (e) {
        console.log(e);
      }
    };
    openPicker();
  }, [open]);

  return (
    <fieldset className="flex flex-col">
      {isSupported() ? (
        <div
        className="w-100 h-8 bg-slate-300 hover:opacity-80 p-1 rounded-t cursor-pointer"
        onClick={pickColor}
      >
        <div
          className="h-full w-full flex rounded-t"
          style={{ backgroundColor: props.currentColor }}
        >
          <span
            className={classNames("m-auto text-xs", {
              "text-white": colors.isDark(props.currentColor),
              "text-zinc-900": !colors.isDark(props.currentColor),
            })}
          >
            Pick color
          </span>
        </div>
      </div>
      ): 'EyeDropper API not supported in this browser' }
      <div className="pt-1">
        <ColorCodeButtons color={props.currentColor} />
      </div>
    </fieldset>
  )
}
