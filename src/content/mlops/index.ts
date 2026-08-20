import { mod, type SubjectDef } from '../types'

export const mlops: SubjectDef = {
  id: 'mlops',
  title: 'DevOps + MLOps',
  short: 'OPS',
  why: 'Models in notebooks = ₹0 value. FAANG ML engineers ship. This track is 80% doing.',
  prereqs: ['ml', 'backend'],
  levelTitles: ['DevOps foundations', 'Containers & CI/CD', 'MLOps core', 'Production & scale'],
  interviewThemes: [
    'Docker image vs container',
    'What happens on git rebase',
    'Blue-green vs canary',
    'How do you detect drift',
    'Reproducibility guarantees',
    'Design a retraining trigger',
    'k8s pod vs deployment',
  ],
  mindmapMarkdown: `- DevOps + MLOps
  - Linux / Git
    - Filesystem, permissions, SSH
    - Branching, merge vs rebase
  - Docker
    - Image vs container
    - Layers & caching, compose
  - CI/CD
    - GitHub Actions: lint → test → build → deploy
  - Tracking (MLflow)
    - Params / metrics / artifacts
    - Model registry
  - Versioning (DVC)
    - Git for data
  - Orchestration (Airflow)
    - Ingest → train → evaluate → register
  - Serving
    - Batch vs online vs streaming
    - Canary / shadow deployment
  - Kubernetes
    - Pods, deployments, services
    - Autoscaling
    - Local practice on kind / minikube
  - Infrastructure as Code
    - Terraform: init → plan → apply → destroy
    - State file, drift, remote state + locking
  - Monitoring & drift
    - Prometheus + Grafana
    - Evidently → retraining loop
  - LLMOps
    - Prompt versioning, eval pipelines
    - Cost / latency, semantic caching`,
  modules: [
    mod('mlops-l0-linux-networking', 0, 'Linux & Networking Essentials for ML Engineers', 50, () => import('./l0-linux-networking')),
    mod('mlops-l0-git', 0, 'Git Properly: Branching, Merge vs Rebase & Conflicts', 50, () => import('./l0-git')),
    mod('mlops-l1-docker', 1, 'Docker: Images, Layers & Containerizing an ML API', 60, () => import('./l1-docker')),
    mod('mlops-l1-cicd', 1, 'CI/CD with GitHub Actions: Lint, Test, Build, Deploy', 55, () => import('./l1-cicd')),
    mod('mlops-l1-cloud-basics', 1, 'Cloud on the Free Tier: Compute, Storage & IAM', 45, () => import('./l1-cloud-basics')),
    mod('mlops-l2-why-mlops', 2, 'Why ML Needs Special Ops: Drift, Decay & Reproducibility', 50, () => import('./l2-why-mlops')),
    mod('mlops-l2-experiment-tracking', 2, 'Experiment Tracking & the Model Registry (MLflow)', 50, () => import('./l2-experiment-tracking')),
    mod('mlops-l2-data-versioning', 2, 'Data & Model Versioning with DVC', 45, () => import('./l2-data-versioning')),
    mod('mlops-l2-orchestration', 2, 'Orchestration with Airflow: DAGs That Train Models', 55, () => import('./l2-orchestration')),
    mod('mlops-l2-serving-patterns', 2, 'Serving Patterns, Feature Stores & Testing ML Code', 55, () => import('./l2-serving-patterns')),
    mod('mlops-l3-kubernetes', 3, 'Kubernetes Essentials: Pods, Deployments & Autoscaling', 60, () => import('./l3-kubernetes')),
    mod('mlops-l3-monitoring-and-capstone', 3, 'Monitoring, Drift Alerts & the Grand MLOps Capstone', 70, () => import('./l3-monitoring-and-capstone')),
  ],
}
