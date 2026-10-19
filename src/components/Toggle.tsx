import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-[27px] w-[46px] shrink-0 rounded-full transition-colors duration-150 ease-out ${
      checked ? 'bg-primary' : 'bg-[#D8DDD6]'}`
      }>
      
      <span
        className={`absolute top-[3px] h-[21px] w-[21px] rounded-full bg-white shadow-sm transition-transform duration-150 ease-out ${
        checked ? 'translate-x-[22px]' : 'translate-x-[3px]'}`
        } />
      
    </button>);

}