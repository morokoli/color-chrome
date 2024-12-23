import { FC, useState } from "react";
// import { FC, useState, useEffect } from "react";

// type Props = {
//   rankingRange: number | string,
//   setRankingRange: (value: number) => void
// }

// const RangeSlider: FC<Props> = (props) => {
const RangeSlider: FC = () => {
  const [rangeNumber, setRangeNumber] = useState<number>(0);
  
  // useEffect(() => {
  //   setRangeNumber(+props.rankingRange)
  // }, [props.rankingRange])

  const onChangeRangeSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // props.setRankingRange(+value);
    setRangeNumber(+value);
  }

  return (
    <div className="mt-4">
      <div className="text-center">{rangeNumber}</div>

      <div className="range-container">
        <input 
          className="accent w-full"
          type="range"
          min="0" 
          max="100"
          step="1"
          // fill="black"
          value={rangeNumber}
          onChange={onChangeRangeSlider}
          /* eslint-disable  @typescript-eslint/no-explicit-any */
          {...({ orient: "vertical" } as any)}  
        />
        
      </div>
    </div>
  );
}

export default RangeSlider;
