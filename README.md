# 🚀 LinkedIn Data Engineering Growth Copilot

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![AI Backend](https://img.shields.io/badge/AI-Google%20Gemini%20Flash%20(100%25%20Free)-orange.svg)](https://aistudio.google.com/)
[![Keyboard Shortcut](https://img.shields.io/badge/Shortcut-Alt%2BC-purple.svg)](README.md)

A **100% free**, open-source Chrome extension and growth copilot built specifically for **Data Engineers**, Distributed Systems Architects, and Technical Creators on LinkedIn.

---

## 🌟 Key Features

### 1. 🔥 Curated Trending DE Topics & Masterclass Post Engine
- **Top 5 Curated 7-Day DE Trends**:
  1. *Iceberg vs Delta: REST Catalog Wars & Compaction Debt*
  2. *DuckDB + Polars: Slashing 6-Figure Spark Compute Bills*
  3. *Data Contracts in Production: Stopping Silent Schema Breakages*
  4. *Real-time Flink + Iceberg CDC vs Micro-batching*
  5. *PySpark Partition Skew & AQE: 14-Hour to 18-Min Optimization*
- **1-Click Masterclass Post Generation**: Produces 350–500 word (1,400–2,200 character), bookmark-worthy deep dives complete with:
  - 🎣 Scroll-stopping contrarian hook & painful production bottlenecks.
  - 🔹 **4 Technical Pillars** with configuration tuning and architectural trade-offs.
  - 👉 **Decision Matrix / Rule of Thumb** (When to pick which engine).
  - 💬 **Architect-level Discussion Question** to drive comments.
  - 🏷️ **Targeted Hashtags** and Unicode bold formatting.

### 2. 💬 In-Feed AI Comment Assistant
- **Interactive Comment Banner**: Displays a 1-click **`✨ Generate AI Reply for this post`** banner whenever you click into any comment box on LinkedIn.
- **Deep Context Extraction**: Automatically reads the post commentary, author, and infographic architecture topics (AWS, Spark, Iceberg, Snowflake, Kafka).
- **Sub-Comment Thread Support**: Click **`⚡ AI Reply`** under individual comments to reply directly to peers in a discussion thread.
- **Length Control**:
  - ⚡ **Punchy (1–2 lines)**: Fast, high-impact engagement on viral posts.
  - 💬 **Standard (2–3 sentences)**: Balanced technical nuance.
  - 📜 **Deep-Dive (4–5 sentences)**: Rich breakdown with technical metrics.
- **Micro-Refinements**:
  - ✂️ **Shorter**: Instantly condenses the comment into a crisp punchline.
  - ⚡ **Add Config/Code**: Injects concrete Spark/SQL/Iceberg configs.
  - 🔄 **Regenerate**: Produces a fresh contrarian angle.

### 3. 🎯 Daily Growth Tracker
- Track your daily goal (e.g., 5 comments/day) with a real-time progress bar.
- Streak tracker & celebration badges when reaching daily milestones.

---

## 📥 How to Install & Activate

### Step 1: Clone the Repository
Open your terminal or command prompt and run:
```bash
git clone https://github.com/ketan-naik/linkedin_activity.git
```

### Step 2: Load into Google Chrome
1. Open Google Chrome and navigate to:
   ```
   chrome://extensions/
   ```
2. In the top-right corner, turn **ON** **Developer mode**.
3. Click the **Load unpacked** button in the top-left.
4. Select the cloned `linkedin_activity` folder.

### Step 3: Get your Free Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account and click **Get API key** → **Create API key**.
3. Copy your API key (100% free tier, generous rate limits).

### Step 4: Configure the Extension
1. Click the puzzle icon (Extensions) in Chrome's top toolbar and pin **LinkedIn DE Copilot**.
2. Click the extension icon or press **`Alt + C`** to open the side panel.
3. Open the **⚙️ Settings** tab, paste your API Key, and click **Save & Test Key**.

---

## ⚡ How to Use

### Writing Masterclass Posts:
1. Open the side panel (**`Alt + C`**).
2. Click the **🔥 Trending** tab.
3. Select any of the top 5 curated trending topics or enter your own custom theme.
4. Click **🚀 Generate Masterclass Post**.
5. Review the 350–500 word post, copy to clipboard, and publish directly to LinkedIn!

### In-Feed Comments:
1. Scroll LinkedIn feed. When you click into any post's comment box, you'll see:
   > 💡 **Data Eng Copilot**: [✨ Generate AI Reply for this post]
2. Click the button to automatically open the side panel and generate 3 tailored options.
3. Click **Insert into Post** or copy directly!

---

## 🛠️ Tech Stack & Architecture

- **Manifest V3**: Pure Chrome Extension API with Side Panel context.
- **AI Engine**: Google Gemini Flash (`gemini-3.6-flash`, `gemini-3.0-flash`, `gemini-2.5-flash` dynamic fallback).
- **Security & Privacy**: Zero server middleware; all API keys are stored locally in Chrome's encrypted `chrome.storage.local`.

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.
