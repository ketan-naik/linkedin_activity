# 🚀 LinkedIn Data Engineering Growth Copilot

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![AI Backend](https://img.shields.io/badge/AI-Google%20Gemini%20Flash%20(100%25%20Free)-orange.svg)](https://aistudio.google.com/)

A **100% free**, open-source Chrome extension and growth copilot built specifically for **Data Engineers**, Distributed Systems Architects, and Technical Creators on LinkedIn.

---

## 🌟 Key Features

### 1. 💬 In-Feed AI Comment Assistant
- **Interactive Comment Banner**: Displays a 1-click **`✨ Generate AI Reply`** banner whenever you open any comment box on LinkedIn.
- **Deep Context Extraction**: Automatically reads the post commentary, author, and infographic architecture topics (AWS, Spark, Iceberg, Snowflake, Kafka).
- **3 Distinct Technical Personas**:
  - 💡 **Practical Nuance**: Pipeline edge cases, partition skew, memory spill, dbt incremental traps, schema drift.
  - ⚖️ **Architectural Trade-off**: Cost vs. latency, compute optimization, batch vs. real-time streaming tradeoffs.
  - ❓ **Senior Inquiry**: Thoughtful production questions regarding scale, idempotency, and data contracts.
- **1-Click Insertion**: Drops the generated reply directly into the LinkedIn comment box with optional auto-like.

### 2. ✍️ Data Engineering Post Studio (Side Panel)
- **Proven Technical Frameworks**:
  - 🏗️ *System Design & Case Study*
  - ⚔️ *Tool Benchmark & Comparison* (e.g. Polars vs DuckDB, Iceberg vs Delta)
  - 💥 *Gotchas & Incident Breakdown*
  - 💻 *PySpark / SQL / Python Code Tip*
  - 🚀 *Career & DE Mindset*
- **Unicode Formatting Toolbar**: 1-click **Bold**, *Italic*, 🔹 bullets, 👉 arrows, and code blocks for clean mobile formatting.

### 3. 🎣 Viral Hooks Optimizer
- Generates 3 high-converting, scroll-stopping technical hooks for any data engineering topic.

### 4. 📁 Local Drafts Manager & 100% Privacy
- Saves your drafts locally in your browser storage.
- **Zero Third-Party Servers**: Your API key stays in `chrome.storage.local` and is never shared with any middleman.

---

## 🛠️ Quick Installation (for Anyone)

### Step 1: Clone the Repository
Clone this repository to your local machine:
```bash
git clone https://github.com/ketan-naik/linkedin_activity.git
```

### Step 2: Load the Extension in Chrome / Brave / Edge
1. Open your browser and navigate to `chrome://extensions/`.
2. Turn **ON** the **Developer mode** toggle (in the top-right corner).
3. Click the **"Load unpacked"** button (in the top-left corner).
4. Select the cloned `linkedin_activity` directory.
5. Pin **LinkedIn DE Copilot** to your browser toolbar.

### Step 3: Connect Your Free Gemini API Key
1. Go to **[Google AI Studio](https://aistudio.google.com/)** and click **"Get API key"** *(takes 20 seconds, no credit card required)*.
2. Click the **LinkedIn DE Copilot** extension icon in your browser toolbar.
3. Go to the **⚙️ Settings** tab, paste your API key, and click **"Save & Test Connection"**.
4. You are ready to start building your audience!

---

## 🔒 Security & Privacy

- **100% Local**: All operations and settings run directly on your browser via Chrome Extensions API.
- **Zero Tracking**: No user tracking, analytics, or external servers.
- **Free Tier Safe**: Operates directly with Google's free 1,500 requests/day tier with $0 billing risk.

---

## 📄 License

Distributed under the MIT License. Feel free to fork, customize, and contribute!
