# 🚀 LinkedIn Data Engineering Growth Copilot

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![AI Backend](https://img.shields.io/badge/AI-Google%20Gemini%20Flash%20(100%25%20Free)-orange.svg)](https://aistudio.google.com/)

A **100% free**, open-source Chrome extension and growth copilot built specifically for **Data Engineers**, Distributed Systems Architects, and Technical Creators on LinkedIn.

---

## 🌟 Key Features

### 1. 💬 In-Feed AI Comment Assistant
- **Interactive Comment Banner**: Displays a 1-click **`✨ Generate AI Reply for this post`** banner whenever you click into any comment box on LinkedIn.
- **Deep Context Extraction**: Automatically reads the post commentary, author, and infographic architecture topics (AWS, Spark, Iceberg, Snowflake, Kafka).
- **Sub-Comment Thread Support**: Click **`⚡ AI Reply`** under individual comments to reply directly to peers in a discussion thread.
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
- Generates 3 high-converting, scroll-stopping technical hooks for any data engineering topic to maximize dwell time.

### 4. 📁 Local Drafts Manager & 100% Privacy
- Saves your drafts locally in your browser storage.
- **Zero Third-Party Servers**: Your API key stays in `chrome.storage.local` and is never shared with any middleman.

---

## 🛠️ Step-by-Step Installation & Setup Guide

### Step 1: Download the Project to Your Computer

Choose whichever option is easier for you:

* **Option A (Using Git in Terminal)**:
  ```bash
  git clone https://github.com/ketan-naik/linkedin_activity.git
  ```
* **Option B (Direct Download as ZIP)**:
  1. Click the green **`<> Code`** button at the top of this GitHub repository page.
  2. Click **"Download ZIP"**.
  3. Extract/unzip the downloaded file anywhere on your computer (e.g. in your Downloads or Documents folder).

---

### Step 2: Load the Extension in Your Browser (Chrome / Brave / Edge)

1. Open your browser and navigate to:
   ```text
   chrome://extensions/
   ```
2. Turn **ON** the **Developer mode** toggle switch (in the top-right corner).
3. Click the **"Load unpacked"** button (in the top-left corner).
4. Select the `linkedin_activity` folder that you downloaded or cloned in Step 1.
5. In your browser toolbar, click the **Extensions puzzle piece icon** (🧩) and **Pin** **LinkedIn DE Copilot**.

---

### Step 3: Get Your 100% Free Gemini API Key (Takes 30 Seconds)

1. Go to **[Google AI Studio](https://aistudio.google.com/)** and sign in with your Google account.
2. Click the **"Get API key"** button and create a new key.
   *(Google provides 1,500 requests per day for free with no credit card required).*
3. Copy your API key (starts with `AIzaSy...`).

---

### Step 4: Activate the Extension

1. Click the **⚡ LinkedIn DE Copilot** icon in your browser toolbar to open the Side Panel.
2. Click the **⚙️ Settings** tab.
3. Paste your Gemini API key into the input box and click **"Save & Test Connection"**.
4. You will see a green **Connected!** badge. Your extension is now ready to use!

---

### Step 5: Start Growing on LinkedIn!

* **Replying to Posts & Comments**:
  1. Open [linkedin.com/feed](https://www.linkedin.com/).
  2. Click into the **`Add a comment...`** box under any post.
  3. Click the glowing **`✨ Generate AI Reply for this post`** banner.
  4. The sidepanel will craft 3 tailored Data Engineering replies.
  5. Click **`✍️ Insert into Comment Box`** on the reply you want!

* **Creating Viral Technical Posts**:
  1. Open the extension sidepanel and click the **✍️ Post Studio** tab.
  2. Select a topic (or type your own) and choose a framework (e.g., *System Design Case Study* or *Gotchas Breakdown*).
  3. Click **"🚀 Generate DE Post"**.
  4. Use the toolbar to style with **Unicode Bold**, *Italics*, or bullets, then click **"📋 Copy Post"**!

---

## 🔒 Security & Privacy

- **100% Client-Side**: All operations run locally inside your browser session.
- **Zero Credential Access**: The extension never asks for or stores your LinkedIn login credentials.
- **Billing Safe**: Runs on Google's generous Free Tier with $0 cost risk.

---

## 📄 License

Distributed under the MIT License. Feel free to fork, customize, and build your audience!
