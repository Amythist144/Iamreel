/* I AM REEL Vision Guide: real AI replies via the xAI Grok API.
   POST { messages:[{role,content}], slots:{...}, stage } -> { reply, slots, affirmations, done, dream_vision }
   The key lives only in the XAI_API_KEY environment variable. Errors never expose it. */
'use strict';

const MODEL = process.env.XAI_MODEL || 'grok-4.20-0309-non-reasoning';
const API_URL = 'https://api.x.ai/v1/chat/completions';
const TIMEOUT_MS = 15000;
const MAX_MESSAGES = 24;
const MAX_MSG_CHARS = 1200; // guide replies in history
const MAX_ANSWER = 255;     // each user answer
const PAID_ROUNDS = 6;     // hard cap on user answers (free guide uses 4)
const MAX_SLOT_CHARS = 600;
const MAX_BODY_CHARS = 24000;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 20; // requests per IP per minute (per warm instance)
const SLOT_KEYS = ['dream', 'moment', 'place', 'people', 'feeling'];
const STAGES = ['dream', 'moment', 'setting', 'feeling', 'refine'];
const ENDING = 'Ready to make your dream reel?';
const OPENING = 'What a beautiful dream to hold. Tell me more, and we’ll create a vision blueprint that will help make it feel real to you.';

const BANNED = /\b(vibrat\w*|frequenc\w*|manifest\w*|goals?|high(?:er|est)[ -]self)\b/i;
const FEEL_CLAIM = /\bI\s+(?:can\s+)?(?:feel|sense)\b|\benerg(?:y|ies)\b/i;
const SUBS = [
  [/\bhigh(?:er|est)[ -]self\b/gi, 'best life'],
  [/\bgoals\b/gi, 'dreams'], [/\bgoal\b/gi, 'dream'],
  [/\bmanifest(?:ing|ed|s|ation|ations)?\b/gi, 'create'],
  [/\b(?:raise|raising|high|higher|your|the|this|a)?\s*(?:vibrational?|vibrations?|vibrating|vibrate[sd]?|frequenc(?:y|ies))\b/gi, ' your spirit'],
];

const SYSTEM_PROMPT = `You are the I AM REEL Vision Guide, a warm, poetic guide who helps one person describe ONE dream so it can become personalized images and a cinematic reel of them living it.

HOW YOU REPLY (every turn):
- First, 2–4 sentences of rich sensory imagery in second person, present tense, painting what the person just shared using their own words (turn "I/my" into "you/your"). Light, textures, sounds, scents, temperature, small specific details. Vary your imagery; never reuse a sentence you already wrote.
- Then ask EXACTLY ONE short question for the next missing piece, in this order: dream → moment → place → people → feeling. NEVER ask for something the person already told you (check the slots and the whole conversation). If they said "on a beach", the place is known: do not ask where they are; ask who or what is with them.
- When asking about people/pets, say that anyone besides them will be AI-generated from their description, never a real photo, and give examples like "a handsome man with dark hair and a beard", "my golden retriever" or "a crowd applauding". "Just me" is a complete answer.
- On the very first reply about their dream (stage "dream"), begin with exactly: "${OPENING}" and then paint the imagery.
- Never say generic filler like "that's wonderful, it's in your blueprint now".
- Every reply paints NEW sensory details (a different sense, sound, texture or light) and never reuses an opening phrase or image from your earlier replies in this conversation; build on the newest answer.
- Never put first-person affirmations ("I am…", "I feel…") in the reply; they belong only in the affirmations array.
- Keep it under 110 words, with sentences under 35 words. Put the question on its own line.

WORDS YOU NEVER USE: vibration, vibrational, vibrate, frequency, manifest (any form), goal (say "dream"), higher self or highest self (say "best life"), energy (no "the crowd's energy" either). Never claim you can feel, sense or perceive anything: you cannot feel. Write "picture", "imagine", "see" instead.

CONTENT RULES: keep everything uplifting and tasteful. No sexual or explicit content, profanity, violence or hate. No celebrities, public figures or real named people; no recreating real people from photos; no children or minors in personalized images (gently suggest describing the feeling, or adults, pets and places instead). Only the user appears as themself; everyone else is AI-generated from a description. If a message breaks a rule, kindly steer back without repeating the problem words, and do not fill that slot.

SLOTS: keep short first-person summaries in the user's own words:
- dream: the dream itself
- moment: the one specific moment they want to see themselves in
- place: where it happens
- people: who or what is with them (people described, pets, crowd), or "just me"
- feeling: how they want to feel (comma list of feelings)
Carry forward every slot already known (from the given slots and conversation). Fill any slot the user has implied, even if not asked: if any message mentions a location ("on a beach in Hawaii", "my dream home by the lake", "on stage"), fill place right away; if it mentions a partner, pet, friends or crowd, fill people right away.

AFFIRMATIONS: when the user adds something new, give 1–2 new short first-person present-tense affirmations ("I am…", "I live…", "I feel…") built from their words. Otherwise return [].

DONE: set done=true only when dream, moment, place, people and feeling are all known. Then the reply should paint the full scene in 2–3 sentences and invite them to look over their blueprint below and type "yes" when it feels right (no question about missing slots, no list of affirmations, and do not write "Ready to make your dream reel?" in the reply). Also return dream_vision: exactly two rich paragraphs (60–110 words each), second person, present tense, sensory, weaving in the dream, moment, place, people and feeling; only the second paragraph ends with "${ENDING}".
If stage is "refine", fold the new detail into moment (or the slot it belongs to), paint it in imagery, set done=true and return an updated dream_vision.

Respond ONLY with JSON: {"reply":string,"slots":{"dream":string,"moment":string,"place":string,"people":string,"feeling":string},"affirmations":[string],"done":boolean,"dream_vision":[string,string] or []}`;

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

const SLOT_WORDS = { dream: 'their dream', moment: 'one specific moment they want to see themselves in', place: 'where it happens', people: 'who or what is with them (people, pets, a crowd, or just them)', feeling: 'how they want to feel' };
const PLACE_HINT = [
  /\b(?:on|at|in|by|from|inside|under)\s+((?:a|an|the|my|our)\s+)?((?:[\w'’-]+\s+){0,3}?(?:beach|shore|coast|ocean|island|stage|hall|arena|stadium|home|house|kitchen|lake|lakeside|mountains?|city|office|bakery|caf[eé]|restaurant|garden|forest|yacht|boat|studio|villa|cabin|ranch|farm|paris|hawaii|italy|bali|greece|new york|london|tokyo))\b/i,
  /\b((?:my|our)\s+(?:own\s+|dream\s+|new\s+)?(?:home|house|bakery|studio|cabin|villa|restaurant|caf[eé]|ranch|farm)(?:\s+(?:by|on|in|near)\s+(?:the|a)\s+[\w'’-]+)?)\b/i
];
const PEOPLE_HINT = /\b(husband|wife|partner|boyfriend|girlfriend|fianc[eé]e?|spouse|family|friends?|band|crowd|audience|dog|puppy|cat|kitten|horse|team|customers?|guests|golden retriever)\b/gi;
function hintPlace(t) { for (const re of PLACE_HINT) { const m = t.match(re); if (m) return (m[1] && m[2] ? m[1] + m[2] : (m[2] || m[1])).trim(); } return ''; }
function hintPeople(t) { if (/\b(just me|by myself|only me|alone)\b/i.test(t)) return 'just me'; const m = t.match(PEOPLE_HINT); return m ? Array.from(new Set(m.map((x) => x.toLowerCase()))).join(', ') : ''; }
const STAGE_SLOTS = { dream: ['dream'], moment: ['moment'], setting: ['place', 'people'], feeling: ['feeling'], refine: [] };
function plan(input) {
  const userText = input.messages.filter((m) => m.role === 'user').map((m) => m.content).join(' . ');
  if (!input.slots.place) { const h = hintPlace(userText); if (h) input.slots.place = h; }
  if (!input.slots.people) { const h = hintPeople(userText); if (h) input.slots.people = h; }
  const answering = STAGE_SLOTS[input.stage] || [];
  const missing = SLOT_KEYS.filter((k) => !input.slots[k] && !answering.includes(k));
  input.missingAfter = missing;
  if (input.roundsLeft === 0) return 'ANSWERS LEFT AFTER THIS ONE: 0. This is the FINAL round. Do NOT ask any question. Gently infer any missing slot from the conversation (people "just me" if none were mentioned), set done=true and return the two-paragraph dream_vision. The reply paints the full scene and tells them their dream vision is ready below.';
  if (!missing.length) return 'Every piece is now known. Do not ask any more questions: set done=true, paint the full scene and return dream_vision.';
  const take = input.roundsLeft === 1 ? missing.length : Math.max(1, missing.length - input.roundsLeft + 1);
  const ask = missing.slice(0, take).map((k) => SLOT_WORDS[k]);
  return `ANSWERS LEFT AFTER THIS ONE: ${input.roundsLeft}. Your one question must ask ONLY for: ${ask.join('; and ')}${take > 1 ? ' (combine them into one short, warm question)' : ''}. Do not ask about anything else.`;
}
function stripQuestions(t) { return (String(t).match(/[^.!?\n]+[.!?]*\s*/g) || [t]).filter((x) => !/\?/.test(x)).join('').trim(); }
function clean(text, voice) { let t = String(text || ''); SUBS.forEach(([re, to]) => { t = t.replace(re, to); }); if (voice) t = (t.match(/[^.!?\n]+[.!?]*\s*/g) || [t]).filter((x) => !FEEL_CLAIM.test(x)).join(''); return t.replace(/\s{2,}/g, ' ').replace(/\s+([.,!?])/g, '$1').trim(); }
function shape(raw, input) {
  let o; try { o = JSON.parse(raw); } catch (e) { const m = String(raw || '').match(/\{[\s\S]*\}/); if (!m) return null; try { o = JSON.parse(m[0]); } catch (e2) { return null; } }
  if (!o || typeof o.reply !== 'string' || !o.reply.trim()) return null;
  const slots = {}; const os = o.slots && typeof o.slots === 'object' ? o.slots : {};
  SLOT_KEYS.forEach((k) => { slots[k] = str(os[k], MAX_SLOT_CHARS) || input.slots[k] || ''; });
  const affirmations = (Array.isArray(o.affirmations) ? o.affirmations : []).map((a) => str(a, 200)).filter(Boolean).slice(0, 3);
  if (input.roundsLeft === 0) { // final round: never leave a slot open
    if (!slots.moment) slots.moment = slots.dream;
    if (!slots.people) slots.people = 'just me';
    if (!slots.feeling) slots.feeling = 'joyful, free and at peace';
    if (!slots.place) slots.place = 'somewhere beautiful that feels like home';
  }
  const complete = SLOT_KEYS.every((k) => slots[k]);
  const done = !!o.done && complete;
  let dream_vision = done && Array.isArray(o.dream_vision) ? o.dream_vision.map((p) => str(p, 1400)).filter(Boolean).slice(0, 2) : [];
  if (dream_vision.length) {
    dream_vision = dream_vision.map((p) => p.replace(/\s*Ready to make your dream reel\?\s*/gi, ' ').trim()).filter(Boolean);
    dream_vision[dream_vision.length - 1] += ' ' + ENDING;
  }
  const reply = str(o.reply, 1600).replace(/\s*Ready to make your dream reel\?\s*/gi, ' ').trim();
  return { reply, slots, affirmations, done, dream_vision };
}
function hasBanned(r) { const voice = [r.reply].concat(r.dream_vision).join(' '); return BANNED.test(voice + ' ' + r.affirmations.join(' ')) || FEEL_CLAIM.test(voice); }

async function callGrok(input, key, extraNote) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const rounds = input.planNote;
  const context = `Current stage: ${input.stage}. Known slots so far (do not re-ask any non-empty one): ${JSON.stringify(input.slots)}\n${rounds}${extraNote ? '\n' + extraNote : ''}`;
  try {
    const res = await fetch(API_URL, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL, temperature: 0.9, max_tokens: 700,
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
    const imagery = (r) => stripQuestions(r.reply.replace(OPENING, '')).replace(/[^.!]*\b(blueprint|type "?yes"?)\b[^.!]*[.!]?/gi, '').trim().length;
    if (out && imagery(out) < 60) {
      const again = await callGrok(input, key, 'Your draft skipped the imagery. Begin with 2–4 vivid sensory sentences painting what they shared, then the question.');
      if (again && !hasBanned(again) && imagery(again) >= 60) out = again;
    }
    if (out && input.roundsLeft === 0 && !out.dream_vision.length) {
      const again = await callGrok(input, key, 'FINAL ROUND: you must set done=true and return the two-paragraph dream_vision now. No questions.');
      if (again && !hasBanned(again) && again.dream_vision.length) out = again;
    }
    if (!out) return send(502, { error: 'unavailable' });
    if (input.roundsLeft === 0) { out.reply = (stripQuestions(out.reply) || out.reply.replace(/\?/g, '.')).replace(/\s*(Look it over and )?type "?yes"?[^.!]*[.!]?/gi, '').trim(); out.done = SLOT_KEYS.every((k) => out.slots[k]); }
    const firstTurn = input.stage === 'dream' && input.messages.filter((m) => m.role === 'user').length === 1;
    if (firstTurn && out.reply.indexOf('What a beautiful dream to hold') !== 0) out.reply = OPENING + '\n\n' + out.reply.replace(/^What a beautiful dream[^.]*\.\s*(Tell me more[^.]*\.)?\s*/i, '');
    return send(200, out);
  } catch (e) {
    return send(500, { error: 'unavailable' });
  }
};
module.exports.config = { maxDuration: 30 };
