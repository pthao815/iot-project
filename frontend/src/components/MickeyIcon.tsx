interface MickeyIconProps {
  size?:      number;
  className?: string;
}

export function MickeyIcon({ size = 24, className = '' }: MickeyIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <circle cx="12" cy="14" r="7" />
      <circle cx="5"  cy="6"  r="4.5" />
      <circle cx="19" cy="6"  r="4.5" />
    </svg>
  );
}
