import { mod, type SubjectDef } from '../types'

export const ml: SubjectDef = {
  id: 'ml',
  title: 'Machine Learning',
  short: 'ML',
  why: 'Core of the AIML role. FAANG ML rounds test intuition + math + tradeoffs, not library calls.',
  prereqs: ['python', 'math'],
  levelTitles: ['The mental model', 'Supervised: Regression', 'Supervised: Classification', 'Unsupervised + the rest'],
  interviewThemes: [
    'Bias–variance on a scenario',
    'L1 vs L2 regularization',
    'Why Random Forest over one deep tree',
    'Gradient boosting vs bagging',
    'K-Means failure cases',
    'PCA assumptions',
    'Spotting data leakage',
    'Model great offline, fails in prod — debug it',
  ],
  mindmapMarkdown: `- Machine Learning
  - Learning setup & bias–variance
    - Train / val / test, generalization
    - Underfitting vs overfitting
  - Regression family
    - Linear → polynomial
    - Ridge (L2) vs Lasso (L1)
  - Classification family
    - Logistic regression, sigmoid
    - k-NN, Naive Bayes, SVM
    - Decision trees (entropy / Gini)
  - Ensembles
    - Bagging → Random Forest
    - Boosting → XGBoost / LightGBM
    - Stacking
  - Unsupervised family
    - K-Means, hierarchical, DBSCAN
    - GMM + EM
    - PCA, t-SNE / UMAP
  - Feature engineering & CV
    - Scaling per algorithm
    - Encoding, leakage traps
    - k-fold, stratified, time-series split
  - Tuning
    - Grid / random / Bayesian (Optuna)`,
  modules: [
    mod('ml-l0-learning-setup', 0, 'What a Model Is, and Why Data Is Split Three Ways', 22, () => import('./l0-learning-setup')),
    mod('ml-l0-overfitting-bias-variance', 0, 'Overfitting, Underfitting & the Bias–Variance Trade-off', 20, () => import('./l0-overfitting-bias-variance')),
    mod('ml-l1-gradient-descent', 1, 'Gradient Descent', 24, () => import('./l1-gradient-descent')),
    mod('ml-l1-regression-regularization', 1, 'Regularisation: Ridge and Lasso', 26, () => import('./l1-regression-regularization')),
    mod('ml-l2-logistic-regression', 2, 'Logistic Regression', 24, () => import('./l2-logistic-regression')),
    mod('ml-l2-knn', 2, 'k-Nearest Neighbours', 22, () => import('./l2-knn')),
    mod('ml-l2-naive-bayes', 2, 'Naive Bayes', 20, () => import('./l2-naive-bayes')),
    mod('ml-l2-svm', 2, 'SVM and the Kernel Trick', 26, () => import('./l2-svm')),
    mod('ml-l2-decision-trees', 2, 'Decision Trees', 24, () => import('./l2-decision-trees')),
    mod('ml-l2-bagging-random-forest', 2, 'Bagging and Random Forest', 22, () => import('./l2-bagging-random-forest')),
    mod('ml-l2-boosting', 2, 'Boosting: Gradient Boosting and AdaBoost', 24, () => import('./l2-boosting')),
    mod('ml-l2-class-imbalance', 2, 'Class Imbalance', 24, () => import('./l2-class-imbalance')),
    mod('ml-l3-kmeans', 3, 'K-Means Clustering', 24, () => import('./l3-kmeans')),
    mod('ml-l3-dbscan-and-friends', 3, 'DBSCAN, Hierarchical Clustering and GMM', 22, () => import('./l3-dbscan-and-friends')),
    mod('ml-l3-pca', 3, 'PCA: Principal Component Analysis', 26, () => import('./l3-pca')),
    mod('ml-l3-tsne-umap', 3, 't-SNE & UMAP: Maps for Looking At Data', 18, () => import('./l3-tsne-umap')),
    mod('ml-l3-anomaly-detection', 3, 'Anomaly Detection: z-scores and Isolation Forest', 22, () => import('./l3-anomaly-detection')),
    mod('ml-l3-feature-engineering', 3, 'Feature Engineering & Data Leakage', 42, () => import('./l3-feature-engineering')),
    mod('ml-l3-cross-validation-tuning', 3, 'Cross-Validation & Hyperparameter Tuning', 60, () => import('./l3-cross-validation-tuning')),
    mod('ml-l3-recsys-timeseries', 3, 'Recommendation Systems & Time-Series Basics', 48, () => import('./l3-recsys-timeseries')),
    mod('ml-l3-from-scratch-and-projects', 3, 'From Scratch in NumPy + The Projects That Get You Hired', 56, () => import('./l3-from-scratch-and-projects')),
  ],
}
