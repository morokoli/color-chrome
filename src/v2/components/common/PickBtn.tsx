import { useCallback, forwardRef, useImperativeHandle } from 'react';
import { useGlobalState } from '@/v2/hooks/useGlobalState';
import { useToast } from '@/v2/hooks/useToast';
import { colors } from '@/v2/helpers/colors';
import { Pipette, Monitor } from 'lucide-react';

import pickIcon from '@/v2/assets/images/icons/menu/pick.svg';

type PickMode = 'page' | 'browser';

interface Props {
  copyToClipboard?: (text: string, selection: null | string) => void;
  onSuccess?: () => void;
  onClick?: () => void;
  /** When set, shows Pipette (page) or Monitor (browser) icon instead of default */
  pickMode?: PickMode;
}

export interface PickBtnRef {
  pickColor: () => void;
}

// Використовуємо forwardRef із RefAttributes<Props>
const PickBtn = forwardRef<PickBtnRef, Props>(({ copyToClipboard, onClick, pickMode }, ref) => {
  const toast = useToast();
  const { state } = useGlobalState();
  const { color } = state;
  const isIconInvert = color && colors.isDark(color);
  const btnClassnames = copyToClipboard ? 'h-[40px] w-[100px]' : 'h-full w-full';

  // Note: Database saving is handled by App.tsx to avoid duplicate saves
  // This component only handles UI state updates

  // Note: Color picking and saving is handled entirely by App.tsx
  // This component only provides the UI button to trigger the picker
  // No need to listen to storage events here to avoid duplicate processing

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

  const iconClass = `h-[35px] w-[35px] ${isIconInvert && 'filter invert'}`;

  return (
    <div
      id="pickBtn"
      onClick={onCLickHandler}
      className={`flex items-center cursor-pointer border-2 justify-center ${btnClassnames}`}
      style={{ backgroundColor: color! }}
      title={pickMode === 'page' ? 'Pick color' : pickMode === 'browser' ? 'Pick color outside browser' : 'Pick color'}
    >
      <div className={iconClass}>
        {pickMode === 'page' ? (
          <Pipette className="h-full w-full" strokeWidth={2} />
        ) : pickMode === 'browser' ? (
          <Monitor className="h-full w-full" strokeWidth={2} />
        ) : (
          <img src={pickIcon} alt="pick" className="h-full w-full" />
        )}
      </div>
    </div>
  );
});

export default PickBtn;