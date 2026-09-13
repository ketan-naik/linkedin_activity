/**
 * Core Prompt Engineering & Trending DE Topics Engine
 */

export const TRENDING_DE_TOPICS = [
  {
    id: 'iceberg_catalog',
    badge: '🔥 HOT DEBATE',
    title: 'Iceberg vs Delta: REST Catalog Wars & Compaction Debt',
    description: "Why table formats won't save you if your metadata manifests and small-file compaction are mismanaged.",
    tags: ['#ApacheIceberg', '#DeltaLake', '#DataLakehouse', '#DataEngineering']
  },
  {
    id: 'duckdb_spark',
    badge: '💰 FINOPS / COST',
    title: 'DuckDB + Polars: Slashing 6-Figure Spark Compute Bills',
    description: 'Replacing over-provisioned Spark clusters with single-node vectorized engines for sub-100GB pipelines.',
    tags: ['#DuckDB', '#Polars', '#ApacheSpark', '#FinOps']
  },
  {
    id: 'data_contracts',
    badge: '🛡️ RELIABILITY',
    title: 'Data Contracts in Production: Stopping Silent Schema Breakages',
    description: 'Enforcing JSON Schema & Protobuf at ingest to eliminate 3 AM production pipeline failures.',
    tags: ['#DataContracts', '#DataQuality', '#DataObservability', '#DataOps']
  },
  {
    id: 'flink_cdc',
    badge: '⚡ STREAMING',
    title: 'Real-time Flink + Iceberg CDC vs Micro-batching',
    description: 'Architecting sub-second change data capture pipelines without drowning in small file bottlenecks.',
    tags: ['#ApacheFlink', '#StreamingData', '#Kafka', '#CDC']
  },
  {
    id: 'spark_skew',
    badge: '🚀 DEEP OPTIMIZATION',
    title: 'PySpark Partition Skew & AQE: 14-Hour to 18-Min Optimization',
    description: 'Salting keys, tuning spark.sql.shuffle.partitions, and handling OOM errors at scale.',
    tags: ['#PySpark', '#BigData', '#PerformanceTuning', '#ApacheSpark']
  }
];

export const SYSTEM_PROMPTS = {
  COMMENT: `You are an elite Staff Data Platform & Infrastructure Engineer.
Your goal is to write insightful, technically deep, and engaging comments on LinkedIn posts.
Never write generic fluff like "Great share!" or "Thanks for sharing".
Always reference specific architectures, performance trade-offs, or real-world production engineering realities.`,

  POST_MASTERCLASS: `You are a top-tier Tech Influencer and Principal Data Architect on LinkedIn.
Your task is to write high-engagement, authoritative, long-form technical MASTERCLASS posts for Data Engineers.

STRICT FORMATTING AND LENGTH REQUIREMENTS:
- TOTAL LENGTH: 350 to 500 WORDS (1,400 to 2,200 characters). Do NOT produce short summaries.
- HOOK: 1-2 punchy lines that stop the scroll (contrarian take, painful production truth, or shocking cost metric).
- THE PROBLEM: Why conventional approaches fail in production at scale.
- 4 TECHNICAL PILLARS: Use Unicode bullet markers (🔹) with bold titles (e.g., 🔹 **1. Partition Salting Over AQE Blind Trust**). Provide concrete architecture rationale, configurations, or mini code/SQL patterns.
- 👉 DECISION MATRIX: A clear rule of thumb (When to use X vs Y).
- 💬 ENGAGEMENT CTA: An open-ended, high-level question that invites senior engineers and architects to debate in the comments.
- 🏷️ HASHTAGS: 4-6 targeted, high-traffic data engineering hashtags at the bottom.

Use clean paragraph spacing, crisp bullet points, and Unicode bolding where impactful.`
};

export function buildTrendingPostPrompt(topicId, customPrompt = '') {
  const topic = TRENDING_DE_TOPICS.find(t => t.id === topicId);
  const title = topic ? topic.title : (customPrompt || 'Modern Data Engineering Architecture');
  const context = topic ? topic.description : customPrompt;
  const tags = topic ? topic.tags.join(' ') : '#DataEngineering #BigData #DataArchitecture';

  return `Write a complete, high-authority, viral Masterclass LinkedIn Post on this trending topic:
TOPIC: "${title}"
CONTEXT & KEY THEME: "${context}"
RELEVANT HASHTAGS: ${tags}

Follow this exact Masterclass architecture:
1. Scroll-Stopping Hook (Bold contrarian view or real production metric)
2. The Core Problem / Anti-Pattern
3. 4 Detailed Technical Takeaways / Pillars (marked with 🔹 and bold subtitles)
4. 👉 Architecture Rule of Thumb / Decision Matrix
5. 💬 Discussion Prompt for Data Engineers & Architects
6. Mandatory Hashtags: ${tags}

Tone: Authoritative, pragmatic, Senior Staff/Principal Engineer level.
Length: 350 to 500 words. Make it rich, educational, and bookmark-worthy.`;
}

export function buildPostPrompt({ topic, format = 'standard', tone = 'technical' }) {
  return `Write a comprehensive, bookmark-worthy LinkedIn Masterclass Post about: "${topic}".
Tone: ${tone}
Format: ${format}

STRICT REQUIREMENTS:
- Length: 350 to 500 words.
- Structure:
  • Scroll-Stopping Hook
  • The Real Production Bottleneck
  • 4 🔹 Technical Insights / Architecture Solutions (with config/metric references)
  • 👉 Decision Matrix (When to choose what)
  • 💬 Discussion Question
  • 4-6 Relevant #Hashtags (#DataEngineering #DataPlatform #BigData)

Ensure high technical accuracy and deep insights that data engineers will immediately want to save and repost.`;
}
