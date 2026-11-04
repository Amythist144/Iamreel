/* I AM REEL Vision Guide: real AI replies via the xAI Grok API.
   POST { messages:[{role,content}], slots:{dream,moment,feeling}, stage:'dream'|'refine', roundsLeft } -> { reply, slots, affirmations, done, dream_vision }
   Short flow: round 1 paints ONE vivid moment and asks if it is the dream; later rounds revise it.
   The key lives only in the XAI_API_KEY environment variable. Errors never expose it. */
'use strict';

const MODEL = process.env.XAI_MODEL || 'grok-4.20-0309-non-reasoning';
const API_URL = 'https://api.x.ai/v1/chat/completions';
const TIMEOUT_MS = 15000;
const MAX_MESSAGES = 24;
const MAX_MSG_CHARS = 1200; // guide replies in history
const MAX_ANSWER = 255;     // each user answer
const PAID_ROUNDS = 6;     // hard cap on user answers (free guide uses 2)
const MAX_SLOT_CHARS = 600;
const MAX_BODY_CHARS = 24000;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 20; // requests per IP per minute (per warm instance)
const SLOT_KEYS = ['dream', 'moment', 'feeling'];
const STAGES = ['dream', 'refine'];
const OPENING = 'What a beautiful dream to hold.';
const ASK = 'Is this the dream you’d love to see?';
const CLOSE = 'Does this feel right? Your dream is ready, with your feelings and affirmations, in Your dream.';

const BANNED = /\b(vibrat\w*|frequenc\w*|manifest\w*|goals?|high(?:er|est)[ -]self)\b/i;
const FEEL_CLAIM = /\bI\s+(?:can\s+)?(?:feel|sense)\b|\benerg(?:y|ies)\b/i;
const SUBS = [
  [/\bhigh(?:er|est)[ -]self\b/gi, 'best life'],
  [/\bgoals\b/gi, 'dreams'], [/\bgoal\b/gi, 'dream'],
  [/\bmanifest(?:ing|ed|s|ation|ations)?\b/gi, 'create'],
  [/\b(?:raise|raising|high|higher|your|the|this|a)?\s*(?:vibrational?|vibrations?|vibrating|vibrate[sd]?|frequenc(?:y|ies))\b/gi, ' your spirit'],
];

const SYSTEM_PROMPT = `You are the I AM REEL Vision Guide, a warm, poetic guide. The person types their dream and you bring it to life as ONE specific, vivid moment they will see themselves living in personalized images and a cinematic reel. This is a very short conversation: you never interview them and you NEVER ask for more details.

HOW YOU REPLY:
- Round 1 (stage "dream"): begin with exactly "${OPENING}" Then invent ONE specific moment built from exactly what they wrote: second person, present tense, 3–5 sentences of rich sensory detail (light, sound, scent, texture, temperature, taste) and the feelings in their body and heart. End with this question on its own line, exactly: "${ASK}"
- Later rounds (stage "refine"): they confirm or refine. Revise the SAME moment, folding in everything they just said (keep what still fits), with fresh sensory words. If they simply said yes, give a short, glowing close-up of the moment instead.
- Final round (roundsLeft 0): after the revised moment, end with exactly: "${CLOSE}" No other question.
- Otherwise every reply ends with exactly one question: "${ASK}" Never ask about where, who, how they feel, or anything else.
- Never use filler like "it's in your blueprint now". Never put first-person affirmations ("I am…") in the reply. Keep the reply under 120 words.

STAY TRUE TO THEIR DETAILS (most important): keep their exact nouns and descriptors for the place, objects, drinks, foods, people, pets, time of day and actions. Never swap, rename or upgrade them, never name a city, island or country they did not say, never invent new people, pets, names or brands. Add only complementary sensory detail. You may quietly fix an obvious misspelling.

WORDS YOU NEVER USE: vibration, vibrational, vibrate, frequency, manifest (any form), goal (say "dream"), higher self or highest self (say "best life"), energy. Never claim you can feel, sense or perceive anything; write "picture", "imagine", "see".

CONTENT RULES: uplifting and tasteful. No sexual or explicit content, profanity, violence or hate. No celebrities, public figures or real named people; no children or minors in personalized images. Only the user appears as themself; anyone else is AI-generated from a description. If a message breaks a rule, kindly steer back without repeating the problem words.

SLOTS (always return all three, carried forward and updated):
- dream: their dream in their own words, first person, short (update with refinements)
- moment: the moment you painted, condensed to 1–3 second-person sentences
- feeling: the desired feelings as a short comma list (from their words, or the feelings your moment evokes)
AFFIRMATIONS: 3–4 short first-person present-tense affirmations built from their dream ("I am…", "I live…"), refreshed each turn.
DREAM_VISION: one rich paragraph (70–120 words), second person, present tense, of the full moment with their exact nouns.

Respond ONLY with JSON: {"reply":string,"slots":{"dream":string,"moment":string,"feeling":string},"affirmations":[string],"done":boolean,"dream_vision":[string]}`;

const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) { for (const [k, v] of hits) { if (!v.length || now - v[v.length - 1] > RATE_WINDOW_MS) hits.delete(k); } }
  return arr.length > RATE_MAX;
}
const str = (v, n) => (typeof v === 'string' ? v : '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, n);

function parseBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    if (typeof req.body === 'string') { try { return resolve(JSON.parse(req.body)); } catch (e) { return resolve(null); } }
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > MAX_BODY_CHARS * 2) { data = ''; req.destroy(); } });
    req.on('end', () => { try { resolve(JSON.parse(data || 'null')); } catch (e) { resolve(null); } });
    req.on('error', () => resolve(null));
  });
}

function validate(body) {
  if (!body || typeof body !== 'object') return null;
  if (JSON.stringify(body).length > MAX_BODY_CHARS) return null;
  const msgs = Array.isArray(body.messages) ? body.messages.slice(-MAX_MESSAGES) : [];
  if (msgs.some((m) => m && m.role !== 'assistant' && typeof m.content === 'string' && m.content.trim().length > MAX_ANSWER)) return null;
  const messages = msgs.map((m) => ({ role: m && m.role === 'assistant' ? 'assistant' : 'user', content: str(m && m.content, MAX_MSG_CHARS) })).filter((m) => m.content);
  if (!messages.length || messages[messages.length - 1].role !== 'user') return null;
  const userCount = messages.filter((m) => m.role === 'user').length;
  if (userCount > PAID_ROUNDS) return null;
  const s = body.slots && typeof body.slots === 'object' ? body.slots : {};
  const slots = {}; SLOT_KEYS.forEach((k) => { slots[k] = str(s[k], MAX_SLOT_CHARS); });
  if (!slots.place && !slots.people && s.setting) slots.place = str(s.setting, MAX_SLOT_CHARS);
  const stage = STAGES.includes(body.stage) ? body.stage : 'dream';
  const asked = Number.isFinite(Number(body.roundsLeft)) ? Math.floor(Number(body.roundsLeft)) : PAID_ROUNDS - userCount;
  const roundsLeft = Math.max(0, Math.min(asked, PAID_ROUNDS - userCount));
  return { messages, slots, stage, roundsLeft };
}

function plan(input) {
  if (input.roundsLeft === 0) return `FINAL ROUND: revise the moment with their newest words, then end with exactly: "${CLOSE}" No other question. Set done=true.`;
  return input.stage === 'dream' ? `Round 1. Paint the moment, then ask exactly: "${ASK}"` : `They are confirming or refining. Revise the moment, then ask exactly: "${ASK}"`;
}
function clean(text, voice) { let t = String(text || ''); SUBS.forEach(([re, to]) => { t = t.replace(re, to); }); if (voice) t = (t.match(/[^.!?\n]+[.!?]*\s*/g) || [t]).filter((x) => !FEEL_CLAIM.test(x)).join(''); return t.replace(/\s{2,}/g, ' ').replace(/\s+([.,!?])/g, '$1').trim(); }
function stripQuestions(t) { return (String(t).match(/[^.!?\n]+[.!?]*\s*/g) || [t]).filter((x) => !/\?/.test(x)).join('').trim(); }
function shape(raw, input) {
  let o; try { o = JSON.parse(raw); } catch (e) { const m = String(raw || '').match(/\{[\s\S]*\}/); if (!m) return null; try { o = JSON.parse(m[0]); } catch (e2) { return null; } }
  if (!o || typeof o.reply !== 'string' || !o.reply.trim()) return null;
  const slots = {}; const os = o.slots && typeof o.slots === 'object' ? o.slots : {};
  SLOT_KEYS.forEach((k) => { slots[k] = str(os[k], MAX_SLOT_CHARS) || input.slots[k] || ''; });
  if (!slots.feeling) slots.feeling = 'joyful, free and at peace';
  const affirmations = (Array.isArray(o.affirmations) ? o.affirmations : []).map((a) => str(a, 200)).filter(Boolean).slice(0, 4);
  const dream_vision = (Array.isArray(o.dream_vision) ? o.dream_vision : []).map((p) => str(p, 1400)).filter(Boolean).slice(0, 1);
  return { reply: str(o.reply, 1600), slots, affirmations, done: input.roundsLeft === 0 || !!o.done, dream_vision };
}
function hasBanned(r) { const voice = [r.reply].concat(r.dream_vision).join(' '); return BANNED.test(voice + ' ' + r.affirmations.join(' ')) || FEEL_CLAIM.test(voice); }

async function callGrok(input, key, extraNote) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const rounds = input.planNote;
  const context = `Current stage: ${input.stage}. Slots so far: ${JSON.stringify(input.slots)}\n${rounds}\nFIDELITY CHECK: every person, drink, food, object, place and action in your reply must come from their own words; everything you add is only light, color, sound, scent, texture, temperature or feeling.${extraNote ? '\n' + extraNote : ''}`;
  try {
    const res = await fetch(API_URL, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL, temperature: 0.8, max_tokens: 700,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'system', content: context }].concat(input.messages)
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    return content ? shape(content, input) : null;
  } catch (e) { return null; } finally { clearTimeout(timer); }
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const send = (code, obj) => { res.statusCode = code; res.end(JSON.stringify(obj)); };
  if (req.method === 'OPTIONS') { res.setHeader('Allow', 'POST'); return send(204, {}); }
  if (req.method !== 'POST') return send(405, { error: 'method_not_allowed' });
  const key = process.env.XAI_API_KEY;
  if (!key) return send(503, { error: 'unavailable' });
  const ip = String((req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) || (req.socket && req.socket.remoteAddress) || 'anon').split(',')[0].trim();
  if (rateLimited(ip)) return send(429, { error: 'rate_limited' });
  const input = validate(await parseBody(req));
  if (!input) return send(400, { error: 'bad_request' });
  input.planNote = plan(input);
  try {
    let out = await callGrok(input, key);
    if (out && hasBanned(out)) {
      const retry = await callGrok(input, key, 'Your previous draft used a forbidden word or claimed to feel something. Rewrite without vibration, frequency, manifest, goal, higher/highest self, energy, or any claim that you feel or sense.');
      out = retry && !hasBanned(retry) ? retry : out;
      if (hasBanned(out)) { out.reply = clean(out.reply, true); out.affirmations = out.affirmations.map((a) => clean(a)); out.dream_vision = out.dream_vision.map((p) => clean(p, true)); }
      if (hasBanned(out)) out = null;
    }
    if (!out) return send(502, { error: 'unavailable' });
    let body = stripQuestions(out.reply).replace(/Does this feel right\?[^]*$/i, '').replace(/\s*Your dream is ready[^.]*\.?\s*$/i, '').trim();
    const firstTurn = input.stage === 'dream' && input.messages.filter((m) => m.role === 'user').length === 1;
    if (firstTurn && body.indexOf(OPENING) !== 0) body = OPENING + ' ' + body.replace(/^What a beautiful dream[^.]*\.\s*/i, '');
    out.reply = body + '\n\n' + (input.roundsLeft === 0 ? CLOSE : ASK);
    return send(200, out);
  } catch (e) {
    return send(500, { error: 'unavailable' });
  }
};
module.exports.config = { maxDuration: 30 };
