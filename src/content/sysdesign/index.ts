import { mod, type SubjectDef } from '../types'

export const sysdesign: SubjectDef = {
  id: 'sysdesign',
  title: 'System Design',
  short: 'SD',
  why: 'The senior-signal round. Even new-grad FAANG loops now probe design thinking.',
  prereqs: ['backend'],
  levelTitles: ['Building blocks', 'The theory interviews test', 'HLD case studies', 'LLD'],
  interviewThemes: [
    'Your feed is slow — diagnose',
    'Cache invalidation strategy for X',
    'Back-of-envelope estimation drills',
    'Explain CAP during an actual partition',
    'Fanout on write vs read — pick and defend',
    'Make this API idempotent',
    'Design ChatGPT-style LLM serving',
    'Refactor this class out loud (SOLID)',
    'Make this class thread-safe',
    'Tradeoff defense under follow-up pressure',
  ],
  mindmapMarkdown: `- System Design
  - Scaling & LB
    - Vertical vs horizontal
    - L4 vs L7 load balancers
  - Caching layers
    - Browser → CDN → Redis → DB
    - Eviction (LRU), stampede
  - DB scaling
    - Replication (leader-follower)
    - Sharding + consistent hashing
  - Queues & async
    - Kafka / RabbitMQ, decoupling
    - Backpressure
  - CAP & consistency
    - Partition scenarios
    - Strong vs eventual
  - Resilience patterns
    - Idempotency, retries + backoff
    - Circuit breakers, timeouts
  - Estimation
    - QPS, storage, bandwidth
  - Case-study index
    - URL shortener → Twitter feed → WhatsApp
    - YouTube → Uber → LLM serving
  - SOLID
    - Each principle: bad → good refactor
  - Patterns
    - Singleton, Factory, Strategy, Observer
  - LLD classics
    - Parking Lot, Elevator, Splitwise, Chess`,
  modules: [
    mod('sysdesign-l0-scaling-basics', 0, 'Client-Server, Vertical vs Horizontal Scaling & Load Balancers', 55, () => import('./l0-scaling-basics')),
    mod('sysdesign-l0-caching', 0, 'Caching: Every Layer, Every Strategy', 55, () => import('./l0-caching')),
    mod('sysdesign-l0-database-scaling', 0, 'Scaling the Database: Replication, Sharding & Consistent Hashing', 60, () => import('./l0-database-scaling')),
    mod('sysdesign-l0-queues-messaging', 0, 'Message Queues: Decoupling, Backpressure & Kafka', 55, () => import('./l0-queues-messaging')),
    mod('sysdesign-l0-storage-gateway-ratelimit', 0, 'Blob Storage, CDNs, API Gateways & Rate Limiting', 55, () => import('./l0-storage-gateway-ratelimit')),
    mod('sysdesign-l1-estimation', 1, 'Back-of-Envelope Estimation: QPS, Storage & Bandwidth', 50, () => import('./l1-estimation')),
    mod('sysdesign-l1-cap-consistency', 1, 'CAP, PACELC & Consistency Models', 55, () => import('./l1-cap-consistency')),
    mod('sysdesign-l1-datastore-selection', 1, 'Choosing a Data Store: SQL vs NoSQL, Indexes & Pooling at Scale', 55, () => import('./l1-datastore-selection')),
    mod('sysdesign-l1-consensus-coordination', 1, 'Consensus, Leader Election & Failure Detection', 50, () => import('./l1-consensus-coordination')),
    mod('sysdesign-l1-resilience-patterns', 1, 'Resilience: Idempotency, Retries, Circuit Breakers & Timeouts', 55, () => import('./l1-resilience-patterns')),
    mod('sysdesign-l2-case-url-shortener', 2, 'Case Study: URL Shortener (and Pastebin)', 55, () => import('./l2-case-url-shortener')),
    mod('sysdesign-l2-case-social-feed', 2, 'Case Study: Twitter/Instagram Feed (Fanout on Write vs Read)', 60, () => import('./l2-case-social-feed')),
    mod('sysdesign-l2-case-chat', 2, 'Case Study: WhatsApp-Style Chat', 55, () => import('./l2-case-chat')),
    mod('sysdesign-l2-case-video-uber', 2, 'Case Studies: YouTube/Netflix & Uber', 65, () => import('./l2-case-video-uber')),
    mod('sysdesign-l2-case-search-crawler', 2, 'Case Studies: Search Autocomplete & Web Crawler', 60, () => import('./l2-case-search-crawler')),
    mod('sysdesign-l2-case-notification-idgen', 2, 'Case Studies: Notification System, Rate Limiter & Distributed ID Generator', 60, () => import('./l2-case-notification-idgen')),
    mod('sysdesign-l2-case-maps-geo', 2, 'Case Study: Google Maps — Spatial Indexes in Depth, Routing & ETA', 60, () => import('./l2-case-maps-geo')),
    mod('sysdesign-l2-case-ml-systems', 2, 'Case Study: Recommendations & LLM Serving at Scale', 70, () => import('./l2-case-ml-systems')),
    mod('sysdesign-l3-solid-principles', 3, 'SOLID: Each Principle as a Bad-to-Good Refactor', 55, () => import('./l3-solid-principles')),
    mod('sysdesign-l3-design-patterns', 3, 'Design Patterns: The Interview Seven, in Python and C++', 60, () => import('./l3-design-patterns')),
    mod('sysdesign-l3-lld-classics', 3, 'LLD Classics: Parking Lot, Elevator, Splitwise, BookMyShow & Chess', 75, () => import('./l3-lld-classics')),
    mod('sysdesign-l3-concurrency-design', 3, 'Concurrency in Design: Producer-Consumer, Readers-Writers & Thread-Safe Classes', 60, () => import('./l3-concurrency-design')),
  ],
}
