interface BackArrowIconProps {
  className?: string;
}

const BAR_GEOMETRY = [
  { x: 11, halfHeight: 4.5 },
  { x: 15.5, halfHeight: 7.5 },
  { x: 20, halfHeight: 12.5 },
  { x: 24.5, halfHeight: 17.5 },
  { x: 29, halfHeight: 13 },
  { x: 33.5, halfHeight: 9.5 },
  { x: 38, halfHeight: 22.5 },
  { x: 42.5, halfHeight: 15.5 },
  { x: 47, halfHeight: 10.5 },
  { x: 51.5, halfHeight: 6.5 },
  { x: 56, halfHeight: 4.5 },
  { x: 60.5, halfHeight: 7.5 },
  { x: 65, halfHeight: 11 },
  { x: 69.5, halfHeight: 7 },
  { x: 74, halfHeight: 4.5 },
  { x: 81.5, halfHeight: 3.5 },
  { x: 88.5, halfHeight: 2.5 },
  { x: 95.5, halfHeight: 3.5 },
  { x: 102.5, halfHeight: 2.75 },
] as const;

export function BackArrowIcon({ className = "" }: BackArrowIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 111 46"
      fill="none"
      className={`back-arrow-icon ${className}`}
      aria-hidden="true"
    >
      {BAR_GEOMETRY.map(({ x, halfHeight }) => (
        <line
          key={`${x}-${halfHeight}`}
          x1={x}
          x2={x}
          y1={23 - halfHeight}
          y2={23 + halfHeight}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
