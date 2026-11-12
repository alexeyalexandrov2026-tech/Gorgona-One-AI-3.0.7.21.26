// ===========================================================================
// Miami Elio — Cloudflare Workers AI adapter (server-only).
//
// The engine that answers on production. The site runs as a Cloudflare Worker,
// which cannot reach the localhost engines (the local brain, the ai-router);
// Workers AI is reachable from inside the Worker through the `AI` binding
// declared in wrangler.jsonc, with no API key to store or leak.
//
//   /api/chat -> askWorkersAi() -> env.AI.run(model, { messages }) -> reply
//
// The binding is passed in rather than looked up here, so this module has no
// Cloudflare import and runs unchanged under `node --test` with a stand-in.
//
// Like every link in the chain it never throws: each path resolves to a plain
// result object, and the caller falls through to the next engine on a miss.
// ===========================================================================

// Large enough to hold the concierge persona and stay fluent in all 16 UI
// languages. Override with WORKERS_AI_MODEL - a smaller model stretches the
// daily allowance further at the cost of weaker non-English replies.
export const DEFAULT_WORKERS_AI_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

const DEFAULT_TIMEOUT_MS = 25_000;

/**
 * Model-specific input. Gemma 4 thinks step by step before answering unless
 * told not to, and the thinking spends the max_tokens budget: the reply then
 * comes back empty. Other models do not take this option, so it is sent only
 * to the models that understand it.
 */
export function modelOptions(modelId) {
  return /^@cf\/google\/gemma-4/.test(modelId) ? { chat_template_kwargs: { enable_thinking: false } } : {};
}

/**
 * Pull the reply out of whatever shape the model returned. Workers AI models
 * answer `{ response }`; the OpenAI-compatible ones answer `choices[]` or the
 * Responses-style `output[]`.
 */
export function extractWorkersAiText(result) {
  if (typeof result === 'string') return result.trim();
  if (!result || typeof result !== 'object') return '';

  if (typeof result.response === 'string') return result.response.trim();

  const choice = result.choices?.[0];
  const fromChoice = choice?.message?.content ?? choice?.text;
  if (typeof fromChoice === 'string') return fromChoice.trim();

  if (typeof result.output_text === 'string') return result.output_text.trim();
  if (Array.isArray(result.output)) {
    const text = result.output
      .flatMap((item) => (Array.isArray(item?.content) ? item.content : []))
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('');
    if (text.trim()) return text.trim();
  }

  // REST-style envelope: { result: { response } }.
  if (result.result && typeof result.result === 'object') return extractWorkersAiText(result.result);
  return '';
}

/**
 * Ask Workers AI. Never throws.
 *
 * @param {Object} args
 * @param {{run: Function}|null|undefined} args.binding  env.AI, or nothing off Cloudflare.
 * @param {Array<{role:string, content:string}>} args.messages  Sanitized transcript.
 * @param {string} args.systemPrompt  Persona, inventory and language directive.
 * @param {string} [args.model]
 * @returns {Promise<
 *   | { ok: true, reply: string, model: string }
 *   | { ok: false, kind: 'unbound'|'unusable'|'empty'|'timeout'|'error', detail?: string }
 * >}
 */
export async function askWorkersAi({
  binding,
  messages,
  systemPrompt,
  model,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxTokens = 600,
  temperature = 0.6
} = {}) {
  if (!binding || typeof binding.run !== 'function') return { ok: false, kind: 'unbound' };
  if (!Array.isArray(messages) || !messages.length) return { ok: false, kind: 'unusable' };

  const modelId = String(model || '').trim() || DEFAULT_WORKERS_AI_MODEL;
  const input = {
    messages: [...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []), ...messages],
    max_tokens: maxTokens,
    temperature,
    ...modelOptions(modelId)
  };

  let timer;
  const timedOut = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ timedOut: true }), timeoutMs);
  });

  try {
    const result = await Promise.race([Promise.resolve(binding.run(modelId, input)), timedOut]);
    if (result?.timedOut === true) return { ok: false, kind: 'timeout' };

    const reply = extractWorkersAiText(result);
    if (!reply) return { ok: false, kind: 'empty' };
    return { ok: true, reply, model: modelId };
  } catch (error) {
    // Quota exhausted, model unavailable, bad model id - all "not right now".
    return { ok: false, kind: 'error', detail: String(error?.message || error).slice(0, 200) };
  } finally {
    clearTimeout(timer);
  }
}
