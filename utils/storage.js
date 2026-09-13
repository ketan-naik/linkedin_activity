// utils/storage.js - Persistent local configuration and draft management

const STORAGE_KEYS = {
  GEMINI_API_KEY: 'de_copilot_gemini_key',
  DEFAULT_PERSONA: 'de_copilot_default_persona',
  AUTO_LIKE_ENABLED: 'de_copilot_auto_like',
  CUSTOM_BIO: 'de_copilot_custom_bio',
  SAVED_DRAFTS: 'de_copilot_saved_drafts',
  COMMENT_HISTORY: 'de_copilot_comment_history',
};

const DEFAULT_SETTINGS = {
  defaultPersona: 'practical_experience', // 'practical_experience' | 'architectural_tradeoff' | 'thoughtful_question' | 'concise_value'
  autoLike: false,
  customBio: 'Senior Data Engineer specializing in Distributed Systems, Spark, dbt, Streaming (Kafka) and Modern Lakehouses.',
};

class StorageManager {
  static async getSettings() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([
          STORAGE_KEYS.GEMINI_API_KEY,
          STORAGE_KEYS.DEFAULT_PERSONA,
          STORAGE_KEYS.AUTO_LIKE_ENABLED,
          STORAGE_KEYS.CUSTOM_BIO
        ], (result) => {
          resolve({
            apiKey: result[STORAGE_KEYS.GEMINI_API_KEY] || '',
            defaultPersona: result[STORAGE_KEYS.DEFAULT_PERSONA] || DEFAULT_SETTINGS.defaultPersona,
            autoLike: result[STORAGE_KEYS.AUTO_LIKE_ENABLED] ?? DEFAULT_SETTINGS.autoLike,
            customBio: result[STORAGE_KEYS.CUSTOM_BIO] || DEFAULT_SETTINGS.customBio,
          });
        });
      } else {
        // Fallback for standalone / testing
        const apiKey = localStorage.getItem(STORAGE_KEYS.GEMINI_API_KEY) || '';
        const defaultPersona = localStorage.getItem(STORAGE_KEYS.DEFAULT_PERSONA) || DEFAULT_SETTINGS.defaultPersona;
        const autoLike = localStorage.getItem(STORAGE_KEYS.AUTO_LIKE_ENABLED) === 'true';
        const customBio = localStorage.getItem(STORAGE_KEYS.CUSTOM_BIO) || DEFAULT_SETTINGS.customBio;
        resolve({ apiKey, defaultPersona, autoLike, customBio });
      }
    });
  }

  static async saveSettings({ apiKey, defaultPersona, autoLike, customBio }) {
    const data = {};
    if (apiKey !== undefined) data[STORAGE_KEYS.GEMINI_API_KEY] = apiKey.trim();
    if (defaultPersona !== undefined) data[STORAGE_KEYS.DEFAULT_PERSONA] = defaultPersona;
    if (autoLike !== undefined) data[STORAGE_KEYS.AUTO_LIKE_ENABLED] = autoLike;
    if (customBio !== undefined) data[STORAGE_KEYS.CUSTOM_BIO] = customBio;

    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set(data, () => resolve(true));
      } else {
        Object.entries(data).forEach(([k, v]) => localStorage.setItem(k, typeof v === 'boolean' ? v.toString() : v));
        resolve(true);
      }
    });
  }

  static async getDrafts() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([STORAGE_KEYS.SAVED_DRAFTS], (result) => {
          resolve(result[STORAGE_KEYS.SAVED_DRAFTS] || []);
        });
      } else {
        const saved = localStorage.getItem(STORAGE_KEYS.SAVED_DRAFTS);
        resolve(saved ? JSON.parse(saved) : []);
      }
    });
  }

  static async saveDraft(draft) {
    const drafts = await this.getDrafts();
    const newDraft = {
      id: draft.id || `draft_${Date.now()}`,
      title: draft.title || (draft.content.slice(0, 40) + '...'),
      content: draft.content,
      topic: draft.topic || 'General',
      tags: draft.tags || [],
      createdAt: draft.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const existingIndex = drafts.findIndex(d => d.id === newDraft.id);
    if (existingIndex >= 0) {
      drafts[existingIndex] = newDraft;
    } else {
      drafts.unshift(newDraft);
    }

    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [STORAGE_KEYS.SAVED_DRAFTS]: drafts }, () => resolve(newDraft));
      } else {
        localStorage.setItem(STORAGE_KEYS.SAVED_DRAFTS, JSON.stringify(drafts));
        resolve(newDraft);
      }
    });
  }

  static async deleteDraft(draftId) {
    const drafts = await this.getDrafts();
    const filtered = drafts.filter(d => d.id !== draftId);

    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [STORAGE_KEYS.SAVED_DRAFTS]: filtered }, () => resolve(true));
      } else {
        localStorage.setItem(STORAGE_KEYS.SAVED_DRAFTS, JSON.stringify(filtered));
        resolve(true);
      }
    });
  }
}

// Export for module or global scope
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StorageManager, STORAGE_KEYS, DEFAULT_SETTINGS };
}
