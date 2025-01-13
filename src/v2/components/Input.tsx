import { FC } from 'react';
import { useGlobalState } from '@/v2/hooks/useGlobalState'

import { RemoveColumnButton } from './RemoveColumnButton';

interface InputProps {
  name: string;
  value?: string;
  disabled?: boolean;
  placeholder: string;
  hasRemoveBtn?: boolean;
  handleError?: () => void
  handleSuccess?: () => void
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Input: FC<InputProps> = ({ name, value, onChange, placeholder, disabled, handleSuccess, handleError, hasRemoveBtn }) => {
  const { state } = useGlobalState();
  const { files, selectedFile } = state;

  const selectedFileData = files.find(item => item.spreadsheetId === selectedFile);

  return (
    <div className="w-full h-[28px] mb-2 flex">
      <input
        type="text"
        name={name}
        value={value}
        disabled={disabled}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-slate-200 px-2 py-1 text-xs focus:outline-none border border-slate-200 focus:border-slate-700"
      />
      {hasRemoveBtn && (
        <RemoveColumnButton
          columnName={name}
          handleError={handleError!}
          spreadsheetId={selectedFile!}
          handleSuccess={handleSuccess!}
          sheetId={selectedFileData?.sheets?.[0]?.id || 0}
          sheetName={selectedFileData?.sheets?.[0]?.name || ''}
        />
      )}
    </div>
  )
};

export default Input;
