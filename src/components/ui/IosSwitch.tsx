import { motion } from 'framer-motion';

interface IosSwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}

/** Переключатель в стиле iOS: 51×31, зелёный #34C759, пружинный бегунок */
export function IosSwitch({ checked, onChange, label }: IosSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 ease-out ${
      checked ? 'bg-[#34C759]' : 'bg-[#E3E5E1]'}`
      }>
      
      <motion.span
        initial={false}
        animate={{ x: checked ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 700, damping: 38 }}
        className="absolute left-0 top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.16)]" />
      
    </button>);

}
