import { FC } from 'react';
import { useGlobalState } from '@/v2/hooks/useGlobalState'

import { RemoveColumnButton } from './RemoveColumnButton';

interface InputProps {
  name: string;
  value?: string;
  error?: boolean;
  disabled?: boolean;
  placeholder: string;
  hasRemoveBtn?: boolean;
  handleError?: () => void;
  handleSuccess?: () => void;
  setError?: (value: boolean) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Input: FC<InputProps> = ({ name, value, onChange, placeholder, disabled, handleSuccess, handleError, hasRemoveBtn, error, setError }) => {
  const { state } = useGlobalState();
  const { files, selectedFile } = state;

  const selectedFileData = files.find(item => item.spreadsheetId === selectedFile);

  // a/b/c, without spaces, max 3 "/"
  const regex = /^[a-zA-Z0-9]*(\/[a-zA-Z0-9]+){0,3}$/;

  const handleValidate = () => {
    if (name !== 'slashNaming' || !setError) return
      if (regex.test(value!)) {
        setError(false)
      } else {
        setError(true)
      }
  };

  return (
    <div className="w-full h-[28px] mb-3 flex relative">
      <input
        type="text"
        name={name}
        value={value || ''}
        disabled={disabled}
        onChange={onChange}
        onBlur={handleValidate}
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
      {name === 'slashNaming' && error && (
        <div className='text-[10px] text-red-500 absolute bottom-[-13px]'>
          {'Format a/b/c, no spaces, max 3 "/"'}
        </div>
      )}
    </div>
  )
};

export default Input;
