import { useId } from "react";
import type { Texture } from "@/lib/catalog";

// Code-drawn Tej jar: glass body, jute-cloth lid tied with twine, round label.
// Placeholder for real product photography; swap in <Image> when photos exist.

const BODY =
  "M52 62H148V70Q148 78 160 80Q166 82 166 96V214Q166 234 146 234H54Q34 234 34 214V96Q34 82 40 80Q52 78 52 70Z";

const CLOTH =
  "M46 40Q100 20 154 40L158 62Q167 75 163 92L152 86L143 94L132 87L121 95L109 88L97 96L85 88L73 95L61 87L50 94L37 90Q33 75 42 62Z";

const TOP = 92;
const BOTTOM = 234;

export function Jar({
  fill,
  fillDeep,
  texture = "powder",
  level = 0.9,
  className,
  label = true,
  title,
}: {
  fill: string;
  fillDeep: string;
  texture?: Texture;
  level?: number;
  className?: string;
  label?: boolean;
  title?: string;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const h = (BOTTOM - TOP) * Math.min(1, Math.max(0, level));
  const surfaceY = BOTTOM - h;
  const mound = texture === "powder" ? 7 : texture === "paste" ? 4 : 0;

  return (
    <svg
      viewBox="0 0 200 250"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <clipPath id={`b${id}`}>
          <path d={BODY} />
        </clipPath>
        <linearGradient id={`f${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={fillDeep} />
          <stop offset="0.35" stopColor={fill} />
          <stop offset="0.7" stopColor={fill} />
          <stop offset="1" stopColor={fillDeep} />
        </linearGradient>
        <radialGradient id={`h${id}`} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#FFE2A0" stopOpacity="0.75" />
          <stop offset="1" stopColor={fill} stopOpacity="0" />
        </radialGradient>
        <filter id={`g${id}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency={texture === "ghee" ? 0.55 : 1.1}
            numOctaves="2"
            seed="7"
          />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues={texture === "ghee" ? "0 0.28" : "0 0.42"} />
          </feComponentTransfer>
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
        <pattern id={`w${id}`} width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="#C9A469" />
          <path d="M0 1h4M0 3h4" stroke="#A9834A" strokeWidth="0.7" opacity="0.6" />
          <path d="M1 0v4M3 0v4" stroke="#E2C48C" strokeWidth="0.7" opacity="0.55" />
        </pattern>
        <filter id={`s${id}`} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      <ellipse cx="100" cy="238" rx="72" ry="7" fill="#2B2410" opacity="0.22" filter={`url(#s${id})`} />

      {/* glass */}
      <path d={BODY} fill="#FFFFFF" fillOpacity="0.38" />
      <g clipPath={`url(#b${id})`}>
        <g className="jar-fill" style={{ transform: `translateY(${surfaceY - TOP}px)` }}>
          <path
            d={`M20 ${TOP + mound}Q100 ${TOP - mound} 180 ${TOP + mound}V${BOTTOM + 200}H20Z`}
            fill={`url(#f${id})`}
          />
          {texture === "honey" ? (
            <path
              d={`M20 ${TOP}Q100 ${TOP - 3} 180 ${TOP}V${BOTTOM + 200}H20Z`}
              fill={`url(#h${id})`}
            />
          ) : (
            <path
              d={`M20 ${TOP + mound}Q100 ${TOP - mound} 180 ${TOP + mound}V${BOTTOM + 200}H20Z`}
              fill="#3A2A12"
              filter={`url(#g${id})`}
              style={{ mixBlendMode: "multiply" }}
            />
          )}
        </g>
        <rect x="44" y="98" width="7" height="118" rx="3.5" fill="#FFFFFF" opacity="0.5" />
        <rect x="150" y="104" width="3" height="96" rx="1.5" fill="#FFFFFF" opacity="0.35" />
      </g>
      <path d={BODY} fill="none" stroke="#FFFFFF" strokeOpacity="0.8" strokeWidth="2" />
      <path d={BODY} fill="none" stroke="#1D2A1B" strokeOpacity="0.14" strokeWidth="1" />

      {/* label */}
      {label && (
        <g>
          <circle cx="100" cy="163" r="39" fill="#FFFDF7" />
          <circle cx="100" cy="163" r="39" fill="none" stroke="#1F4D2E" strokeWidth="3.2" />
          <circle cx="100" cy="163" r="33.5" fill="none" stroke="#1F4D2E" strokeWidth="0.8" opacity="0.6" />
          <path d="M80 140q6-6 10 0q-6 3-10 0zM120 140q-6-6-10 0q6 3 10 0z" fill="#4F8A3A" />
          <text
            x="100"
            y="167"
            textAnchor="middle"
            fontFamily="var(--font-script), cursive"
            fontSize="27"
            fill="#1F4D2E"
          >
            Tej
          </text>
          <rect x="72" y="172" width="56" height="10" rx="2" fill="#1F4D2E" />
          <text
            x="100"
            y="179.6"
            textAnchor="middle"
            fontFamily="var(--font-display), sans-serif"
            fontSize="6.6"
            fontWeight="700"
            letterSpacing="1.2"
            fill="#FFFDF7"
          >
            ORGANICS
          </text>
          <path d="M90 190h20" stroke="#E8A514" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      )}

      {/* jute cloth lid */}
      <path d={CLOTH} fill={`url(#w${id})`} />
      <path d={CLOTH} fill="none" stroke="#8C6634" strokeOpacity="0.45" strokeWidth="1" />
      <path d="M58 36Q100 24 142 36" stroke="#F0D9A8" strokeWidth="3" fill="none" opacity="0.6" strokeLinecap="round" />
      <path
        d="M52 88v6M64 88v7M76 90v6M88 90v6M100 91v6M112 90v6M124 90v6M136 89v6M146 88v6"
        stroke="#A9834A"
        strokeWidth="1.2"
        opacity="0.7"
      />
      {/* twine + bow */}
      <path d="M40 66Q100 80 160 66" stroke="#6F4F27" strokeWidth="3" fill="none" />
      <path d="M40 70Q100 84 160 70" stroke="#86622F" strokeWidth="2" fill="none" />
      <path d="M100 75q-16-12-20 0q4 8 20 0zM100 75q16-12 20 0q-4 8-20 0z" fill="none" stroke="#6F4F27" strokeWidth="2.6" />
      <path d="M99 76q-5 10-10 18M101 76q5 10 9 19" stroke="#6F4F27" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="100" cy="75.5" r="3.2" fill="#5B3F1D" />
    </svg>
  );
}
