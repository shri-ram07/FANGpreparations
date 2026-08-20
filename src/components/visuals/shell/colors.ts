// Categorical series colors for interactives, validated with the dataviz
// palette validator (lightness band, chroma floor, adjacent-pair CVD ΔE,
// normal-vision floor, 3:1 contrast on white). Do NOT reorder or eyeball-edit
// a slot — re-run the validator if you change anything. For <6 series take a
// PREFIX (adjacent pairs of a prefix are already validated). Single-series
// visuals just use the accent token. Colors follow the entity, never its rank.
export const CHART_SERIES = ['#2450E5', '#B45309', '#178A50', '#7C3AED', '#0284C7', '#D33A2C'] as const

// Recessive chart chrome (grid/axis text) — tokens, for reference in SVGs.
export const CHART_GRID = '#E4E6E1'
export const CHART_AXIS = '#5A5F6A'
