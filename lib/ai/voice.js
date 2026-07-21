// ===========================================================================
// Gorgona One — premium TTS interface (server-only).
//
// The voice twin of lib/ai/brain.js: one place that knows which speech
// provider (if any) is configured. Feature-flagged and fail-safe by design:
//   TTS_PROVIDER  'off' (default) | 'google' | 'elevenlabs' | 'openai'
//   GOOGLE_SERVICE_ACCOUNT[_JSON|_KEY] - service-account JSON (google);
//     GOOGLE_API_KEY is the simpler alternative credential.
//   ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID   (elevenlabs)
//   OPENAI_API_KEY / TTS_VOICE                 (openai; voice e.g. 'alloy')
//
// When unset (the default), /api/tts reports unavailable and clients keep
// using the browser's built-in speechSynthesis - the concierge voice always
// works, premium audio is a pure upgrade. Providers here must never throw
// into callers: every failure returns { ok: false } and the client falls
// back silently.
//
// GOOGLE ON CLOUDFLARE WORKERS: the official @google-cloud/* SDKs need
// gRPC/Node internals that workerd does not provide, so this module speaks
// plain REST and mints the OAuth2 access token itself - an RS256-signed JWT
// via Web Crypto (crypto.subtle), exchanged at the token endpoint and cached
// until shortly before expiry.
// ===========================================================================

const MAX_TTS_CHARS = 1200;
const TTS_TIMEOUT_MS = 15_000;

function googleServiceAccountRaw() {
  // The dashboard secret name may vary; accept the common spellings.
  return (
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ||
    null
  );
}

export function getTtsConfig() {
  const provider = String(process.env.TTS_PROVIDER || 'off').toLowerCase();
  if (provider === 'google' && (googleServiceAccountRaw() || process.env.GOOGLE_API_KEY)) {
    return {
      provider,
      serviceAccountRaw: googleServiceAccountRaw(),
      apiKey: process.env.GOOGLE_API_KEY || null,
      // Optional explicit voice (e.g. 'en-US-Neural2-F'). Only applied when
      // it matches the requested language; otherwise Google picks the best
      // available voice for the language.
      voiceName: process.env.GOOGLE_TTS_VOICE || null
    };
  }
  if (provider === 'elevenlabs' && process.env.ELEVENLABS_API_KEY) {
    return {
      provider,
      apiKey: process.env.ELEVENLABS_API_KEY,
      // Premium multilingual voices, female + male. Defaults are ElevenLabs'
      // own high-quality stock voices (Sarah / George); override per-account
      // via env if a cloned/branded voice is preferred.
      voiceIdFemale: process.env.ELEVENLABS_VOICE_ID_FEMALE || process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL',
      voiceIdMale: process.env.ELEVENLABS_VOICE_ID_MALE || 'JBFqnCBsd6RMkjVDRZzb'
    };
  }
  if (provider === 'openai' && process.env.OPENAI_API_KEY) {
    return {
      provider,
      apiKey: process.env.OPENAI_API_KEY,
      // 'alloy'/'nova' read neutral-to-female; 'onyx'/'echo' read male.
      voiceFemale: process.env.TTS_VOICE_FEMALE || process.env.TTS_VOICE || 'nova',
      voiceMale: process.env.TTS_VOICE_MALE || 'onyx'
    };
  }
  return { provider: 'off' };
}

export function isTtsAvailable() {
  return getTtsConfig().provider !== 'off';
}

// --- Google service-account OAuth2 (Web Crypto, no SDK) --------------------

let googleTokenCache = null; // { token, exp }

function base64UrlEncode(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function pemToArrayBuffer(pem) {
  const b64 = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function googleAccessToken(raw) {
  if (googleTokenCache && Date.now() < googleTokenCache.exp) return googleTokenCache.token;

  let sa;
  try {
    sa = JSON.parse(raw);
  } catch {
    console.error('Google TTS: service account secret is not valid JSON');
    return null;
  }
  if (!sa?.client_email || !sa?.private_key) {
    console.error('Google TTS: service account JSON missing client_email/private_key');
    return null;
  }

  const tokenUri = sa.token_uri || 'https://oauth2.googleapis.com/token';
  const iat = Math.floor(Date.now() / 1000);
  const encoder = new TextEncoder();
  const header = base64UrlEncode(encoder.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claims = base64UrlEncode(
    encoder.encode(
      JSON.stringify({
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
        aud: tokenUri,
        iat,
        exp: iat + 3600
      })
    )
  );
  const signingInput = `${header}.${claims}`;

  try {
    const key = await crypto.subtle.importKey(
      'pkcs8',
      pemToArrayBuffer(sa.private_key),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(signingInput));
    const jwt = `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;

    const res = await fetch(tokenUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${jwt}`
    });
    if (!res.ok) {
      console.error('Google TTS: token exchange failed', res.status, (await res.text()).slice(0, 200));
      return null;
    }
    const data = await res.json();
    if (!data?.access_token) return null;
    // Refresh 5 minutes before expiry.
    googleTokenCache = { token: data.access_token, exp: Date.now() + (data.expires_in - 300) * 1000 };
    return data.access_token;
  } catch (error) {
    console.error('Google TTS: JWT signing failed', error?.name || error);
    return null;
  }
}

// Google auth for both synthesize and voices:list. Service account (OAuth2)
// preferred; API key is the simpler alternative.
async function googleAuth(config, url) {
  const headers = { 'Content-Type': 'application/json' };
  if (config.serviceAccountRaw) {
    const token = await googleAccessToken(config.serviceAccountRaw);
    if (!token) return null;
    headers.Authorization = `Bearer ${token}`;
    return { url, headers };
  }
  return { url: `${url}${url.includes('?') ? '&' : '?'}key=${config.apiKey}`, headers };
}

// Premium voice tiers, best first. A voice's tier is read from its name
// (e.g. 'en-US-Studio-O', 'ru-RU-Wavenet-A'). Chirp/Journey are intentionally
// excluded - they use different synthesize semantics that a plain text
// request can 400 on; Studio/Neural2/Wavenet all speak premium with the same
// call, giving a rich voice with graceful, guaranteed coverage.
const VOICE_TIERS = ['Studio', 'Neural2', 'Wavenet'];
const voiceCache = new Map(); // `${languageCode}|${GENDER}` -> name | null

// Resolves the best premium voice for a language + gender via voices:list,
// cached per isolate. Returns null when none is found (caller then uses the
// language + gender default, i.e. a Standard voice) - never throws.
async function resolvePremiumVoice(config, languageCode, gender, signal) {
  const key = `${languageCode}|${gender}`;
  if (voiceCache.has(key)) return voiceCache.get(key);

  let name = null;
  try {
    const auth = await googleAuth(
      config,
      `https://texttospeech.googleapis.com/v1/voices?languageCode=${encodeURIComponent(languageCode)}`
    );
    if (auth) {
      const res = await fetch(auth.url, { headers: auth.headers, signal });
      if (res.ok) {
        const voices = (await res.json())?.voices || [];
        const matches = voices.filter((v) => v.ssmlGender === gender && typeof v.name === 'string');
        let bestRank = Infinity;
        for (const v of matches) {
          const rank = VOICE_TIERS.findIndex((tier) => v.name.includes(tier));
          if (rank !== -1 && rank < bestRank) {
            bestRank = rank;
            name = v.name;
          }
        }
      } else {
        console.error('Google TTS: voices:list failed', res.status);
      }
    }
  } catch (error) {
    console.error('Google TTS: voice resolution failed', error?.name || error);
  }
  voiceCache.set(key, name);
  return name;
}

async function synthesizeGoogle(config, input, lang, gender, signal) {
  // BCP-47 language for voice selection; the concierge speaks 16 locales.
  const languageCode = lang || 'en-US';
  const ssmlGender = gender === 'male' ? 'MALE' : 'FEMALE';
  const voice = { languageCode, ssmlGender };

  // Voice priority: explicit env override (when it matches the language) ->
  // resolved premium voice for this language+gender -> language+gender
  // default. A mismatched explicit name is a hard 400, so it is gated.
  if (config.voiceName && config.voiceName.toLowerCase().startsWith(languageCode.toLowerCase())) {
    voice.name = config.voiceName;
    delete voice.ssmlGender;
  } else {
    const premium = await resolvePremiumVoice(config, languageCode, ssmlGender, signal);
    if (premium) {
      voice.name = premium;
      delete voice.ssmlGender;
    }
  }

  const auth = await googleAuth(config, 'https://texttospeech.googleapis.com/v1/text:synthesize');
  if (!auth) return null;

  const res = await fetch(auth.url, {
    method: 'POST',
    headers: auth.headers,
    signal,
    body: JSON.stringify({
      input: { text: input },
      voice,
      // A touch of studio polish: slightly fuller low end suits a luxury
      // concierge voice without sounding processed.
      audioConfig: { audioEncoding: 'MP3', pitch: gender === 'male' ? -1 : 0, speakingRate: 1 }
    })
  });
  if (!res.ok) {
    console.error('Google TTS error', res.status, (await res.text()).slice(0, 300));
    return null;
  }
  const data = await res.json();
  if (!data?.audioContent) return null;
  // audioContent is base64 MP3.
  const bin = atob(data.audioContent);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/**
 * @param {string} text
 * @param {{ lang?: string, gender?: 'female'|'male' }} [options] BCP-47 reply
 *   language (e.g. 'ru-RU') and preferred voice gender (default 'female').
 * @returns {Promise<{ ok: true, audio: ArrayBuffer, mime: string } | { ok: false }>}
 */
export async function synthesizeSpeech(text, { lang, gender } = {}) {
  const config = getTtsConfig();
  const input = String(text || '').trim().slice(0, MAX_TTS_CHARS);
  if (config.provider === 'off' || !input) return { ok: false };
  const voiceGender = gender === 'male' ? 'male' : 'female';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);
  try {
    if (config.provider === 'google') {
      const audio = await synthesizeGoogle(config, input, lang, voiceGender, controller.signal);
      return audio ? { ok: true, audio, mime: 'audio/mpeg' } : { ok: false };
    }

    let response;
    if (config.provider === 'elevenlabs') {
      const voiceId = voiceGender === 'male' ? config.voiceIdMale : config.voiceIdFemale;
      response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: { 'xi-api-key': config.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: input,
          // Multilingual model: the concierge speaks 16 locales.
          model_id: 'eleven_multilingual_v2'
        }),
        signal: controller.signal
      });
    } else {
      const voice = voiceGender === 'male' ? config.voiceMale : config.voiceFemale;
      response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice, input }),
        signal: controller.signal
      });
    }

    if (!response.ok) {
      console.error('TTS provider error', config.provider, response.status, (await response.text()).slice(0, 200));
      return { ok: false };
    }
    return { ok: true, audio: await response.arrayBuffer(), mime: 'audio/mpeg' };
  } catch (error) {
    console.error('TTS synthesis failed', error?.name || error);
    return { ok: false };
  } finally {
    clearTimeout(timeout);
  }
}
