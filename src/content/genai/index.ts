import { mod, type SubjectDef } from '../types'

export const genai: SubjectDef = {
  id: 'genai',
  title: 'GenAI & Transformers',
  short: 'GAI',
  why: '"Built a GPT from scratch" is a resume line that gets FAANG callbacks. Your specialization\'s crown.',
  prereqs: ['dl'],
  levelTitles: ['The road to attention', 'The full Transformer', 'From transformer to LLM', 'Applied GenAI'],
  interviewThemes: [
    'Explain attention on a whiteboard',
    'Attention is O(n²) — mitigations?',
    'Why LayerNorm placement matters',
    'KV-cache math',
    'LoRA parameter-savings calculation',
    'RAG vs finetuning decision case',
    'Hallucination mitigation design',
    "Design ChatGPT's serving stack",
  ],
  mindmapMarkdown: `- GenAI & Transformers
  - Tokenization
    - char → word → BPE
    - Tokens & context window
  - Embeddings
    - Meaning as vectors
  - Attention (QKV)
    - Query, Key, Value
    - Scaled dot-product, softmax
    - Multi-head, causal masking
  - Transformer block
    - Attention → Add&Norm → FFN
    - Positional encoding → RoPE
    - BERT vs GPT vs T5
  - GPT training loop
    - Next-token prediction
    - Sampling: temperature, top-k, top-p
  - Finetuning
    - Full FT → LoRA / QLoRA
    - Instruction tuning
  - Alignment
    - RLHF: SFT → reward model → PPO
    - DPO — the simpler route
  - Inference optimizations
    - Quantization, KV-cache
    - vLLM, speculative decoding
  - RAG
    - Chunk → embed → retrieve → rerank → generate
  - Agents
    - Function calling, ReAct, MCP
  - Evaluation
    - Perplexity, LLM-as-judge, guardrails`,
  modules: [
    mod('genai-l0-tokenization', 0, 'Tokenization: How Text Becomes Numbers', 20, () => import('./l0-tokenization')),
    mod('genai-l0-self-attention', 0, 'Self-Attention', 20, () => import('./l0-self-attention')),
    mod('genai-l1-multihead-attention', 1, 'Multi-Head Attention', 18, () => import('./l1-multihead-attention')),
    mod('genai-l1-positional-encoding', 1, 'Positional Encoding', 18, () => import('./l1-positional-encoding')),
    mod('genai-l1-transformer-block', 1, 'The Transformer Block', 18, () => import('./l1-transformer-block')),
    mod('genai-l1-build-gpt-capstone', 1, 'CAPSTONE: Code a GPT from Scratch', 70, () => import('./l1-build-gpt-capstone')),
    mod('genai-l2-pretraining-scaling', 2, 'Pretraining & Scaling Laws', 34, () => import('./l2-pretraining-scaling')),
    mod('genai-l2-finetuning-lora', 2, 'Fine-Tuning: Full FT, LoRA & QLoRA', 28, () => import('./l2-finetuning-lora')),
    mod('genai-l2-rlhf-dpo', 2, 'Alignment: RLHF, Reward Models & DPO', 42, () => import('./l2-rlhf-dpo')),
    mod('genai-l2-inference-optimization', 2, 'Serving a Language Model: What Each Token Costs', 34, () => import('./l2-inference-optimization')),
    mod('genai-l3-prompt-engineering', 3, 'Prompt Engineering That Actually Works', 38, () => import('./l3-prompt-engineering')),
    mod('genai-l3-embeddings-vector-db', 3, 'Embeddings, Vector Databases & Semantic Search', 46, () => import('./l3-embeddings-vector-db')),
    mod('genai-l3-rag', 3, 'RAG End to End: Retrieve, Rerank, Generate', 43, () => import('./l3-rag')),
    mod('genai-l3-agents-tools', 3, 'Agents and Tools: How a Model Asks Your Code to Do Something', 40, () => import('./l3-agents-tools')),
    mod('genai-l3-evaluation-safety', 3, 'Evaluating LLM Systems: Judges, Groundedness & Guardrails', 48, () => import('./l3-evaluation-safety')),
  ],
}
