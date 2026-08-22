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
    mod('ml-l0-learning-setup', 0, 'What "Learning From Data" Actually Means', 45, () => import('./l0-learning-setup')),
    mod('ml-l1-gradient-descent', 1, 'Gradient Descent + Linear Regression', 40, () => import('./l1-gradient-descent')),
    mod('ml-l1-regression-regularization', 1, 'Polynomials, Overfitting, and Regularisation: Ridge vs Lasso', 38, () => import('./l1-regression-regularization')),
    mod('ml-l2-logistic-regression', 2, 'Logistic Regression: Sigmoid, Cross-Entropy & Decision Boundaries', 38, () => import('./l2-logistic-regression')),
    mod('ml-l2-knn-naive-bayes', 2, 'k-NN & Naive Bayes: The Two Simplest Classifiers', 52, () => import('./l2-knn-naive-bayes')),
    mod('ml-l2-svm', 2, 'SVM: Max Margin & the Kernel Trick', 48, () => import('./l2-svm')),
    mod('ml-l2-decision-trees', 2, 'Decision Trees: Splits, Impurity and Pruning', 40, () => import('./l2-decision-trees')),
    mod('ml-l2-ensembles', 2, 'Ensembles: Many Weak Opinions Beat One Strong Opinion', 55, () => import('./l2-ensembles')),
    mod('ml-l2-class-imbalance', 2, 'Class Imbalance: When 98% Accuracy Is Worthless', 35, () => import('./l2-class-imbalance')),
    mod('ml-l3-clustering', 3, 'Clustering: Finding Groups When Nobody Labelled the Data', 60, () => import('./l3-clustering')),
    mod('ml-l3-pca', 3, 'PCA: Principal Component Analysis', 26, () => import('./l3-pca')),
    mod('ml-l3-dimensionality-anomaly', 3, 'PCA, t-SNE & Anomaly Detection', 57, () => import('./l3-dimensionality-anomaly')),
    mod('ml-l3-feature-engineering', 3, 'Feature Engineering & Data Leakage', 42, () => import('./l3-feature-engineering')),
    mod('ml-l3-cross-validation-tuning', 3, 'Cross-Validation & Hyperparameter Tuning', 60, () => import('./l3-cross-validation-tuning')),
    mod('ml-l3-recsys-timeseries', 3, 'Recommendation Systems & Time-Series Basics', 48, () => import('./l3-recsys-timeseries')),
    mod('ml-l3-from-scratch-and-projects', 3, 'From Scratch in NumPy + The Projects That Get You Hired', 56, () => import('./l3-from-scratch-and-projects')),
  ],
}
