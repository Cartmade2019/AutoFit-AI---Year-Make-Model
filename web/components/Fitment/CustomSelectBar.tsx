import { useState } from 'react';
import { Colors } from '../Fitment/Appereance';

interface Option {
  label: string;
  value: string;
}

interface CustomSelectBarProps {
  theme?: 'light' | 'dark';
  options: Option[];
  value: string;
  onChange?: (newValue: string) => void;
  label?: React.ReactNode;
  layout?: 'horizontal' | 'vertical';
  colors?: Colors;
}

export function CustomSelectBar({
  theme = 'light',
  options,
  value,
  onChange,
  label,
  layout,
  colors
}: CustomSelectBarProps) {
  const isDark = theme === 'dark';
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const shouldUseNarrowWidth = label !== undefined && onChange !== undefined;

  const computedWidth =
    layout === 'vertical'
      ? '100%'
      : shouldUseNarrowWidth
      ? '100%'
      : '100%';

  const handleToggle = () => {
    if (onChange) setIsOpen((prev) => !prev);
  };

  const handleOptionClick = (optionValue: string) => {
    if (onChange) {
      onChange(optionValue);
      setIsOpen(false);
    }
  };

  const selectedOption = options?.find((opt) => opt.value === value);
  const isSelected = isOpen;

  return (
    <div
      style={{
        position: 'relative',
        width: computedWidth,
        fontFamily: 'sans-serif'
      }}
    >
      {label && (
        <div
          style={{
            marginBottom: '4px',
            fontSize: '14px',
            color: '#000',
            fontWeight: 600
          }}
        >
          {label}
        </div>
      )}

      <div
        onClick={handleToggle}
        style={{
          padding: '8px',
          border: '1px solid #ccc',
          borderRadius: '8px',
          cursor: 'pointer',
          backgroundColor: isDark ? '#000' : '#fff',
          color: isDark ? '#fff' : '#333'
        }}
      >
        {selectedOption ? selectedOption.label : '2024'}
      </div>

      {isOpen && onChange && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: isDark ? '#000' : '#fff',
            color: isDark ? '#fff' : '#000',
            borderLeft: isDark ? '#444' : '#ccc',
            borderRight: isDark ? '#444' : '#ccc',
            borderBottom: isDark ? '#444' : '#ccc',
            borderBottomLeftRadius: '8px',
            borderBottomRightRadius: '8px',
            zIndex: 9999,
            maxHeight: '150px',
            overflowY: 'auto'
          }}
        >
          {options.map((option) => (
            <div key={option.value} onClick={() => handleOptionClick(option.value)}>
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
