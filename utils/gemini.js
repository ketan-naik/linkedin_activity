// utils/gemini.js - Google Gemini API connector with delimiter-based clean comment parser

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
   * Probes and verifies a working model with a 1-token test ping
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
   * Generate 3 diverse comment suggestions using clear delimited text format
   */
  static async generateCommentSuggestions(postText, authorName, apiKey, userBio) {
    const prompt = `
You are a top Senior Staff Data Engineer commenting on LinkedIn.
Author: ${authorName || 'Peer'}
User Background: ${userBio || 'Senior Data Engineer specializing in PySpark, dbt, Snowflake, Lakehouse, and streaming'}

Post Content:
"""
${postText}
"""

Task: Write exactly 3 high-value, authentic comments for this post.
Rules for each comment:
- 2 to 3 sentences max.
- Be practical, highly technical, and conversational.
- NO hashtags, NO generic fluff like "Great post!" or "I agree!".

Format your response EXACTLY using these 3 section delimiters with pure comment text under each:

===OPTION 1: Practical Nuance===
[Write 2-3 sentences adding a real-world pipeline gotcha, edge case, memory spill, or partition tuning lesson]

===OPTION 2: Architectural Trade-off===
[Write 2-3 sentences analyzing cost vs latency vs engineering complexity or tool tradeoffs]

===OPTION 3: Senior Inquiry===
[Write 2-3 sentences making a sharp observation and asking a thoughtful technical question about production scale or failure modes]
`;

    const rawResponse = await this.generate(prompt, apiKey, { temperature: 0.75 });

    const results = [];

    // Parse Option 1
    const match1 = rawResponse.match(/===OPTION 1:[^=]*===([sS]*?)(?====OPTION 2|$)/i);
    const comment1 = match1 ? match1[1].trim() : '';
    if (comment1) {
      results.push({
        style: 'practical_experience',
        label: 'Practical Nuance',
        emoji: '💡',
        comment: comment1
      });
    }

    // Parse Option 2
    const match2 = rawResponse.match(/===OPTION 2:[^=]*===([sS]*?)(?====OPTION 3|$)/i);
    const comment2 = match2 ? match2[1].trim() : '';
    if (comment2) {
      results.push({
        style: 'architectural_tradeoff',
        label: 'Architectural Trade-off',
        emoji: '⚖️',
        comment: comment2
      });
    }

    // Parse Option 3
    const match3 = rawResponse.match(/===OPTION 3:[^=]*===([sS]*?)$/i);
    const comment3 = match3 ? match3[1].trim() : '';
    if (comment3) {
      results.push({
        style: 'thoughtful_question',
        label: 'Senior Inquiry',
        emoji: '❓',
        comment: comment3
      });
    }

    // Fallback if delimiters were omitted by the model
    if (results.length === 0) {
      const cleanText = rawResponse.replace(/\`\`\`json/gi, '').replace(/\`\`\`/gi, '').trim();
      try {
        const parsed = JSON.parse(cleanText);
        if (Array.isArray(parsed)) {
          return parsed.map(p => ({
            style: p.style || 'practical_experience',
            label: p.label || 'Practical Insight',
            emoji: p.emoji || '💡',
            comment: p.comment || JSON.stringify(p)
          }));
        }
      } catch (e) {
        // Plain text fallback
        return [
          {
            style: 'practical_experience',
            label: 'Practical Insight',
            emoji: '💡',
            comment: cleanText
          }
        ];
      }
    }

    return results;
  }

  /**
   * Generate 3 viral hooks
   */
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
