import { mod, type SubjectDef } from '../types'

export const math: SubjectDef = {
  id: 'math',
  title: 'Math for ML',
  short: 'M',
  why: 'A 3-week visual foundation, then just-in-time depth inside ML/DL modules.',
  prereqs: [],
  // Only L0 and L1 are used — this subject is a short visual foundation, not a 4-level grind.
  levelTitles: ['Linear algebra', 'Calculus, probability & optimization', '', ''],
  interviewThemes: [
    'Dot product = similarity',
    'Matrix as transformation',
    'Chain rule (backprop preview)',
    'Bayes reasoning on a scenario',
    'What a loss surface is',
  ],
  mindmapMarkdown: `- Math for ML
  - Vectors & dot product
    - Vector = arrow = list of numbers
    - Dot product measures similarity
  - Matrix = transformation
    - Rotate / scale / project
    - Eigen-intuition
  - Derivative & chain rule
    - Derivative = slope = sensitivity
    - Chain rule → backprop preview
    - Partial derivatives → gradient
  - Distributions & Bayes
    - Common distributions
    - Bayes theorem, visually
    - Expectation & variance, MLE idea
  - Gradient descent
    - Loss surface
    - Walking downhill blindfolded`,
  modules: [
    mod('math-l0-vectors-dot-product', 0, 'Vectors & the Dot Product (= Similarity)', 40, () => import('./l0-vectors-dot-product')),
    mod('math-l0-matrices-transformations', 0, 'Matrices as Transformations', 45, () => import('./l0-matrices-transformations')),
    mod('math-l1-calculus-gradients', 1, 'Slopes, Derivatives & the Gradient', 36, () => import('./l1-calculus-gradients')),
    mod('math-l1-probability-stats', 1, 'Probability and Statistics, Built From Counting', 52, () => import('./l1-probability-stats')),
  ],
}
