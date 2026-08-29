// shared motion tokens — tuned calm/subtle: lower stiffness, higher damping,
// no overshoot, gentle expo eases. one place to set the feel of the whole lab.

export const spring = {
  // position slides, pills, connectors, shared-layout
  glide: { type: 'spring', stiffness: 190, damping: 30 } as const,
  // reveals, expands, content
  soft: { type: 'spring', stiffness: 160, damping: 26 } as const,
  // big / heavy / stacked moves — slow and weighty
  gentle: { type: 'spring', stiffness: 130, damping: 28, mass: 1.1 } as const,
}

export const ease = {
  out: [0.22, 1, 0.36, 1] as [number, number, number, number],
  inOut: [0.45, 0, 0.25, 1] as [number, number, number, number],
}

export const dur = { fast: 0.35, base: 0.5, slow: 0.7 }
