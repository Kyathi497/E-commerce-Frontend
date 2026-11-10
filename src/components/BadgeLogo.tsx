import { useId } from "react";

// Typographic stand-in for the Tej Organics badge. The official badge (child in
// namaste) should replace this once a clean vector/PNG is supplied:
// put it at /public/brand/tej-badge.png and render it via next/image here.
export function BadgeLogo({ className, title = "Tej Organics" }: { className?: string; title?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <path id={`a${id}`} d="M18 60a42 42 0 0 0 84 0" />
      </defs>
      <circle cx="60" cy="60" r="58" fill="#FFFDF7" />
      <circle cx="60" cy="60" r="56" fill="none" stroke="#1F4D2E" strokeWidth="4" />
      <circle cx="60" cy="60" r="50" fill="none" stroke="#E8A514" strokeWidth="1.4" />
      {/* leaf sprigs */}
      <g fill="#4F8A3A">
        <path d="M30 40q8-10 16-4q-8 8-16 4z" />
        <path d="M36 30q10-6 15 2q-10 5-15-2z" />
        <path d="M90 40q-8-10-16-4q8 8 16 4z" />
        <path d="M84 30q-10-6-15 2q10 5 15-2z" />
      </g>
      <circle cx="60" cy="30" r="5" fill="#E8A514" />
      <text
        x="60"
        y="66"
        textAnchor="middle"
        fontFamily="var(--font-script), cursive"
        fontSize="34"
        fill="#1F4D2E"
      >
        Tej
      </text>
      <path d="M30 70h60l-4 6 4 6H30l4-6z" fill="#1F4D2E" />
      <text
        x="60"
        y="78.8"
        textAnchor="middle"
        fontFamily="var(--font-display), sans-serif"
        fontSize="7.6"
        fontWeight="700"
        letterSpacing="1.2"
        fill="#FFFDF7"
      >
        ORGANICS
      </text>
      <text fontFamily="var(--font-sans), sans-serif" fontSize="6" fontWeight="700" letterSpacing="1.2" fill="#1F4D2E">
        <textPath href={`#a${id}`} startOffset="50%" textAnchor="middle">
          PURE · NATURAL · HEALTHY
        </textPath>
      </text>
    </svg>
  );
}
