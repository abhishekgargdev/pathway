export default function PathwayLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="32" r="4" fill="#5EEAD4" opacity="0.5" />
      <circle cx="20" cy="20" r="5" fill="#5EEAD4" />
      <circle cx="32" cy="10" r="4" fill="#8B7CF6" />
      <line x1="8" y1="32" x2="20" y2="20" stroke="#5EEAD4" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <line x1="20" y1="20" x2="32" y2="10" stroke="url(#lg)" strokeWidth="2" strokeLinecap="round" />
      <defs>
        <linearGradient id="lg" x1="20" y1="20" x2="32" y2="10" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5EEAD4" />
          <stop offset="1" stopColor="#8B7CF6" />
        </linearGradient>
      </defs>
    </svg>
  );
}
