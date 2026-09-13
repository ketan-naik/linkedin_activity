// utils/gemini.js - Google Gemini API connector with dynamic model discovery and multi-version fallbacks

class GeminiClient {
  static cachedActiveModel = null;
  static cachedApiVersion = 'v1beta';

  static CANDIDATE_MODELS = [
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash-002',
    'gemini-1.5-flash-001',
    'gemini-1.5-flash',
    'gemini-2.0-flash-exp',
    'gemini-2.0-flash',
    'gemini-1.5-pro-latest',
    'gemini-1.5-pro',
    'gemini-pro'
  ];

  static API_VERSIONS = ['v1beta', 'v1'];

  /**
   * Discover the best working model for this specific API key
   */
  static async discoverModel(apiKey) {
    if (this.cachedActiveModel) {
      return { model: this.cachedActiveModel, version: this.cachedApiVersion };
    }

    const cleanKey = apiKey.trim();

    // 1. Try listing available models via ModelService
    for (const version of this.API_VERSIONS) {
      try {
        const url = `https://generativelanguage.googleapis.com/${version}/models?key=${cleanKey}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.models && Array.isArray(data.models)) {
            const supported = data.models
              .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
              .map(m => m.name.replace(/^models\//, ''));

            if (supported.length > 0) {
              const preferred = supported.find(m => m.includes('1.5-flash') || m.includes('2.0-flash')) ||
                                supported.find(m => m.includes('flash')) ||
                                supported.find(m => m.includes('pro')) ||
                                supported[0];

              this.cachedActiveModel = preferred;
              this.cachedApiVersion = version;
              console.log(`[GeminiClient] Discovered model: ${preferred} (${version})`);
              return { model: preferred, version };
            }
          }
        }
      } catch (e) {
        console.warn(`[GeminiClient] Could not list models on ${version}:`, e);
      }
    }

    // 2. Direct probe of candidate models
    for (const version of this.API_VERSIONS) {
      for (const model of this.CANDIDATE_MODELS) {
        try {
          const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${cleanKey}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'ping' }] }],
              generationConfig: { maxOutputTokens: 5 }
            })
          });

          if (res.ok) {
            this.cachedActiveModel = model;
            this.cachedApiVersion = version;
            console.log(`[GeminiClient] Verified active model: ${model} (${version})`);
            return { model, version };
          }
        } catch (e) {
          // continue probe
        }
      }
    }

    return { model: 'gemini-1.5-flash-latest', version: 'v1beta' };
  }

  /**
   * Validate API key and detect working model
   */
  static async validateApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
      return { valid: false, error: 'Please enter a valid Google Gemini API key.' };
    }

    const cleanKey = apiKey.trim();

    try {
      this.cachedActiveModel = null;
      const { model, version } = await this.discoverModel(cleanKey);

      const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${cleanKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hello, respond with OK.' }] }],
          generationConfig: { maxOutputTokens: 10 }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        return { valid: false, error: message };
      }

      return { valid: true, model, version };
    } catch (err) {
      return { valid: false, error: `Connection failed: ${err.message}` };
    }
  }

  /**
   * Core text generation with automatic fallback
   */
  static async generate(prompt, apiKey, options = {}) {
    if (!apiKey) {
      throw new Error('Gemini API key is missing. Please set your free API key in the extension Settings tab.');
    }

    const cleanKey = apiKey.trim();
    const { model, version } = await this.discoverModel(cleanKey);

    const modelsToAttempt = [
      { model, version },
      { model: 'gemini-1.5-flash-latest', version: 'v1beta' },
      { model: 'gemini-1.5-flash-002', version: 'v1beta' },
      { model: 'gemini-1.5-flash-001', version: 'v1beta' },
      { model: 'gemini-1.5-flash', version: 'v1beta' },
      { model: 'gemini-2.0-flash-exp', version: 'v1beta' },
      { model: 'gemini-pro', version: 'v1' }
    ];

    let lastError = null;

    for (const attempt of modelsToAttempt) {
      try {
        const url = `https://generativelanguage.googleapis.com/${attempt.version}/models/${attempt.model}:generateContent?key=${cleanKey}`;
        const body = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            topP: options.topP ?? 0.9,
            maxOutputTokens: options.maxOutputTokens ?? 1500,
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
          lastError = new Error(errorMsg);
          if (response.status === 404 || errorMsg.includes('not found')) {
            continue;
          }
          throw lastError;
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Empty response received from Gemini.');

        this.cachedActiveModel = attempt.model;
        this.cachedApiVersion = attempt.version;

        return text.trim();
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('Failed to generate content with Gemini. Please verify your API key in Google AI Studio.');
  }

  /**
   * Generate 3 diverse comment suggestions for a LinkedIn post
   */
  static async generateCommentSuggestions(postText, authorName, apiKey, userBio) {
    const prompt = `
${typeof DE_SYSTEM_INSTRUCTION !== 'undefined' ? DE_SYSTEM_INSTRUCTION : 'You are a Senior Data Engineer.'}

Author: ${authorName || 'Peer'}
User Background: ${userBio || 'Senior Data Engineer'}

LinkedIn Post:
"""
${postText}
"""

Generate exactly 3 diverse, high-value LinkedIn comments from a Data Engineer perspective.
Each comment must represent one of these styles:
1. Practical Nuance (real-world gotchas, edge cases, partition/memory tuning, testing)
2. Architectural Trade-off (cost vs latency vs complexity, modern stack comparison)
3. Senior Inquiry (thoughtful technical question about scale or production failure modes)

Format your output strictly as a JSON array of objects with keys: "style", "label", "emoji", and "comment".
Example format:
[
  { "style": "practical_experience", "label": "Practical Nuance", "emoji": "💡", "comment": "..." },
  { "style": "architectural_tradeoff", "label": "Architectural Trade-off", "emoji": "⚖️", "comment": "..." },
  { "style": "thoughtful_question", "label": "Senior Inquiry", "emoji": "❓", "comment": "..." }
]
Return ONLY raw JSON, with no markdown code fences.
`;

    const rawResponse = await this.generate(prompt, apiKey, { temperature: 0.75 });
    try {
      const cleanJson = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      return [
        {
          style: 'practical_experience',
          label: 'Practical Insight',
          emoji: '💡',
          comment: rawResponse.slice(0, 300)
        }
      ];
    }
  }

  /**
   * Generate 3 viral hooks for a Data Engineering topic
   */
  static async generateHooks(topic, apiKey) {
    const prompt = `
You are a top technical copywriter for Data Engineering on LinkedIn.
Topic: "${topic}"

Generate 3 high-converting, attention-grabbing LinkedIn hooks for this topic.
Types of hooks:
1. The Counter-Intuitive / Bold Statement (challenges common wisdom)
2. The Metric / Incident Hook (e.g. "How a single shuffle killed our cluster...")
3. The Checklist / Framework Hook ("The 5 non-obvious rules for...")

Format your output strictly as a JSON array of strings:
["Hook 1 text", "Hook 2 text", "Hook 3 text"]
Return ONLY raw JSON, without backticks.
`;

    const raw = await this.generate(prompt, apiKey, { temperature: 0.85 });
    try {
      const cleanJson = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      return [
        `Most teams overcomplicate ${topic}. Here is what actually matters:`,
        `3 subtle bottlenecks with ${topic} that took us months to debug:`,
        `The real architectural tradeoff behind ${topic} nobody talks about:`
      ];
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GeminiClient };
}
