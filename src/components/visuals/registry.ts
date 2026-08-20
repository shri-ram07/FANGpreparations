import { lazy } from 'react'

// String key -> lazily-loaded interactive component. This map is the single
// source of truth: content data files reference visuals by key, and the
// VisualSection type in content/types.ts is DERIVED from this object — a
// typo'd key or wrong props in a content file is a compile error.
// Each entry is its own async chunk; an unused visual never loads.
//
// Adding a visual = one `lazy(() => import('./X'))` line here.
export const visuals = {
  AttentionHeatmap: lazy(() => import('./AttentionHeatmap')),
  BackpropStepper: lazy(() => import('./BackpropStepper')),
  BTreeExplorer: lazy(() => import('./BTreeExplorer')),
  BiasVarianceDial: lazy(() => import('./BiasVarianceDial')),
  BigOGrowthChart: lazy(() => import('./BigOGrowthChart')),
  BinarySearchStepper: lazy(() => import('./BinarySearchStepper')),
  CacheSimulator: lazy(() => import('./CacheSimulator')),
  ConfusionMatrixLab: lazy(() => import('./ConfusionMatrixLab')),
  ConsistentHashRing: lazy(() => import('./ConsistentHashRing')),
  ConvolutionPlayground: lazy(() => import('./ConvolutionPlayground')),
  DecisionBoundaryPlayground: lazy(() => import('./DecisionBoundaryPlayground')),
  GitBranchPlayground: lazy(() => import('./GitBranchPlayground')),
  GradientDescentSlider: lazy(() => import('./GradientDescentSlider')),
  GraphTraversal: lazy(() => import('./GraphTraversal')),
  JoinVisualizer: lazy(() => import('./JoinVisualizer')),
  KMeansStepper: lazy(() => import('./KMeansStepper')),
  NeuralNetForward: lazy(() => import('./NeuralNetForward')),
  NextTokenSampler: lazy(() => import('./NextTokenSampler')),
  OptimizerRace: lazy(() => import('./OptimizerRace')),
  PointerBoxDiagram: lazy(() => import('./PointerBoxDiagram')),
  PythonPlayground: lazy(() => import('./PythonPlayground')),
  RateLimiterSim: lazy(() => import('./RateLimiterSim')),
  RegularizationGeometry: lazy(() => import('./RegularizationGeometry')),
  SVMMarginExplorer: lazy(() => import('./SVMMarginExplorer')),
  SortingVisualizer: lazy(() => import('./SortingVisualizer')),
  TokenizerDemo: lazy(() => import('./TokenizerDemo')),
  VectorPlayground: lazy(() => import('./VectorPlayground')),
} as const

export type VisualKey = keyof typeof visuals
