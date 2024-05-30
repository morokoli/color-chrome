import { FC, useState, useEffect } from "react";

type Props = {
  rankingRange: string,
  setRankingRange: (value: string) => void
}

export const RangeSlider: FC<Props> = (props) => {
  const [rangeNumber, setRangeNumber] = useState<string>("");
  
  useEffect(() => {
      setRangeNumber(props.rankingRange)
  },[])

  const onChangeRangeSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    props.setRankingRange(value);
    setRangeNumber(value);
  }


  return (
    <>
      <div className="range-container">
        <input 
          className="vertical-slider accent"
          type="range"
          min="0" 
          max="100"
          step="1"
          fill="black"
          value={rangeNumber}
          onChange={onChangeRangeSlider}
          {...({ orient: "vertical" } as any)}  
        />
        
      </div>
      <div className="ml-3 mt-[-10px]">
        <img src="/smile.svg" alt="Smile" width="30px" className="p-2" />
      </div>
      <span className="mt-[194px] ml-2">{rangeNumber}</span>
    </>
  );
}
