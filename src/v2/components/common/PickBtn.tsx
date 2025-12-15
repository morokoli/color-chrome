import { useCallback, forwardRef, useImperativeHandle, useEffect } from 'react';
import { AddColorRequest, AddColorResponse } from '@/v2/types/api';
import { useGlobalState } from '@/v2/hooks/useGlobalState';
import { useToast } from '@/v2/hooks/useToast';
import { getPageURL } from '@/v2/helpers/url';
import { colors } from '@/v2/helpers/colors';
import { config } from '@/v2/others/config';
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

  const addColorToFile = (pickedColor: string) => {
    getPageURL().then((url) => {
      addColor
        .call({
          spreadsheetId: selectedFile!,
          sheetName: selectedFileData?.sheets?.[0]?.name || '',
          sheetId: selectedFileData?.sheets?.[0]?.id ?? 0,
          row: {
            timestamp: new Date().valueOf(),
            url: url!,
            hex: pickedColor,
            hsl: colors.hexToHSL(pickedColor),
            rgb: colors.hexToRGB(pickedColor),
            comments: '',
            ranking: '',
            slash_naming: '',
            tags: [],
            additionalColumns: [],
          },
        })
        .then(() => {
          if (onSuccess) onSuccess();
        })
        .catch((err) => toast.display("error", err));
    });
  };

  // Handle picked color from storage (set by content script via background)
  const handlePickedColor = useCallback((pickedColor: string) => {
    dispatch({ type: "SET_COLOR", payload: pickedColor });
    dispatch({ type: "ADD_COLOR_HISTORY", payload: pickedColor });

    // Add to file color history locally (even if not logged in)
    if (selectedFile) {
      dispatch({
        type: "ADD_FILE_COLOR_HISTORY",
        payload: {
          spreadsheetId: selectedFile,
          color: pickedColor,
        },
      });

      // Only sync to Google Sheets if user is logged in
      if (state.user?.jwtToken) {
        addColorToFile(pickedColor);
      }
    }

    copyToClipboard?.(pickedColor, "HEX");
  }, [selectedFile, state.user?.jwtToken, copyToClipboard, dispatch]);

  // Listen for color picked from magnifier
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.pickedColor?.newValue) {
        handlePickedColor(changes.pickedColor.newValue);
        // Clear the stored color
        chrome.storage.local.remove(['pickedColor', 'pickedAt']);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    // Check if there's a pending color from before popup opened
    chrome.storage.local.get(['pickedColor', 'pickedAt'], (result) => {
      if (result.pickedColor && result.pickedAt) {
        // Only use if picked within last 5 seconds
        if (Date.now() - result.pickedAt < 5000) {
          handlePickedColor(result.pickedColor);
        }
        chrome.storage.local.remove(['pickedColor', 'pickedAt']);
      }
    });

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [handlePickedColor]);

  const openPicker = async () => {
    // Send message to background to start color picker
    chrome.runtime.sendMessage({ type: 'START_COLOR_PICKER' }, (response) => {
      if (response?.error) {
        toast.display("error", response.error);
      } else {
        // Close popup so it doesn't appear in the screenshot
        // Color will be retrieved when popup reopens
        window.close();
      }
    });
  };

  const pickColor = useCallback(() => {
    openPicker();
  }, []);

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