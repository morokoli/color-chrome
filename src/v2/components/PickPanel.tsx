import { FC, useRef, useState } from 'react';
import { useGlobalState } from '@/v2/hooks/useGlobalState';
import { colors } from '@/v2/helpers/colors';
import { ArrowLeft, Pipette, Copy, Check, History } from 'lucide-react';

import PickBtn, { PickBtnRef } from './common/PickBtn';

interface Props {
  selected: null | string;
  setTab: (tab: string | null) => void;
  copyToClipboard: (text: string, selection: null | string) => void;
}

const PickPanel: FC<Props> = ({ setTab, copyToClipboard }) => {
  const { state } = useGlobalState();
  const { color } = state;
  const pickBtnRef = useRef<PickBtnRef | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedType, setCopiedType] = useState('');

  const handleCopy = (value: string, type: string) => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setCopiedType(type);
    copyToClipboard(value, type);
    setTimeout(() => {
      setCopied(false);
      setCopiedType('');
    }, 1500);
  };

  const handlePickAgain = () => {
    if (pickBtnRef.current) {
      pickBtnRef.current.pickColor();
    }
  };

  const displayColor = color || '#ffffff';

  return (
    <div className="w-[270px] bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab(null)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-gray-600" />
          </button>
          <span className="text-[13px] font-medium text-gray-800">Pick Color</span>
        </div>
        <button
          onClick={() => setTab('COMMENT')}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title="History & Editor"
        >
          <History className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>

      {/* Color Display */}
      <div className="p-3">
        {color ? (
          <div className="flex gap-3">
            {/* Color Swatch */}
            <div
              className="w-[72px] h-[72px] rounded-md border border-gray-200 shrink-0"
              style={{ backgroundColor: displayColor }}
            />

            {/* HEX/RGB/HSL Values */}
            <div className="flex-1 space-y-1.5">
              {/* HEX */}
              <div className="flex items-center gap-1.5">
                <span className="w-8 text-[11px] text-gray-400">HEX</span>
                <div className="flex-1 px-2 py-1 text-[11px] font-mono border border-gray-200 rounded bg-gray-50 uppercase">
                  {displayColor}
                </div>
                <button
                  onClick={() => handleCopy(displayColor, 'hex')}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  {copied && copiedType === 'hex' ? (
                    <Check size={12} className="text-emerald-500" />
                  ) : (
                    <Copy size={12} className="text-gray-400" />
                  )}
                </button>
              </div>

              {/* RGB */}
              <div className="flex items-center gap-1.5">
                <span className="w-8 text-[11px] text-gray-400">RGB</span>
                <div className="flex-1 px-2 py-1 text-[11px] font-mono border border-gray-200 rounded bg-gray-50">
                  {colors.hexToRGB(displayColor)}
                </div>
                <button
                  onClick={() => handleCopy(colors.hexToRGB(displayColor), 'rgb')}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  {copied && copiedType === 'rgb' ? (
                    <Check size={12} className="text-emerald-500" />
                  ) : (
                    <Copy size={12} className="text-gray-400" />
                  )}
                </button>
              </div>

              {/* HSL */}
              <div className="flex items-center gap-1.5">
                <span className="w-8 text-[11px] text-gray-400">HSL</span>
                <div className="flex-1 px-2 py-1 text-[11px] font-mono border border-gray-200 rounded bg-gray-50">
                  {colors.hexToHSL(displayColor)}
                </div>
                <button
                  onClick={() => handleCopy(colors.hexToHSL(displayColor), 'hsl')}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  {copied && copiedType === 'hsl' ? (
                    <Check size={12} className="text-emerald-500" />
                  ) : (
                    <Copy size={12} className="text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[72px] text-[12px] text-gray-400">
            Pick a color to see values here
          </div>
        )}
      </div>

      {/* Pick Another Color Button */}
      <div className="px-3 pb-3">
        <button
          onClick={handlePickAgain}
          className="w-full flex items-center justify-center gap-2 py-2 text-[12px] bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
        >
          <Pipette className="w-3.5 h-3.5" />
          Pick Another Color
        </button>
      </div>

      {/* Hidden PickBtn for functionality */}
      <div className="hidden">
        <PickBtn ref={pickBtnRef} copyToClipboard={copyToClipboard} />
      </div>
    </div>
  );
};

export default PickPanel;