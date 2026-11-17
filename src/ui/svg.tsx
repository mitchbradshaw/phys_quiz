// Small SVG helpers shared by the space scenes: a seeded starfield, the dark "space" panel, vector arrows and
// pointer dragging in SVG coordinates.
import { useMemo, useRef, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from 'react';
import { makeRng } from '../engine/rng';
import { SimTags } from './blockkit';

export function Stars({ w, h, n = 120, seed = 7 }: { w: number; h: number; n?: number; seed?: number }) {
  const stars = useMemo(() => {
    const r = makeRng(seed);
    return Array.from({ length: n }, () => ({ x: r.uniform(0, w), y: r.uniform(0, h), r: r.uniform(0.3, 1.2), o: r.uniform(0.2, 0.8) }));
  }, [w, h, n, seed]);
  return (
    <g aria-hidden="true">
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="var(--star)" opacity={s.o} />
      ))}
    </g>
  );
}

type Corner = 'tl' | 'tr' | 'bl' | 'br';
const CORNER: Record<Corner, React.CSSProperties> = {
  tl: { left: 8, top: 8 },
  tr: { right: 8, top: 8 },
  bl: { left: 8, bottom: 8 },
  br: { right: 8, bottom: 8 },
};

/** A window into space: dark in both themes, with stars. Children are drawn inside the SVG. */
export function SpacePanel({
  w,
  h,
  ariaLabel,
  children,
  tags,
  tagsAt = 'tl',
  stars = 120,
  seed = 7,
  svgRef,
  overlay,
}: {
  w: number;
  h: number;
  ariaLabel: string;
  children: ReactNode;
  tags?: (string | false | null | undefined)[];
  tagsAt?: Corner;
  stars?: number;
  seed?: number;
  svgRef?: RefObject<SVGSVGElement>;
  overlay?: ReactNode;
}) {
  return (
    <div className="space" style={{ position: 'relative' }}>
      <svg ref={svgRef} viewBox={`0 0 ${w} ${h}`} className="anim" role="img" aria-label={ariaLabel}>
        {stars > 0 && <Stars w={w} h={h} n={stars} seed={seed} />}
        {children}
      </svg>
      {tags && tags.some(Boolean) && (
        <div style={{ position: 'absolute', pointerEvents: 'none', ...CORNER[tagsAt] }}>
          <SimTags items={tags} />
        </div>
      )}
      {overlay}
    </div>
  );
}

/** An arrow from (x1, y1) to (x2, y2) with a solid head; nothing is drawn when it is shorter than ~1.5 px. */
export function Vec({
  x1,
  y1,
  x2,
  y2,
  color,
  width = 2.5,
  head = 9,
  label,
  labelOffset = 12,
  dash,
  opacity,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width?: number;
  head?: number;
  label?: ReactNode;
  labelOffset?: number;
  dash?: string;
  opacity?: number;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const L = Math.hypot(dx, dy);
  if (!(L > 1.5)) return null;
  const ux = dx / L;
  const uy = dy / L;
  const hs = Math.min(head, L * 0.6);
  const bx = x2 - ux * hs;
  const by = y2 - uy * hs;
  const px = -uy * hs * 0.5;
  const py = ux * hs * 0.5;
  return (
    <g opacity={opacity}>
      <line x1={x1} y1={y1} x2={bx + ux} y2={by + uy} stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={dash} />
      <polygon points={`${x2.toFixed(1)},${y2.toFixed(1)} ${(bx + px).toFixed(1)},${(by + py).toFixed(1)} ${(bx - px).toFixed(1)},${(by - py).toFixed(1)}`} fill={color} />
      {label !== undefined && (
        <text x={x2 + ux * labelOffset} y={y2 + uy * labelOffset + 4} textAnchor="middle" className="plot-note" fill={color} fontWeight={700}>
          {label}
        </text>
      )}
    </g>
  );
}

/** Pointer position in the user space of the element that received the event. */
export function svgCoords(e: { clientX: number; clientY: number; currentTarget: EventTarget }): { x: number; y: number } {
  const el = e.currentTarget as SVGGraphicsElement;
  const m = el.getScreenCTM();
  if (!m) return { x: 0, y: 0 };
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
  return { x: p.x, y: p.y };
}

export type DragPhase = 'start' | 'move' | 'end';

/**
 * Spread these on an SVG element to drag on it: onDrag receives the pointer in that element's coordinates.
 * The latest onDrag is always used, so it may close over fresh state.
 */
export function useSvgDrag(onDrag: (p: { x: number; y: number }, phase: DragPhase) => void) {
  const active = useRef(false);
  const cb = useRef(onDrag);
  cb.current = onDrag;
  return useMemo(
    () => ({
      onPointerDown: (e: ReactPointerEvent<SVGElement>) => {
        active.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        e.preventDefault();
        cb.current(svgCoords(e), 'start');
      },
      onPointerMove: (e: ReactPointerEvent<SVGElement>) => {
        if (active.current) cb.current(svgCoords(e), 'move');
      },
      onPointerUp: (e: ReactPointerEvent<SVGElement>) => {
        if (!active.current) return;
        active.current = false;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* already released */
        }
        cb.current(svgCoords(e), 'end');
      },
      onPointerCancel: () => {
        active.current = false;
      },
      style: { cursor: 'pointer', touchAction: 'none' } as React.CSSProperties,
    }),
    []
  );
}
