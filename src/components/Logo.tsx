// The PULSE mark: a pulse/signal waveform (the core metaphor — something
// spiking into view) inside a rounded badge with a violet→magenta
// gradient, plus a small ping dot at the peak to read as "live". Kept to
// plain <path>/<circle> with no <filter> blur, so it stays crisp when
// exported as a static favicon, not just inline in the app.
export default function Logo({
  size = 32,
  variant = "mark",
  className,
}: {
  size?: number;
  variant?: "mark" | "full";
  className?: string;
}) {
  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="PULSE"
    >
      <defs>
        <linearGradient id="pulse-grad" x1="2" y1="2" x2="46" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7c5cff" />
          <stop offset="1" stopColor="#ff4d8d" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="13" fill="url(#pulse-grad)" />
      <path
        d="M7 25.5H15L18.5 15L24.5 34L28.5 19.5L31.5 25.5H41"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="24.5" cy="15" r="2.6" fill="white" />
    </svg>
  );

  if (variant === "mark") return mark;

  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      {mark}
      <span className="text-base font-bold tracking-tight text-foreground">PULSE</span>
    </span>
  );
}
