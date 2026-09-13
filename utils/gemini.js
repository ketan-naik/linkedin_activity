// utils/gemini.js - Google Gemini API connector with verified model probe and fallback

class GeminiClient {
  static cachedActiveModel = null;
  static cachedApiVersion = 'v1beta';

  // Candidate models ordered from newest to classic
  static CANDIDATE_MODELS = [
    'gemini-3.6-flash',
    'gemini-3.0-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash-002',
    'gemini-1.5-flash-001',
    'gemini-1.5-flash',
    'gemini-1.5-pro-latest',
    'gemini-1.5-pro',
    'gemini-pro'
  ];

  static API_VERSIONS = ['v1beta', 'v1'];

  /**
   * Probes and verifies a working model with a 1-token test ping
   */
  static async discoverModel(apiKey) {
    if (this.cachedActiveModel) {
      return { model: this.cachedActiveModel, version: this.cachedApiVersion };
    }

    const cleanKey = apiKey.trim();
    let discoveredCandidates = [];

    // 1. Fetch available models dynamically from Google API
    for (const version of this.API_VERSIONS) {
      try {
        const url = `https://generativelanguage.googleapis.com/${version}/models?key=${cleanKey}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.models && Array.isArray(data.models)) {
            const models = data.models
              .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
              .map(m => m.name.replace(/^models\//, ''));

            // Sort models: 3.6-flash first, then 3.0, 2.0, 1.5, etc.
            models.sort((a, b) => {
              if (a.includes('3.6')) return -1;
              if (b.includes('3.6')) return 1;
              if (a.includes('3.0')) return -1;
              if (b.includes('3.0')) return 1;
              if (a.includes('2.0')) return -1;
              if (b.includes('2.0')) return 1;
              return 0;
            });

            discoveredCandidates.push(...models.map(m => ({ model: m, version })));
          }
        }
      } catch (e) {
        console.warn(`[GeminiClient] Could not fetch models on ${version}:`, e);
      }
    }

    // Combine discovered models with default candidate list
    const allCandidates = [
      ...discoveredCandidates,
      ...this.CANDIDATE_MODELS.map(m => ({ model: m, version: 'v1beta' })),
      ...this.CANDIDATE_MODELS.map(m => ({ model: m, version: 'v1' }))
    ];

    // Remove duplicates
    const uniqueCandidates = [];
    const seen = new Set();
    for (const item of allCandidates) {
      const key = `${item.version}/${item.model}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueCandidates.push(item);
      }
    }

    // 2. Actively probe each candidate with a tiny 1-token ping to guarantee it works
    for (const candidate of uniqueCandidates) {
      try {
        const url = `https://generativelanguage.googleapis.com/${candidate.version}/models/${candidate.model}:generateContent?key=${cleanKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'ping' }] }],
            generationConfig: { maxOutputTokens: 2 }
          })
        });

        if (res.ok) {
          const resData = await res.json().catch(() => ({}));
          if (resData.candidates && resData.candidates.length > 0) {
            this.cachedActiveModel = candidate.model;
            this.cachedApiVersion = candidate.version;
            console.log(`[GeminiClient] Verified active working model: ${candidate.model} (${candidate.version})`);
            return candidate;
          }
        }
      } catch (e) {
        // Continue probing next model
      }
    }

    // Default fallback
    return { model: 'gemini-3.6-flash', version: 'v1beta' };
  }

  /**
   * Validate API key and detect verified working model
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
          contents: [{ parts: [{ text: 'Respond with OK.' }] }],
          generationConfig: { maxOutputTokens: 5 }
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
   * Core text generation with verified active model and automatic retry
   */
  static async generate(prompt, apiKey, options = {}) {
    if (!apiKey) {
      throw new Error('Gemini API key is missing. Please set your free API key in the extension Settings tab.');
    }

    const cleanKey = apiKey.trim();
    const { model, version } = await this.discoverModel(cleanKey);

    const fallbackList = [
      { model, version },
      { model: 'gemini-3.6-flash', version: 'v1beta' },
      { model: 'gemini-3.0-flash', version: 'v1beta' },
      { model: 'gemini-2.0-flash', version: 'v1beta' },
      { model: 'gemini-1.5-flash-latest', version: 'v1beta' },
      { model: 'gemini-pro', version: 'v1' }
    ];

    let lastError = null;

    for (const attempt of fallbackList) {
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
          // If model deprecated or not found, try next in fallbackList
          continue;
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

    throw lastError || new Error('Failed to generate content. Please verify your API key in Google AI Studio.');
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
