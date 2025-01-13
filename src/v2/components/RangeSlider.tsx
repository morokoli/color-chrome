import { FC, useState, useEffect } from 'react';

type Props = {
  disabled: boolean,
  value: number | string,
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  onChange: (e: any) => void
}

const RangeSlider: FC<Props> = ({ value, disabled, onChange }) => {
  const [rangeNumber, setRangeNumber] = useState<number>(0);
  
  useEffect(() => {
    setRangeNumber(+value)
  }, [value])

  const onChangeRangeSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    onChange(e);
    setRangeNumber(+value);
  }

  return (
    <div className="mt-4 mb-12">
      <div className="text-center">{rangeNumber || 0}</div>

      <div className="range-container">
        <input 
          className="accent w-full"
          type="range"
          min="0" 
          max="100"
          step="1"
          name="ranking"
          disabled={disabled}
          value={rangeNumber || 0}
          onChange={onChangeRangeSlider}
          /* eslint-disable  @typescript-eslint/no-explicit-any */
          {...({ orient: "vertical" } as any)}  
        />
        
      </div>
    </div>
  );
}

export default RangeSlider;
