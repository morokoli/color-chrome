import {useCallback, forwardRef, useImperativeHandle } from 'react';
import { AddColorRequest, AddColorResponse } from '@/v2/types/api';
import { useGlobalState } from '@/v2/hooks/useGlobalState';
import { useToast } from '@/v2/hooks/useToast';
import { getPageURL } from '@/v2/helpers/url';
import { colors } from '@/v2/helpers/colors';
import { config } from '@/v2/others/config';
import useEyeDropper from 'use-eye-dropper';
import { useAPI } from '@/v2/hooks/useAPI';

import pickIcon from '@/v2/assets/images/icons/menu/pick.svg';

interface Props {
  copyToClipboard?: (text: string, selection: null | string) => void;
  onSuccess?: () => void;
  onClick?: () => void;
}

export interface PickBtnRef {
  pickColor: () => void;
}

// Використовуємо forwardRef із RefAttributes<Props>
const PickBtn = forwardRef<PickBtnRef, Props>(({ copyToClipboard, onSuccess, onClick }, ref) => {
  const toast = useToast();
  const { open } = useEyeDropper();
  const { state, dispatch } = useGlobalState();
  const { color, files, selectedFile } = state;
  const isIconInvert = color && colors.isDark(color);
  const btnClassnames = copyToClipboard ? 'h-[40px] w-[100px]' : 'h-full w-full';

  const addColor = useAPI<AddColorRequest, AddColorResponse>({
    url: config.api.endpoints.addColor,
    method: "POST",
    jwtToken: state.user?.jwtToken,
  });

  const selectedFileData = files.find(file => file.spreadsheetId === selectedFile);

  const addColorToFile = (color: string) => {
    getPageURL().then((url) => {
      addColor
        .call({
          spreadsheetId: selectedFile!,
          sheetName: selectedFileData?.sheets?.[0]?.name || '',
          sheetId: selectedFileData?.sheets?.[0]?.id || null!,
          row: {
            timestamp: new Date().valueOf(),
            url: url!,
            hex: color,
            hsl: colors.hexToHSL(color),
            rgb: colors.hexToRGB(color),
            comments: '',
            ranking: '',
            slash_naming: '',
            tags: '',
            additionalColumns: [],
          },
        })
        .then(() => {
          if (onSuccess) onSuccess();
          toast.display("success", "Color saved successfully");
        })
        .catch((err) => toast.display("error", err));
    });
  };

  // const openPicker = async () => {
  //   try {
  //     const color = await open();
  //     dispatch({ type: "SET_COLOR", payload: color.sRGBHex });
  //     dispatch({ type: "ADD_COLOR_HISTORY", payload: color.sRGBHex });
  //     copyToClipboard?.(color.sRGBHex, "HEX");

  //     if (selectedFile) {
  //       addColorToFile(color.sRGBHex);
  //     }
  //   } catch (e) {
  //     console.log(e);
  //   }
  // };

  const openPicker = async () => {
    try {
      const color = await open();
      dispatch({ type: "SET_COLOR", payload: color.sRGBHex });
      dispatch({ type: "ADD_COLOR_HISTORY", payload: color.sRGBHex });
  
      // 🎯 Додаємо колір у файл
      if (selectedFile) {
        dispatch({
          type: "ADD_FILE_COLOR_HISTORY",
          payload: {
            spreadsheetId: selectedFile,
            color: color.sRGBHex,
          },
        });
  
        addColorToFile(color.sRGBHex);
      }
  
      copyToClipboard?.(color.sRGBHex, "HEX");
    } catch (e) {
      console.log(e);
    }
  };
  

  const pickColor = useCallback(() => {
    openPicker();
  }, [open]);

  const onCLickHandler = () => (onClick ? onClick() : pickColor());

  // Додаємо можливість викликати pickColor() через ref
  useImperativeHandle(ref, () => ({
    pickColor,
  }));

  return (
    <div
      id="pickBtn"
      onClick={onCLickHandler}
      className={`flex items-center cursor-pointer border-2 justify-center ${btnClassnames}`}
      style={{ backgroundColor: color! }}
    >
      <div className={`h-[35px] w-[35px] ${isIconInvert && 'filter invert'}`}>
        <img src={pickIcon} alt="pick" className="h-full w-full" />
      </div>
    </div>
  );
});

export default PickBtn;