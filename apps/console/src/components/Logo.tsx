export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="canyou-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c8cff" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <path d="M16 2l12 7v14l-12 7-12-7V9z" fill="url(#canyou-g)" />
      <circle cx="16" cy="16" r="5" fill="#0a0c10" />
    </svg>
  );
}
