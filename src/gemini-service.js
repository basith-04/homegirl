'use strict';
const fs = require('fs'); const path = require('path');
class GeminiService {
  constructor({ apiKey = process.env.GEMINI_API_KEY, model = process.env.GEMINI_MODEL || 'models/gemini-3.6-flash', promptPath = null, timeoutMs = 12_000, provider = null } = {}) { this.apiKey = apiKey; this.model = model; this.promptPath = promptPath || GeminiService.resolvePromptPath(); this.timeoutMs = timeoutMs; this.provider = provider; this.debug = { configured: Boolean(apiKey), model, lastRequestTime: null, lastResponseTime: null, lastRequestDurationMs: null, lastRequestStatus: 'idle', fallbackUsed: false, lastError: null, lastCommandCount: 0, contextSummary: null }; }
  static resolvePromptPath() { const root = path.join(__dirname, '..'); const canonical = path.join(root, 'HG.AI.md'); return fs.existsSync(canonical) ? canonical : path.join(root, 'hg.ai.md'); }
  systemInstruction() { if (!fs.existsSync(this.promptPath)) throw new Error(`Missing HomeGirl system prompt: ${this.promptPath}`); return fs.readFileSync(this.promptPath, 'utf8'); }
  snapshot() { return { ...this.debug }; }
  async generateHomeGirlResponse({ context, image = null }) {
    if (!this.apiKey && !this.provider) throw new Error('GEMINI_API_KEY is not configured');
    const systemInstruction = this.systemInstruction(); this.debug.lastRequestTime = Date.now(); this.debug.lastRequestStatus = 'started'; this.debug.fallbackUsed = false; this.debug.lastError = null;
    try {
      const request = this.provider ? this.provider({ context, image, systemInstruction, model: this.model }) : this.requestSdk({ context, image, systemInstruction }); let timeout;
      const timeoutPromise = new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Gemini request timed out')), this.timeoutMs); });
      const text = await Promise.race([request, timeoutPromise]).finally(() => clearTimeout(timeout));
      if (typeof text !== 'string' || !text.trim()) throw new Error('Gemini returned an empty response'); this.debug.lastResponseTime = Date.now(); this.debug.lastRequestDurationMs = this.debug.lastResponseTime - this.debug.lastRequestTime; this.debug.lastRequestStatus = 'success'; return text.trim();
    } catch (error) { this.debug.lastResponseTime = Date.now(); this.debug.lastRequestDurationMs = this.debug.lastResponseTime - this.debug.lastRequestTime; this.debug.lastRequestStatus = 'failed'; this.debug.fallbackUsed = true; this.debug.lastError = error instanceof Error ? error.message : String(error); throw error; }
  }
  async requestSdk({ context, image, systemInstruction }) { const { GoogleGenAI } = await import('@google/genai'); const ai = new GoogleGenAI({ apiKey: this.apiKey }); const input = image?.data && image?.mimeType ? [{ type: 'text', text: context }, { type: 'image', data: image.data, mime_type: image.mimeType }] : context; const interaction = await ai.interactions.create({ model: this.model, input, system_instruction: systemInstruction, generation_config: { max_output_tokens: 100, thinking_level: 'minimal', thinking_summaries: 'none' } }); return interaction.output_text; }
}
module.exports = { GeminiService };
