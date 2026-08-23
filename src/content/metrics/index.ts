import { mod, type SubjectDef } from '../types'

export const metrics: SubjectDef = {
  id: 'metrics',
  title: 'Metrics & Losses',
  short: 'M&L',
  why: 'The #1 topic where candidates get exposed. "Why this loss?" is a guaranteed FAANG question.',
  prereqs: ['ml'],
  levelTitles: ['Loss vs metric', 'Losses (what the model optimizes)', 'Metrics (how humans judge)', 'Advanced metrics & case studies'],
  interviewThemes: [
    'Accuracy 99% but model useless — why?',
    'F1 vs accuracy',
    'ROC-AUC vs PR-AUC on imbalance',
    'Design a metric for YouTube recommendations',
    'Why cross-entropy over MSE for classification (gradient argument)',
  ],
  mindmapMarkdown: `- Metrics & Losses
  - Loss vs metric
    - Loss: differentiable, model optimizes it
    - Metric: humans judge with it
  - Regression losses
    - MSE vs MAE vs Huber
    - Quantile loss
  - Classification losses
    - Binary / categorical cross-entropy
    - Focal loss, hinge loss
    - KL divergence, perplexity
  - Confusion-matrix family
    - Precision, recall, F1
    - Micro vs macro vs weighted
  - Curves
    - ROC & AUC
    - PR curve — for imbalance
  - Unsupervised metrics
    - Inertia, silhouette score
    - ARI / NMI
  - Ranking & GenAI metrics
    - Precision@K, MAP, NDCG
    - BLEU, ROUGE, perplexity; IoU, mAP`,
  modules: [
    mod('metrics-l0-loss-vs-metric', 0, 'Loss vs Metric', 20, () => import('./l0-loss-vs-metric')),
    mod('metrics-l1-regression-losses', 1, 'Regression Losses: MSE, MAE, Huber, Quantile', 22, () => import('./l1-regression-losses')),
    mod('metrics-l1-classification-losses', 1, 'Classification Losses: Cross-Entropy, Focal, Hinge', 22, () => import('./l1-classification-losses')),
    mod('metrics-l1-metric-learning-losses', 1, 'Contrastive and Triplet Loss', 20, () => import('./l1-metric-learning-losses')),
    mod('metrics-l2-confusion-matrix', 2, 'The Confusion Matrix', 22, () => import('./l2-confusion-matrix')),
    mod('metrics-l2-roc-pr-curves', 2, 'ROC, AUC and PR Curves', 22, () => import('./l2-roc-pr-curves')),
    mod('metrics-l2-regression-metrics', 2, 'Regression Metrics: RMSE, MAE, R² and MAPE', 22, () => import('./l2-regression-metrics')),
    mod('metrics-l3-unsupervised-metrics', 3, 'Judging a Clustering With No Labels', 20, () => import('./l3-unsupervised-metrics')),
    mod('metrics-l3-ranking-metrics', 3, 'Ranking Metrics: Precision@K, MAP and NDCG', 20, () => import('./l3-ranking-metrics')),
    mod('metrics-l3-genai-cv-metrics', 3, 'Text Generation Metrics: Perplexity, BLEU and ROUGE', 22, () => import('./l3-genai-cv-metrics')),
    mod('metrics-l3-vision-metrics', 3, 'IoU and mAP for Object Detection', 22, () => import('./l3-vision-metrics')),
    mod('metrics-l3-generative-objectives', 3, 'Generative Objectives: Reconstruction, ELBO and GANs', 22, () => import('./l3-generative-objectives')),
    mod('metrics-l3-pick-the-metric', 3, 'Pick the Metric: Four Cases', 22, () => import('./l3-pick-the-metric')),
  ],
}
