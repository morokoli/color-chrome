import { FC, useEffect, useRef, useState } from 'react';
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

  useEffect(() => {
    if (pickBtnRef.current) {
      pickBtnRef.current.pickColor();
    }
  }, []);

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

  return (
    <div className="w-[260px] bg-white rounded-md shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab(null)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-[13px] font-medium text-gray-800">Pick Color</span>
        </div>
        <button
          onClick={() => setTab('COMMENT')}
          className="p-1.5 hover:bg-gray-100 rounded transition-colors"
          title="History & Editor"
        >
          <History className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Color Preview & Values */}
      <div className="p-3">
        {color ? (
          <div className="flex gap-3">
            {/* Color swatch */}
            <div
              className="w-14 h-14 rounded-lg border border-gray-200 shrink-0"
              style={{ backgroundColor: color }}
            />

            {/* HEX/RGB/HSL values */}
            <div className="flex-1 space-y-1">
              {/* HEX */}
              <div className="flex items-center gap-1">
                <span className="w-7 text-[9px] text-gray-400">HEX</span>
                <div className="flex-1 px-1.5 py-0.5 text-[10px] font-mono border border-gray-200 rounded bg-gray-50 uppercase truncate">
                  {color}
                </div>
                <button
                  onClick={() => handleCopy(color, 'hex')}
                  className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                  title="Copy HEX"
                >
                  {copied && copiedType === 'hex' ? (
                    <Check size={11} className="text-emerald-500" />
                  ) : (
                    <Copy size={11} className="text-gray-400" />
                  )}
                </button>
              </div>
              {/* RGB */}
              <div className="flex items-center gap-1">
                <span className="w-7 text-[9px] text-gray-400">RGB</span>
                <div className="flex-1 px-1.5 py-0.5 text-[10px] font-mono border border-gray-200 rounded bg-gray-50 truncate">
                  {colors.hexToRGB(color)}
                </div>
                <button
                  onClick={() => handleCopy(colors.hexToRGB(color), 'rgb')}
                  className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                  title="Copy RGB"
                >
                  {copied && copiedType === 'rgb' ? (
                    <Check size={11} className="text-emerald-500" />
                  ) : (
                    <Copy size={11} className="text-gray-400" />
                  )}
                </button>
              </div>
              {/* HSL */}
              <div className="flex items-center gap-1">
                <span className="w-7 text-[9px] text-gray-400">HSL</span>
                <div className="flex-1 px-1.5 py-0.5 text-[10px] font-mono border border-gray-200 rounded bg-gray-50 truncate">
                  {colors.hexToHSL(color)}
                </div>
                <button
                  onClick={() => handleCopy(colors.hexToHSL(color), 'hsl')}
                  className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                  title="Copy HSL"
                >
                  {copied && copiedType === 'hsl' ? (
                    <Check size={11} className="text-emerald-500" />
                  ) : (
                    <Copy size={11} className="text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-14 text-[12px] text-gray-400">
            Pick a color to see it here
          </div>
        )}
      </div>

      {/* Pick Again Button */}
      <div className="px-3 pb-3">
        <button
          onClick={handlePickAgain}
          className="w-full flex items-center justify-center gap-2 py-2 text-[12px] bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
        >
          <Pipette className="w-4 h-4" />
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