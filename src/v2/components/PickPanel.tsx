import { FC, useRef, useState, useEffect } from 'react';
import { useGlobalState } from '@/v2/hooks/useGlobalState';
import classNames from 'classnames';
import { MoreVertical } from 'lucide-react';

import PickBtn, { PickBtnRef } from './common/PickBtn';
import ColorCodeButtons from './ColorCodeButtons';

import homeIcon from '@/v2/assets/images/icons/home.svg';
import commentIcon from '@/v2/assets/images/icons/menu/comment.svg';

type PickMode = 'page' | 'browser';

interface Props {
  selected: null | string;
  setTab: (tab: string | null) => void;
  copyToClipboard: (text: string, selection: null | string) => void;
  lastPickSource?: 'eyedropper' | 'magnifier' | null;
  onPickAgain?: () => void | Promise<void>;
  onPickColor?: () => void;
  onPickColorFromBrowser?: () => void;
}

const STORAGE_KEY = 'pickPanelMode';

const PickPanel: FC<Props> = ({
  setTab,
  selected,
  copyToClipboard,
  lastPickSource,
  onPickAgain,
  onPickColor,
  onPickColorFromBrowser,
}) => {
  const { state } = useGlobalState();
  const { color } = state;
  const pickBtnRef = useRef<PickBtnRef | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const [pickMode, setPickMode] = useState<PickMode>(() => {
    // Show icon matching how user picked: eyedropper → Monitor, magnifier → Pipette
    if (lastPickSource === 'eyedropper') return 'browser';
    if (lastPickSource === 'magnifier') return 'page';
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'page' || stored === 'browser') return stored;
    } catch (_) {}
    return 'page';
  });

  const prevSourceRef = useRef(lastPickSource);
  // Sync pickMode when lastPickSource changes (e.g. async load from storage), don't override user switch
  useEffect(() => {
    if (lastPickSource !== prevSourceRef.current) {
      prevSourceRef.current = lastPickSource;
      if (lastPickSource === 'eyedropper') setPickMode('browser');
      else if (lastPickSource === 'magnifier') setPickMode('page');
    }
  }, [lastPickSource]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, pickMode);
    } catch (_) {}
  }, [pickMode]);

  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(() => {
    const stored = localStorage.getItem('pickPanelIsOpen');
    return stored !== null ? JSON.parse(stored) : true;
  });

  useEffect(() => {
    localStorage.setItem('pickPanelIsOpen', JSON.stringify(isPanelOpen));
  }, [isPanelOpen]);


  const handlePickClick = () => {
    if (pickMode === 'page') {
      (onPickColor || (() => pickBtnRef.current?.pickColor()))();
    } else {
      (onPickColorFromBrowser || onPickAgain)?.();
    }
  };

  const handleSwitchMode = () => {
    setPickMode((m) => (m === 'page' ? 'browser' : 'page'));
    setMenuOpen(false);
  };

  return (
    <div
      id="container"
      className={`${isPanelOpen ? 'w-fit' : 'w-[320px]'} h-[50px] border-2 flex items-center justify-between`}
    >
      <div className="ml-3 mr-3 flex items-center">
        <PickBtn
          ref={pickBtnRef}
          copyToClipboard={copyToClipboard}
          onClick={handlePickClick}
          pickMode={pickMode}
        />
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="h-[40px] w-[32px] flex items-center justify-center cursor-pointer border border-transparent hover:border-gray-300 rounded"
            title="Options"
            aria-label="Options"
          >
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </button>
          {menuOpen && (
            <div
              className={`absolute left-full top-[2px] bg-white border border-gray-200 rounded shadow-lg z-50 ${pickMode === 'page' ? "min-w-[130px]" : "min-w-[130px]"}`}
              role="menu"
            >
              <button
                type="button"
                onClick={handleSwitchMode}
                className="w-full px-3 py-2 text-left text-[11px] text-gray-700 hover:bg-gray-100"
                role="menuitem"
              >
                {pickMode === 'page' ? 'Pick from browser' : 'Pick from desktop'}
              </button>
            </div>
          )}
        </div>
      </div>

      <ColorCodeButtons
        color={color || '#ffffff'}
        isPanelOpen={isPanelOpen}
        selected={selected}
        copyToClipboard={copyToClipboard}
      />

      <button
        onClick={() => setTab('COMMENT')}
        className="h-[40px] w-[60px] border-2 text-white text-[20px] mr-3 flex justify-center"
        title="History & Editor"
      >
        <img src={commentIcon} alt="comment" className="h-[40px] w-[40px]" />
      </button>

      <div className="h-full w-[60px] border-l-2 border-black flex items-center justify-center">
        <div
          className="h-[40px] w-[40px] cursor-pointer"
          onClick={() => setTab(null)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setTab(null);
            }
          }}
          title="Back to menu"
        >
          <img src={homeIcon} alt="home" className="h-full w-full" />
        </div>
      </div>
      <div
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        className={classNames(
          'cursor-pointer arrow',
          isPanelOpen ? 'right' : 'left'
        )}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsPanelOpen((o) => !o);
          }
        }}
        title={isPanelOpen ? 'Collapse' : 'Expand'}
      />
    </div>
  );
};

export default PickPanel;
