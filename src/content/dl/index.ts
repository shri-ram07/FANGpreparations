import { mod, type SubjectDef } from '../types'

export const dl: SubjectDef = {
  id: 'dl',
  title: 'Deep Learning',
  short: 'DL',
  why: 'The engine behind GenAI. FAANG expects from-scratch understanding, not framework calls.',
  prereqs: ['metrics'],
  levelTitles: ['Neural nets from zero', 'Training properly', 'Architectures', 'Generative & advanced'],
  interviewThemes: [
    'Derive backprop for one layer',
    'BatchNorm at train vs test',
    'Why ResNet works',
    'Parameter counting for conv layers',
    'Dropout at inference',
    'Adam vs SGD generalization debate',
    'Training loss falls but val loss rises — full debugging tree',
  ],
  mindmapMarkdown: `- Deep Learning
  - Neuron → MLP
    - Perceptron, non-linearity
    - Activations: ReLU family, GELU, softmax
  - Backprop
    - Chain rule on a graph
    - Forward pass with real numbers
  - Optimizers & normalization
    - SGD → Momentum → Adam/AdamW
    - BatchNorm vs LayerNorm
    - LR schedules, warmup
  - Regularization
    - Dropout, early stopping
    - Weight decay, augmentation
  - CNN family
    - Convolution, padding, pooling
    - LeNet → ResNet (skip connections)
    - Transfer learning
  - RNN / LSTM
    - Hidden state, BPTT
    - LSTM/GRU gates
    - seq2seq → attention teaser
  - Generative
    - Autoencoders → VAE
    - GANs, Diffusion (concept)
  - Training at scale
    - Mixed precision, grad accumulation
    - Data vs model parallelism`,
  modules: [
    mod('dl-l0-perceptron-mlp', 0, 'From Perceptron to MLP: Why Non-Linearity', 20, () => import('./l0-perceptron-mlp')),
    mod('dl-l0-activations', 0, 'Activation Functions and Where They Break', 20, () => import('./l0-activations')),
    mod('dl-l0-backpropagation', 0, 'Backpropagation: The Chain Rule on a Graph', 20, () => import('./l0-backpropagation')),
    mod('dl-l1-optimizers', 1, 'Optimizers: SGD, Momentum, RMSProp and Adam', 22, () => import('./l1-optimizers')),
    mod('dl-l1-weight-init', 1, 'Weight Initialisation', 18, () => import('./l1-weight-init')),
    mod('dl-l1-normalization', 1, 'BatchNorm vs LayerNorm', 20, () => import('./l1-normalization')),
    mod('dl-l1-regularization', 1, 'Regularization: Weight Decay, Dropout, Early Stopping', 20, () => import('./l1-regularization')),
    mod('dl-l1-pytorch-fundamentals', 1, 'PyTorch: Tensors, Autograd and the Training Loop', 20, () => import('./l1-pytorch-fundamentals')),
    mod('dl-l2-cnns', 2, 'CNNs: Convolution, Pooling and Receptive Fields', 22, () => import('./l2-cnns')),
    mod('dl-l2-cnn-architectures', 2, 'LeNet to ResNet: The Architectures That Mattered', 22, () => import('./l2-cnn-architectures')),
    mod('dl-l2-cv-tasks', 2, 'The CV Task Map: Detection and Segmentation', 20, () => import('./l2-cv-tasks')),
    mod('dl-l2-rnn-lstm', 2, 'RNNs, LSTMs and the Road to Attention', 22, () => import('./l2-rnn-lstm')),
    mod('dl-l2-embeddings', 2, 'Embeddings: Meaning as Vectors', 20, () => import('./l2-embeddings')),
    mod('dl-l3-generative-models', 3, 'Diffusion, and the Four Generative Families', 22, () => import('./l3-generative-models')),
    mod('dl-l3-ssl-and-scale', 3, 'Self-Supervised Learning', 20, () => import('./l3-ssl-and-scale')),
    mod('dl-l3-scaling-laws', 3, 'Scaling Laws and the Chinchilla Correction', 18, () => import('./l3-scaling-laws')),
    mod('dl-l3-practicals-and-debugging', 3, 'The Four Practicals: Things You Build Yourself', 18, () => import('./l3-practicals-and-debugging')),
    mod('dl-l3-debugging-playbook', 3, 'The Debugging Playbook: When Training Goes Wrong', 20, () => import('./l3-debugging-playbook')),
  ],
}
