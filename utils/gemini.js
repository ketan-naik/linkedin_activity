// utils/gemini.js - Google Gemini 1.5 Flash API connector (100% Free Tier)

class GeminiClient {
  static BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
  static PRIMARY_MODEL = 'gemini-1.5-flash';
  static FALLBACK_MODELS = ['gemini-2.0-flash', 'gemini-1.5-pro'];

  /**
   * Test API key validity
   */
  static async validateApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
      return { valid: false, error: 'Please enter a valid Google Gemini API key.' };
    }

    try {
      const url = `${this.BASE_URL}/${this.PRIMARY_MODEL}:generateContent?key=${apiKey.trim()}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hello, respond with OK if you read this.' }] }],
          generationConfig: { maxOutputTokens: 10 }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        return { valid: false, error: message };
      }

      return { valid: true };
    } catch (err) {
      return { valid: false, error: `Connection failed: ${err.message}` };
    }
  }

  /**
   * Core text generation with fallback models
   */
  static async generate(prompt, apiKey, options = {}) {
    if (!apiKey) {
      throw new Error('Gemini API key is missing. Please set your free API key in the extension Settings tab.');
    }

    const modelsToTry = [this.PRIMARY_MODEL, ...this.FALLBACK_MODELS];
    let lastError = null;

    for (const model of modelsToTry) {
      try {
        const url = `${this.BASE_URL}/${model}:generateContent?key=${apiKey.trim()}`;
        const body = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            topP: options.topP ?? 0.9,
            maxOutputTokens: options.maxOutputTokens ?? 1200,
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
          // If 404 model not found, try fallback model
          if (response.status === 404) continue;
          throw lastError;
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Empty response received from Gemini.');
        return text.trim();
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('Failed to generate content with Gemini.');
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
      // Fallback parser if JSON fails
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
2. The Metric / Incident Hook (e.g. "How a single shuffle killed our $50k cluster...")
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
