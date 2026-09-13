/**
 * utils/gemini.js - Direct Google Gemini API Connector
 * Native Gemini 2.0 / 1.5 Flash integration with zero deprecated models
 */

class GeminiClient {
  static cachedActiveModel = null;
  static cachedApiVersion = 'v1beta';

  // Active, officially supported Google Gemini models for Free & Paid tiers
  static PRIORITY_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash-002',
    'gemini-1.5-flash-001',
    'gemini-1.5-pro',
    'gemini-1.5-pro-latest'
  ];

  /**
   * Discover and cache the best available model for the user's API key
   */
  static async discoverModel(apiKey) {
    if (this.cachedActiveModel) {
      return { model: this.cachedActiveModel, version: this.cachedApiVersion };
    }

    const cleanKey = apiKey ? apiKey.trim() : '';
    if (!cleanKey) {
      throw new Error('Please set your free Gemini API key in the extension Settings tab.');
    }

    // Step 1: Query ListModels from Google Gemini API
    let availableModels = [];
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.models && Array.isArray(data.models)) {
          availableModels = data.models
            .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
            .map(m => m.name.replace(/^models\//, ''));
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 400 || res.status === 403) {
          throw new Error(errData.error?.message || 'Invalid Gemini API Key. Please verify in Google AI Studio.');
        }
      }
    } catch (e) {
      if (e.message && e.message.includes('API Key')) {
        throw e;
      }
      console.warn('[GeminiClient] ListModels failed, using priority list fallback:', e.message);
    }

    // Step 2: Determine best model
    // Check if any available model matches our priority list
    let selectedModel = null;
    if (availableModels.length > 0) {
      for (const pref of this.PRIORITY_MODELS) {
        const matched = availableModels.find(m => m === pref || m.startsWith(pref));
        if (matched) {
          selectedModel = matched;
          break;
        }
      }
      if (!selectedModel) {
        // Fallback to first available model that generates content
        selectedModel = availableModels.find(m => m.includes('flash') || m.includes('gemini')) || availableModels[0];
      }
    }

    if (!selectedModel) {
      selectedModel = 'gemini-2.0-flash';
    }

    this.cachedActiveModel = selectedModel;
    this.cachedApiVersion = 'v1beta';

    return { model: this.cachedActiveModel, version: this.cachedApiVersion };
  }

  /**
   * Validate API Key and connection
   */
  static async validateApiKey(apiKey) {
    if (!apiKey || !apiKey.trim()) {
      return { valid: false, error: 'API key is required.' };
    }

    const cleanKey = apiKey.trim();
    try {
      this.cachedActiveModel = null; // reset cache to test fresh
      const { model, version } = await this.discoverModel(cleanKey);

      // Perform a minimal test ping
      const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${cleanKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'ping' }] }],
          generationConfig: { maxOutputTokens: 5 }
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const message = errJson.error?.message || `HTTP error ${response.status}`;
        return { valid: false, error: message };
      }

      return { valid: true, model, version };
    } catch (err) {
      return { valid: false, error: err.message || 'Connection failed' };
    }
  }

  /**
   * Main text generation method with smart retry and active fallbacks
   */
  static async generate(prompt, apiKey, options = {}) {
    if (!apiKey) {
      throw new Error('Gemini API key is missing. Please set your free API key in the extension Settings tab.');
    }

    const cleanKey = apiKey.trim();
    const { model, version } = await this.discoverModel(cleanKey);

    // Fallback list of modern models only (no deprecated gemini-pro / v1)
    const candidateList = [
      { model, version },
      { model: 'gemini-2.0-flash', version: 'v1beta' },
      { model: 'gemini-1.5-flash', version: 'v1beta' },
      { model: 'gemini-1.5-flash-latest', version: 'v1beta' },
      { model: 'gemini-1.5-pro', version: 'v1beta' }
    ];

    // Deduplicate candidates
    const uniqueCandidates = [];
    const seen = new Set();
    for (const c of candidateList) {
      const k = `${c.version}/${c.model}`;
      if (!seen.has(k)) {
        seen.add(k);
        uniqueCandidates.push(c);
      }
    }

    let lastError = null;

    for (const attempt of uniqueCandidates) {
      try {
        const url = `https://generativelanguage.googleapis.com/${attempt.version}/models/${attempt.model}:generateContent?key=${cleanKey}`;
        const body = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            topP: options.topP ?? 0.9,
            maxOutputTokens: options.maxOutputTokens ?? 2500,
          }
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          const errorJson = await response.json().catch(() => ({}));
          const errorMsg = errorJson.error?.message || `HTTP ${response.status}`;

          // If the key is invalid or quota exceeded, throw immediately
          if (response.status === 400 && errorMsg.includes('API key not valid')) {
            throw new Error('Invalid Gemini API Key. Please check your key in the Settings tab.');
          }
          if (response.status === 429) {
            throw new Error('Gemini free tier rate limit reached. Please wait 10 seconds and try again.');
          }

          lastError = new Error(errorMsg);
          continue; // Try next model candidate
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Empty response received from Gemini.');

        this.cachedActiveModel = attempt.model;
        this.cachedApiVersion = attempt.version;

        return text.trim();
      } catch (err) {
        if (err.message && (err.message.includes('Invalid Gemini API Key') || err.message.includes('rate limit'))) {
          throw err;
        }
        lastError = err;
      }
    }

    throw lastError || new Error('Failed to generate content with Gemini. Please check your API key.');
  }

  /**
   * Refine a comment (Make Shorter / Add Technical Flags)
   */
  static async refineComment(commentText, action, apiKey) {
    let instruction = '';
    if (action === 'shorter') {
      instruction = 'Rewrite this LinkedIn comment into exactly 1 punchy, high-impact sentence. Keep it technical and remove any extra words:';
    } else if (action === 'technical') {
      instruction = 'Enhance this LinkedIn comment by injecting a specific technical flag, memory parameter, or architectural config (e.g. spark.sql.adaptive.skewJoin.enabled, dbt incremental unique_key, Iceberg compaction, Kafka lag):';
    } else {
      instruction = 'Rewrite this comment with a fresh, insightful Data Engineering perspective:';
    }

    const prompt = `
You are a Senior Staff Data Engineer.
${instruction}

Original Comment:
"${commentText}"

Rules:
- Return ONLY the clean rewritten comment text.
- NO introductory remarks, NO hashtags.
`;

    return await this.generate(prompt, apiKey, { temperature: 0.7 });
  }

  /**
   * Generate 3 diverse comment suggestions with length and persona control
   */
  static async generateCommentSuggestions(postText, authorName, apiKey, userBio, length = 'standard') {
    const prompt = `
You are a top Senior Staff Data Engineer commenting on LinkedIn.
Author: ${authorName || 'Peer'}
User Background: ${userBio || 'Senior Data Engineer specializing in PySpark, dbt, Snowflake, Lakehouse, and cloud architectures'}
Length Preference: ${length === 'punchy' ? '1 to 2 sharp sentences max' : length === 'deep' ? '4 to 5 sentences with specific technical breakdowns' : '2 to 3 concise sentences'}

Context of Post/Comment:
"""
${postText}
"""

Task: Write 3 diverse, high-value comments for this post.
Rules for each comment:
- Length: ${length === 'punchy' ? '1-2 sentences' : length === 'deep' ? '4-5 sentences' : '2-3 sentences'}.
- Be practical, highly technical, and conversational.
- NO hashtags, NO generic fluff like "Great post!" or "I agree!".

Format your response strictly using these 3 section delimiters with pure comment text under each:

===OPTION 1: Practical Nuance===
[Write a comment adding a real-world pipeline gotcha, edge case, memory spill, or partition tuning lesson]

===OPTION 2: Architectural Trade-off===
[Write a comment analyzing cost vs latency vs engineering complexity or tool tradeoffs]

===OPTION 3: Senior Inquiry===
[Write a comment making a sharp observation and asking a thoughtful technical question about production scale or failure modes]
`;

    const rawResponse = await this.generate(prompt, apiKey, { temperature: 0.75 });

    const reg1 = new RegExp('(?:===OPTION 1[^=]*===|\\*\\*Option 1[^\\*]*\\*\\*|1\\.\\s*Practical[^\\n:]*[:\\-])\\s*([\\s\\S]*?)(?=(?:===OPTION 2|\\*\\*Option 2|2\\.\\s*Architectural|Option 2|$))', 'i');
    const reg2 = new RegExp('(?:===OPTION 2[^=]*===|\\*\\*Option 2[^\\*]*\\*\\*|2\\.\\s*Architectural[^\\n:]*[:\\-])\\s*([\\s\\S]*?)(?=(?:===OPTION 3|\\*\\*Option 3|3\\.\\s*Senior|Option 3|$))', 'i');
    const reg3 = new RegExp('(?:===OPTION 3[^=]*===|\\*\\*Option 3[^\\*]*\\*\\*|3\\.\\s*Senior[^\\n:]*[:\\-])\\s*([\\s\\S]*?)$', 'i');

    const styles = [
      { key: 'practical_experience', label: '💡 Practical Nuance', regex: reg1 },
      { key: 'architectural_tradeoff', label: '⚖️ Architectural Trade-off', regex: reg2 },
      { key: 'thoughtful_question', label: '❓ Senior Inquiry', regex: reg3 }
    ];

    const results = [];
    for (const s of styles) {
      const m = rawResponse.match(s.regex);
      if (m && m[1].trim()) {
        let clean = m[1].trim();
        clean = clean.replace(/^(?:===OPTION \d+[^=]*===|\*\*Option \d+[^:]*:\*\*|Option \d+:)/i, '').trim();
        results.push({
          style: s.key,
          label: s.label,
          emoji: s.label.split(' ')[0],
          comment: clean
        });
      }
    }

    if (results.length === 0) {
      const parts = rawResponse.split(/={2,}[^=]+={2,}/).map(p => p.trim()).filter(p => p.length > 20);
      const labels = ['💡 Practical Nuance', '⚖️ Architectural Trade-off', '❓ Senior Inquiry'];
      parts.forEach((p, idx) => {
        results.push({
          style: idx === 0 ? 'practical_experience' : idx === 1 ? 'architectural_tradeoff' : 'thoughtful_question',
          label: labels[idx] || '💡 High-Impact Take',
          emoji: (labels[idx] || '💡').split(' ')[0],
          comment: p
        });
      });
    }

    if (results.length === 0) {
      const cleanText = rawResponse.replace(/={2,}[^=]+={2,}/g, '').trim();
      results.push({
        style: 'practical_experience',
        label: '💡 Practical Nuance',
        emoji: '💡',
        comment: cleanText
      });
    }

    return results;
  }

  static async generateHooks(topic, apiKey) {
    const prompt = `
You are a top technical copywriter for Data Engineering on LinkedIn.
Topic: "${topic}"

Generate 3 high-converting LinkedIn hooks for this topic.
Format strictly using delimiters:
===HOOK 1===
[Hook 1 text]
===HOOK 2===
[Hook 2 text]
===HOOK 3===
[Hook 3 text]
`;

    const raw = await this.generate(prompt, apiKey, { temperature: 0.85 });
    const hooks = [];
    const m1 = raw.match(/===HOOK 1===([\s\S]*?)(?====HOOK 2|$)/i);
    const m2 = raw.match(/===HOOK 2===([\s\S]*?)(?====HOOK 3|$)/i);
    const m3 = raw.match(/===HOOK 3===([\s\S]*?)$/i);

    if (m1 && m1[1].trim()) hooks.push(m1[1].trim());
    if (m2 && m2[1].trim()) hooks.push(m2[1].trim());
    if (m3 && m3[1].trim()) hooks.push(m3[1].trim());

    return hooks.length > 0 ? hooks : [
      `Most teams overcomplicate ${topic}. Here is what actually matters:`,
      `3 subtle bottlenecks with ${topic} that took us months to debug:`,
      `The real architectural tradeoff behind ${topic} nobody talks about:`
    ];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GeminiClient };
}
