// utils/gemini.js - Google Gemini API connector with robust clean comment splitting

class GeminiClient {
  static cachedActiveModel = null;
  static cachedApiVersion = 'v1beta';

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
   * Probes and verifies a working model
   */
  static async discoverModel(apiKey) {
    if (this.cachedActiveModel) {
      return { model: this.cachedActiveModel, version: this.cachedApiVersion };
    }

    const cleanKey = apiKey.trim();
    let discoveredCandidates = [];

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

    const allCandidates = [
      ...discoveredCandidates,
      ...this.CANDIDATE_MODELS.map(m => ({ model: m, version: 'v1beta' })),
      ...this.CANDIDATE_MODELS.map(m => ({ model: m, version: 'v1' }))
    ];

    const uniqueCandidates = [];
    const seen = new Set();
    for (const item of allCandidates) {
      const key = `${item.version}/${item.model}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueCandidates.push(item);
      }
    }

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
        // continue
      }
    }

    return { model: 'gemini-3.6-flash', version: 'v1beta' };
  }

  /**
   * Validate API key
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
   * Core text generation
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
   * Generate 3 diverse comment suggestions and cleanly parse into separate cards
   */
    /**
   * Generate 3 diverse comment suggestions and cleanly parse into separate cards
   */
  static async generateCommentSuggestions(postText, authorName, apiKey, userBio) {
    const prompt = `
You are a top Senior Staff Data Engineer commenting on LinkedIn.
Author: ${authorName || 'Peer'}
User Background: ${userBio || 'Senior Data Engineer specializing in PySpark, dbt, Snowflake, Lakehouse, and cloud architectures'}

Context of Post/Comment:
"""
${postText}
"""

Task: Write 3 diverse, high-value comments for this post.
Rules for each comment:
- 2 to 3 sentences max.
- Be practical, highly technical, and conversational.
- NO hashtags, NO generic fluff like "Great post!" or "I agree!".

Format your response strictly using these 3 section delimiters with pure comment text under each:

===OPTION 1: Practical Nuance===
[Write 2-3 sentences adding a real-world pipeline gotcha, edge case, memory spill, or partition tuning lesson]

===OPTION 2: Architectural Trade-off===
[Write 2-3 sentences analyzing cost vs latency vs engineering complexity or tool tradeoffs]

===OPTION 3: Senior Inquiry===
[Write 2-3 sentences making a sharp observation and asking a thoughtful technical question about production scale or failure modes]
`;

    const rawResponse = await this.generate(prompt, apiKey, { temperature: 0.75 });

    // Multi-regex robust parser
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

    // Secondary fallback: split by delimiter
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

    // Tertiary fallback: clean plain text
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
    const m1 = raw.match(/===HOOK 1===([sS]*?)(?====HOOK 2|$)/i);
    const m2 = raw.match(/===HOOK 2===([sS]*?)(?====HOOK 3|$)/i);
    const m3 = raw.match(/===HOOK 3===([sS]*?)$/i);

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
