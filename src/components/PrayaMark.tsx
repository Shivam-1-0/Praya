// The Praya mark — two interlocked links. "Don't break the chain."
//
// The weave is real, not faked with a background-coloured stroke: each link is
// masked where the other passes over it, so the gaps are transparent and the
// mark sits correctly on ivory, white, or espresso. Colour comes from
// `currentColor`, so callers set it with a text-* utility.
//
// Geometry note: the two cap circles are 16 apart with r=13, which puts their
// intersections at (48, 37.75) and (48, 58.25) and makes the arcs cross at
// ~76°. Cap centres much closer than this leave the arcs near-concentric and
// the interlace stops reading at all.
//
// The mask ids are deterministic rather than useId()-generated. Every instance
// shares identical geometry in the same viewBox user space, so an id collision
// between two marks on one page resolves to a mask that is correct anyway —
// which keeps this a Server Component with no client JS.

const LINK_LEFT = "M23,35 H40 A13,13 0 0 1 40,61 H23 A13,13 0 0 1 23,35 Z";
const LINK_RIGHT = "M56,35 H73 A13,13 0 0 1 73,61 H56 A13,13 0 0 1 56,35 Z";
// The quarter-arc of each link that crosses *over* the other one. The left
// link wins the top crossing, the right link wins the bottom one.
const LEFT_OVER_TOP = "M40,35 A13,13 0 0 1 53,48";
const RIGHT_OVER_BOTTOM = "M56,61 A13,13 0 0 1 43,48";

const VIEW_BOX = "6 30 84 36";
const ASPECT = 36 / 84;

export function PrayaMark({
  width = 44,
  className,
  title = "Praya",
}: {
  width?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      width={width}
      height={Math.round(width * ASPECT)}
      viewBox={VIEW_BOX}
      fill="none"
      role="img"
      aria-label={title}
      className={className}
    >
      <defs>
        <mask
          id="prayaChainLeft"
          maskUnits="userSpaceOnUse"
          x="6"
          y="30"
          width="84"
          height="36"
        >
          <rect x="6" y="30" width="84" height="36" fill="#fff" />
          <path d={RIGHT_OVER_BOTTOM} stroke="#000" strokeWidth="11" fill="none" />
        </mask>
        <mask
          id="prayaChainRight"
          maskUnits="userSpaceOnUse"
          x="6"
          y="30"
          width="84"
          height="36"
        >
          <rect x="6" y="30" width="84" height="36" fill="#fff" />
          <path d={LEFT_OVER_TOP} stroke="#000" strokeWidth="11" fill="none" />
        </mask>
      </defs>

      <path
        d={LINK_LEFT}
        stroke="currentColor"
        strokeWidth="5"
        mask="url(#prayaChainLeft)"
      />
      <path
        d={LINK_RIGHT}
        stroke="currentColor"
        strokeWidth="5"
        mask="url(#prayaChainRight)"
      />
    </svg>
  );
}
