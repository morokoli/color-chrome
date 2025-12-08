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
    if (name !== 'slash_naming' || !setError) return
      if (regex.test(value!)) {
        setError(false)
      } else {
        setError(true)
      }
  };

  return (
    <div className="w-full flex relative">
      <input
        type="text"
        name={name}
        value={value || ''}
        disabled={disabled}
        onChange={onChange}
        onBlur={handleValidate}
        placeholder={placeholder}
        className="w-full h-9 px-3 text-[12px] bg-white border border-gray-200 rounded-md focus:outline-none focus:border-gray-400 disabled:bg-gray-50 disabled:text-gray-400 placeholder:text-gray-400 transition-colors"
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
      {name === 'slash_naming' && error && (
        <div className='text-[10px] text-red-500 absolute -bottom-4'>
          {'Format a/b/c, no spaces, max 3 "/"'}
        </div>
      )}
    </div>
  )
};

export default Input;
