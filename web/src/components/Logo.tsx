/** ReyCam mark: a camera whose lens holds a lightning bolt. */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="ReyCam">
      <rect width="64" height="64" rx="16" fill="#6E1A35" />
      <rect x="18" y="13" width="15" height="8" rx="3" fill="#F6E7D8" />
      <rect x="9" y="19" width="46" height="32" rx="9" fill="#F6E7D8" />
      <circle cx="32" cy="35" r="12.5" fill="#6E1A35" />
      <circle cx="32" cy="35" r="9.5" fill="#3A0B1B" />
      <path d="M34.5 25.5 L26.5 36.5 H31.5 L29.5 45 L38 33.5 H33 Z" fill="#FFC857" />
      <circle cx="47.5" cy="26" r="2.6" fill="#FFC857" />
    </svg>
  );
}

export function Wordmark({ size = 24 }: { size?: number }) {
  return (
    <span className="wordmark" style={{ fontSize: size }}>
      Rey<span className="wordmark-cam">Cam</span>
    </span>
  );
}
