// Physical constants. Values on the QCAA Physics 2025 formula and data book are used exactly as printed there;
// radii (not on the sheet) and Mars come from NASA's planetary fact sheets.

/** Gravitational constant (N m² kg⁻²). */
export const G = 6.67e-11;
/** Mean acceleration due to gravity at Earth's surface (m s⁻²). */
export const g0 = 9.8;
/** Speed of light (m s⁻¹). */
export const c = 3e8;

export interface Body {
  id: string;
  name: string;
  /** Mass (kg). */
  M: number;
  /** Mean radius (m). */
  R: number;
  /** Drawing colour. */
  color: string;
}

export const EARTH: Body = { id: 'earth', name: 'Earth', M: 5.97e24, R: 6.37e6, color: '#2f6fa3' };
export const MOON: Body = { id: 'moon', name: 'Moon', M: 7.35e22, R: 1.74e6, color: '#8d8d8d' };
export const MARS: Body = { id: 'mars', name: 'Mars', M: 6.42e23, R: 3.39e6, color: '#b5532f' };
export const SUN: Body = { id: 'sun', name: 'Sun', M: 1.99e30, R: 6.96e8, color: '#f2b84b' };
