import { Box, Text } from '@shopify/polaris';

export default function ColorSwatch({
  label,
  color,
  onChange
}: {
  label: string;
  color: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        minWidth: '200px'
      }}
    >
      <div style={{ position: 'relative' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: color,
            border: '1px solid #ccc'
          }}
        />
        <input
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '40px',
            height: '40px',
            opacity: 0,
            cursor: 'pointer'
          }}
        />
      </div>
      <div>
        <Text variant="bodySm" as="p">
          {label}
        </Text>
        <p
          style={{
            fontSize: '12px',
            color: 'var(--p-color-text-subdued)',
            margin: 0
          }}
        >
          {color?.toUpperCase()}
        </p>
      </div>
    </div>
  );
}
