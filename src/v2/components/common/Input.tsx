const Input = ({name, placeholder}: {name: string, placeholder: string}) => (
  <div className="w-full h-[24px] mb-2">
    <input className="w-full bg-slate-200 px-2 py-1 text-xs focus:outline-none border border-slate-200 focus:border-slate-700" name={name} placeholder={placeholder} />
  </div>
);

export default Input;
