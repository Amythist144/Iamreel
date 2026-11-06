/* I AM REEL — Vision Guide (pre-payment)
   A warm, one-question-at-a-time guided chat that builds a Vision Blueprint,
   progressive affirmations and a dream vision, then offers products.
   - Inline mode: renders inside any element with [data-vision-guide-inline] (create.html).
   - Launcher mode: a right-side tab that opens the guide in a dialog (all other pages).
   - Prices come only from window.IAMREEL_PRODUCTS (iam-config.js).
   - No photo upload and no AI face/likeness before purchase.
   Data shape stays compatible with the paid flow (visions.blueprint jsonb,
   affirmations.statement/sort_order, vision_messages.role/content). */
(function () {
  'use strict';
  if (window.__iamreelVisionGuide) return;
  window.__iamreelVisionGuide = true;

  var SUPABASE_URL = 'https://jtlqvxcmbgqtcpdhldbm.supabase.co';
  var SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  var STATE_KEY = 'iamreel_prepay_vision_v1';
  var SAVED_KEY = 'iamreel_saved_vision_v1';
  var script = document.currentScript;
  var base = script ? script.src : location.href;
  var asset = function (path) { return new URL('../../' + path, base).href; };
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };

  /* ---------------- Answer limits ----------------
     Each answer is at most 255 characters. The free guide allows 2 rounds (round 1: their dream, round 2: confirm or refine);
     paid customers get 6. Paid is a hook for after checkout: set window.IAMREEL_GUIDE_PAID = true before guide.js loads,
     or localStorage 'iamreel_guide_paid' = '1'. Override counts with window.IAMREEL_GUIDE_ROUNDS = { free: 2, paid: 6 }. */
  var MAX_ANSWER = 255;
  var IAMREEL_GUIDE_ROUNDS = Object.assign({ free: 2, paid: 6 }, window.IAMREEL_GUIDE_ROUNDS || {});
  var LIMIT_NOTE = 'Your dream vision is ready. Save it to your Sanctuary, or start over to dream again.';
  function limitNote() { return (typeof state !== 'undefined' && state && state.sample) ? SAMPLE_LIMIT_NOTE : LIMIT_NOTE; }
  function isPaid() { try { return window.IAMREEL_GUIDE_PAID === true || localStorage.getItem('iamreel_guide_paid') === '1'; } catch (e) { return window.IAMREEL_GUIDE_PAID === true; } }
  function maxRounds() { return Math.max(1, Math.min(isPaid() ? IAMREEL_GUIDE_ROUNDS.paid : IAMREEL_GUIDE_ROUNDS.free, 6)); }
  function roundsUsed() { return (typeof state !== 'undefined' && state && state.rounds) || 0; }
  function roundsLeft() { return Math.max(0, maxRounds() - roundsUsed()); }
  function limitReached() { return roundsLeft() <= 0; }
  function roundsText() { var n = roundsLeft(); return n === maxRounds() ? 'You have ' + n + ' answers: share your dream, then refine it.' : n + (n === 1 ? ' answer' : ' answers') + ' left to paint your dream.'; }

  /* ---------------- Questions (one at a time) ---------------- */
  var QUESTIONS = [
    { key: 'dream', label: 'Your dream', ask: 'Let’s begin with one dream. What would you love to see yourself living? Just type it the way you’d tell a close friend.', placeholder: 'For example: travel the world with the love of my life…' },
    { key: 'moment', label: 'Specific moment', ask: 'Now picture that dream as already real. What’s one specific moment you’d love to see yourself in? (Like “walking hand in hand along a sunrise beach” or “opening the door to my new home.”)', placeholder: 'The moment I see myself in…' },
    { key: 'setting', label: 'People, pets & place', ask: 'Where are you, and who or what is with you? Describe the place and any people or pets. Anyone besides you will be AI-generated, not a real photo, so simply describe them, like “a handsome man with dark hair and a beard,” “my golden retriever” or “a crowd applauding.”', placeholder: 'Where I am and who is with me…' },
    { key: 'feeling', label: 'Desired feeling', ask: 'How do you want to feel in that moment? Name the feelings: peaceful, adored, free, proud, abundant… whatever is true for you.', placeholder: 'I want to feel…' }
  ];
  /* "Try a sample vision": a hardcoded abundance dream in the same 2 short rounds a visitor gets (no API call). */
  var SAMPLE_TURNS = [
    { user: 'I am successful and abundant',
      fields: { dream: 'I am successful and abundant', moment: 'You wake in soft white linen as morning light warms your skin, your phone chimes with another sale, and your bank balance makes you exhale and smile.', feeling: 'Abundant, secure and at ease' },
      affirm: ['I am successful and abundant.', 'Money flows to me easily, and there is always more than enough.', 'I feel abundant, secure and at ease.'],
      reply: 'What a beautiful dream to hold. Picture it: you wake slowly in soft white linen, morning light warm across your skin, and your phone lights up with the little chime of another sale. You open your bank balance and it makes you exhale and smile. There is more than enough, and it keeps arriving. Your shoulders soften with a deep, quiet security.\n\nIs this the dream you’d love to see?' },
    { user: 'Yes! And I’m on the terrace of my white villa on the coast with my golden retriever.',
      fields: { dream: 'I am successful and abundant, living in my white villa on the coast with my golden retriever', moment: 'On the sunny terrace of your white villa on the coast, your laptop chimes with sales while your golden retriever dozes at your feet and sea air drifts in, warm and salty.', feeling: 'Abundant, free, proud and at ease' },
      affirm: ['I am successful and abundant.', 'I live in my white villa on the coast, and my life is full of ease.', 'Money flows to me easily, and there is always more than enough.', 'I feel abundant, free, proud and at ease.'],
      reply: 'Here it is, even brighter. The terrace stone is warm under your bare feet at your white villa on the coast, and sea air drifts in, salty and soft. Your laptop chimes with one sale after another while your golden retriever dozes at your feet, tail thumping when you laugh. You lean back, free and proud, with more than enough.\n\nDoes this feel right? Your dream is ready, with your feelings and affirmations, in Your dream.' }
  ];
  var SAMPLE_VISION = [
    'Close your eyes and let it be real. You are successful and abundant. On the sunny terrace of your white villa on the coast, the stone is warm under your bare feet and sea air drifts in, salty and soft. Your laptop chimes with sale after sale while your golden retriever dozes at your feet, tail thumping each time you laugh. You feel abundant, free, proud and at ease, not as a wish but as the simple truth of your life. This is your best life, already unfolding.'
  ];
  var SAMPLE_NOTE = 'Here’s a sample dream so you can see how your Vision Guide works. Watch it unfold, then tap “Start over” to share your own.';
  var SAMPLE_LIMIT_NOTE = 'This is a sample vision. Tap “Start over” to share your own dream.';
  var SAMPLE_TAG = '<span class="vg-sample-tag">Sample vision</span>';
  var KALEIDO = 'Each I AM REEL experience begins and ends with a mesmerizing kaleidoscope visual to quiet the mind, enhance receptivity, and open your imagination to the future you desire.';
  var SAVE_LABEL = 'Save this dream to my sanctuary';
  var SAVE_NOTE = 'After you choose a personalized vision, you can modify and enhance it in your private Sanctuary vision guide. That’s where you’ll pick your format, Youthing, people and pets, body type, outfits and favorite colors.';
  var PRODUCT_ORDER = ['cinematic_reel', 'dream_portrait', 'dream_scenes_3', 'vision_board_8', 'video_meditation'];
  var PRODUCT_COPY = {
    cinematic_reel: 'Your dream, filmed. Up to 6 cinematic clips, up to about 70 seconds: up to 6 ten-second scenes of you living several moments of your dream, woven with your affirmations and set to an original soundtrack with specific frequencies that help raise your vibration to match the dream (no voices). ' + KALEIDO + ' After you choose your reel, you’ll describe your dream life in your Sanctuary. Choose Widescreen, like YouTube or TV, or Mobile for your phone, in 720p HD.',
    dream_portrait: 'One stunning personalized image of you inside your dream, a single vivid reminder of who you’re becoming.',
    dream_scenes_3: 'Three personalized scenes that tell your dream like a story: the moment, the place and the feeling, all with you in them.',
    vision_board_8: 'A personalized Vision Board with 6 images from your dream, framed by your affirmations, designed as one beautiful board for your wall, desk or screen.',
    video_meditation: 'A guided meditation video built from 3 personalized images of you living your dream, paired with your own affirmations. ' + KALEIDO
  };
  /* Codes the existing Vision Collection checkout already knows (collection.html names map). */
  var COLLECTION_CODES = ['cinematic_reel', 'dream_portrait', 'dream_scenes_3', 'vision_board_8', 'video_meditation'];

  /* ---------------- Content guidelines ---------------- */
  var GUIDELINES = 'A loving note: keep your vision uplifting and personal. We don’t create explicit or sexual content, strong language, violence or hate, celebrities or public figures, real people other than you, or children in personalized images. Anyone else in your scenes is AI-generated from your description.';
  var RULES = [
    { cat: 'explicit', re: /\b(porn\w*|nudes?|naked|nudity|topless|bottomless|xxx|nsfw|erotic\w*|fetish\w*|sex|sexual\w*|intercourse|orgasm\w*|genital\w*|boobs?|tits|penis|vagina|lingerie|stripper|strip ?club|striptease|onlyfans|horny)\b/,
      msg: 'Let’s keep your vision beautiful and tasteful. Romance and closeness are welcome, but we don’t create explicit or sexual content. Could you describe the feeling of the moment instead, like being adored, close and safe?' },
    { cat: 'profanity', re: /\b(fuck\w*|f\*+k\w*|shit\w*|bullshit|bitch\w*|cunt\w*|asshole\w*|motherf\w*|dickhead\w*|bastard\w*|whore\w*|slut\w*|pissed)\b/,
      msg: 'There’s so much passion in that! Let’s keep your vision beautiful. Could you say it again without the strong language?' },
    { cat: 'violence', re: /\b(kill(?!\s+it\b)|kills|killing(?!\s+it\b)|murder\w*|stab\w*|behead\w*|massacre\w*|tortur\w*|gore|gory|bomb(s|ing)?|terroris\w*|rape\w*|raping|assault\w*|revenge|weapons?|guns?|rifles?|shoot (him|her|them|people)|hurt (him|her|them)|destroy (him|her|them)|nazi\w*|kkk|white power|heil|genocide|ethnic cleansing|hate (all|those|every))\b/,
      msg: 'Your vision is a place of peace and possibility, so we don’t create violent or hateful imagery. What would it look like if that fire became something you’re building or celebrating?' },
    { cat: 'celebrity', re: /\b(celebrit(y|ies)|famous (person|people|actor|actress|singer|rapper|athlete)|public figure|movie star|taylor swift|beyonc[eé]|oprah|elon musk|donald trump|trump|joe biden|biden|barack obama|obama|kamala harris|kim kardashian|kardashians?|brad pitt|angelina jolie|tom cruise|tom hanks|leonardo dicaprio|dicaprio|rihanna|drake|kanye|lady gaga|ariana grande|justin bieber|selena gomez|jennifer aniston|jennifer lopez|j\.?lo|george clooney|dwayne johnson|keanu reeves|ryan reynolds|ryan gosling|chris hemsworth|zendaya|harry styles|ed sheeran|adele|lebron( james)?|michael jordan|tom brady|cristiano ronaldo|ronaldo|lionel messi|messi|serena williams|king charles|prince harry|prince william|meghan markle|kate middleton|the pope|prime minister|the president)\b/,
      msg: 'This dream is all about you, so we don’t include celebrities or public figures. You can describe the kind of person instead, like “a legendary musician joining me on stage” or “a crowd of thousands applauding.”' },
    { cat: 'realperson', re: /(\b(photo|picture|pic|image|face|likeness)s?\s+of\s+(my|his|her|their|a real|real)\b|\b(my|his|her)\s+\w+['’]s\s+(face|photo|picture)\b|\blooks?\s+(exactly\s+)?like\s+(my|a real|the real|the actor|the actress|the singer)\b|\breal (person|people)\b|\buse (a |the )?(photo|picture|pic)s? of\b)/,
      msg: 'Only you appear as yourself. Everyone else in your images is AI-generated, so we don’t recreate real people from photos or likenesses. Describe how you’d love them to look instead, like “a handsome man with dark hair and a beard.”' },
    { cat: 'minor', imageryOnly: true, re: /(\b(kids?|kiddos?|child|children|babies|baby|toddlers?|infants?|newborns?|teens?|teenagers?|preteens?|minors?|schoolgirls?|schoolboys?|grandkids?|grandchild(ren)?|grandbab(y|ies)|little (girl|boy)s?|young (girl|boy)s?)\b|\b(1[0-7]|[1-9])[- ]?(year|yr)s?[- ]?old\b)/,
      msg: 'To protect children, our personalized images don’t include minors. Keep your family’s love in your heart and your affirmations, and for this scene describe adults, pets or the feeling of family, like “a home filled with laughter.”' }
  ];
  var IMAGERY_FIELDS = { moment: 1, setting: 1 };
  function checkContent(text, field) {
    var t = ' ' + String(text || '').toLowerCase().replace(/[’`]/g, "'") + ' ';
    for (var i = 0; i < RULES.length; i++) {
      var r = RULES[i];
      if (r.re.test(t)) {
        if (r.imageryOnly && !IMAGERY_FIELDS[field]) return { ok: true, soft: r.cat, message: 'I’ll keep your love for your family in your words and affirmations. To protect children, your personalized images will focus on you, adults and pets.' };
        return { ok: false, cat: r.cat, message: r.msg };
      }
    }
    return { ok: true };
  }

  /* ---------------- Language helpers ---------------- */
  var VERBS = ('accept achieve adopt attend become begin bring build buy celebrate climb coach complete create dance design discover drive earn enjoy explore feel find finish fly get give go graduate grow have heal help hike hold host inspire invest join launch lead learn live love make marry meet move open own paint perform play publish raise read receive record relax renovate retire ride run sail see sell serve share shine sing sit speak start stand step swim take teach thrive travel visit walk wake watch wear win work write').split(' ');
  var GERUND = { be: 'being', have: 'having', lie: 'lying', die: 'dying', see: 'seeing', run: 'running', swim: 'swimming', get: 'getting', sit: 'sitting', win: 'winning', begin: 'beginning', shop: 'shopping', travel: 'traveling', plan: 'planning', stop: 'stopping', put: 'putting', set: 'setting', hug: 'hugging', jog: 'jogging', flee: 'fleeing', agree: 'agreeing' };
  function gerund(v) {
    if (GERUND[v]) return GERUND[v];
    if (/ie$/.test(v)) return v.slice(0, -2) + 'ying';
    if (/[^eoy]e$/.test(v)) return v.slice(0, -1) + 'ing';
    return v + 'ing';
  }
  function clean(text) {
    var t = String(text || '').replace(/\s+/g, ' ').trim();
    if (t.length > 220) { var first = t.split(/[.!?]\s/)[0]; t = first.length > 30 ? first : t.slice(0, 220).replace(/\s+\S*$/, ''); }
    return t.replace(/[\s.!,;:]+$/, '');
  }
  function cap(t) { return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }
  function lowerFirst(t) { return t && !/^I\b/.test(t) && !/^[A-Z]{2}/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t; }
  function stripLead(t) {
    return t.replace(/^(and|so|well|um|oh)[, ]+/i, '')
      .replace(/^(i\s+(really\s+|truly\s+)?(want|would\s+love|'d\s+love|’d\s+love|wish|hope|dream|need|plan|desire|long|am\s+ready|'m\s+ready|’m\s+ready)(\s+to)?(\s+be\s+able\s+to)?\s+|my\s+dream\s+is\s+(to\s+)?|i\s+see\s+myself\s+|i\s+imagine\s+(myself\s+)?|to\s+)/i, '')
      .trim();
  }
  /* Returns a present-tense, first-person clause ("I am walking…") or null for a noun phrase. */
  function presentClause(text) {
    var t = clean(text); if (!t) return null;
    var m;
    if ((m = t.match(/^i\s*(?:'ll|’ll| will)\s+be\s+(.*)$/i))) return 'I am ' + m[1];
    if ((m = t.match(/^i\s*(?:'ll|’ll| will)\s+(\w+)\s*(.*)$/i))) return ('I ' + m[1] + ' ' + m[2]).trim();
    if (/^(i am|i'm|i’m|i have|i've|i’ve|i)\b/i.test(t) && !/^i\s+(really\s+|truly\s+)?(want|would|'d|’d|wish|hope|dream|need|plan|desire|long|see myself|imagine)\b/i.test(t)) return 'I' + t.slice(1);
    var s = stripLead(t); if (!s) return null;
    var words = s.split(' '), w0 = words[0].toLowerCase(), rest = words.slice(1).join(' ');
    if (w0 === 'be') return ('I am ' + rest).trim();
    if (w0 === 'have') return ('I have ' + rest).trim();
    if (w0 === 'feel') return ('I feel ' + rest).trim();
    if (VERBS.indexOf(w0) > -1) return ('I am ' + gerund(w0) + ' ' + rest).trim();
    if (/ing$/.test(w0) && w0.length > 4) return ('I am ' + s.charAt(0).toLowerCase() + s.slice(1)).trim();
    return null;
  }
  function nounPhrase(text) { return lowerFirst(stripLead(clean(text))); }
  function toYou(t) {
    return String(t || '')
      .replace(/\bI am\b/g, 'you are').replace(/\bI'm\b|\bI’m\b/g, 'you’re').replace(/\bI've\b|\bI’ve\b/g, 'you’ve')
      .replace(/\bI'll\b|\bI’ll\b/g, 'you’ll').replace(/\bI'd\b|\bI’d\b/g, 'you’d').replace(/\bI was\b/g, 'you were')
      .replace(/\bI\b/g, 'you').replace(/\bmyself\b/gi, 'yourself').replace(/\bmy\b/g, 'your').replace(/\bMy\b/g, 'Your')
      .replace(/\bmine\b/gi, 'yours').replace(/\bme\b/gi, 'you').replace(/\bam\b/g, 'are');
  }
  function feelingList(text) {
    var t = clean(text).replace(/^(i\s+(want|would\s+love|'d\s+love|’d\s+love|wish|hope)\s+to\s+feel\s+|i\s+feel\s+|to\s+feel\s+|feel(ing)?\s+)/i, '');
    return lowerFirst(t);
  }
  function short(t, n) { t = clean(t); n = n || 90; return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t; }
  var PEOPLE_RE = /\b(man|woman|men|women|partner|husband|wife|boyfriend|girlfriend|fianc[eé]e?|friend|friends|family|mom|mother|dad|father|sister|brother|crowd|people|team|audience|guests|someone|lover|spouse)\b/i;
  var PET_RE = /\b(dog|dogs|puppy|cat|cats|kitten|horse|horses|pet|pets|retriever|parrot|bird)\b/i;
  /* ---------------- Imagery engine (rule-based "dream painter") ----------------
     Detects settings and details in the visitor's own words and paints them back as a
     short, sensory, second-person present-tense scene. Phrase banks are varied and the
     chat never repeats a line it has already used. The guide never claims to feel anything. */
  var THEMES = [
    { id: 'beach', place: true, prep: 'on', label: 'the beach', re: /\b(beach(es)?|ocean|sea ?side|seashore|shore|island|tropical|surf(ing)?|waves?|lagoon|coast(line)?|bahamas|hawaii|maldives|caribbean|bali|tahiti|fiji|cabo|cancun)\b/i,
      noun: /\b(beach|island|shore|ocean|coast|lagoon)\b/i,
      lines: ['Warm sand gives softly beneath you, and the water glows turquoise all the way to the horizon.',
        'Palm fronds sway overhead, scattering lacy shadows across your skin while the waves roll in, slow and unhurried.',
        'The breeze tastes faintly of salt and coconut, and the sun rests like a warm hand on your shoulders.',
        'Out past the reef the sea sparkles silver, and each wave sighs onto the shore and slips back again.',
        'Your toes sink into sun-warmed sand, and the only sound is the hush of the tide.'] },
    { id: 'stage', place: true, prep: 'on', label: 'that stage', re: /\b(stage|audience|awards?|applause|applaud\w*|concert|perform\w*|spotlight|microphone|mic|keynote|standing ovation|trophy|oscar|grammy|emmy|podium|ceremony|crowd|sold[- ]out|arena)\b/i,
      noun: /\b(stage|arena|ceremony|concert|podium)\b/i,
      lines: ['Warm stage lights pour over you, and beyond them a sea of faces rises to its feet.',
        'The applause rolls toward you like a wave, and the award is cool, solid and real in your hands.',
        'Your heart is steady and full as you step to the microphone, and the whole room leans in to listen.',
        'Golden light, the rustle of a thousand people standing, and a cheer that seems to go on and on.',
        'You look out at the glowing room and smile, because every step of the journey led you right here.'] },
    { id: 'home', place: true, prep: 'in', label: 'your home', re: /\b(house|home|kitchen|living room|porch|backyard|patio|front door|keys to|bedroom|villa|estate|farmhouse|mansion|cottage|condo|apartment)\b/i,
      noun: /\b(home|house|kitchen|living room|porch|backyard|patio|villa|estate|farmhouse|mansion|cottage|condo|apartment)\b/i,
      lines: ['Sunlight pours through tall windows and spills across warm wooden floors.',
        'The rooms are bright and peaceful, and the air smells of fresh coffee and something sweet baking in the oven.',
        'Every corner is just as you imagined it: soft linens, open space, and a view that makes you exhale.',
        'A breeze drifts through an open door, carrying the scent of flowers from the garden.',
        'You run your hand along the smooth countertop and smile, because this place is truly yours.'] },
    { id: 'mountain', place: true, prep: 'in', label: 'the mountains', re: /\b(mountains?|cabin|alps|peaks?|summit|ridge|chalet|hik(e|es|ing)|trail|canyon|valley)\b/i,
      noun: /\b(mountains?|cabin|alps|summit|chalet|canyon|valley)\b/i,
      lines: ['Crisp, pine-scented air fills your lungs, and the peaks glow rose and gold around you.',
        'The valley spreads out below like a quilt of green and gold, and the sky feels close enough to touch.',
        'The quiet up here is vast and kind; you can hear the wind moving through the trees.',
        'A fire crackles nearby, and the first stars are appearing above the ridgeline.'] },
    { id: 'city', place: true, prep: 'in', label: 'the city', re: /\b(city|penthouse|skyline|downtown|rooftop|new york|manhattan|loft|high[- ]rise|london|tokyo|chicago|dubai|los angeles|miami)\b/i,
      noun: /\b(city|penthouse|skyline|rooftop|new york|manhattan|loft|london|tokyo|chicago|dubai|los angeles|miami)\b/i,
      lines: ['Floor-to-ceiling windows frame the skyline, and the city lights shimmer like a field of stars.',
        'Far below, the streets hum with life, and up here everything is calm, polished and yours.',
        'The evening air on the rooftop is soft and warm, and the whole city seems to glitter just for you.',
        'Your heels click across a gleaming floor as the skyline turns pink and gold at dusk.'] },
    { id: 'travel', place: true, prep: 'in', label: 'this place', re: /\b(travel\w*|plane|flight|first class|jet|paris|france|italy|rome|venice|tuscany|amalfi|greece|santorini|europe|abroad|around the world|passport|yacht|cruise|sail(ing)?|vacation|safari|japan|spain|barcelona|portugal|iceland|switzerland)\b/i,
      noun: /\b(paris|italy|rome|venice|tuscany|amalfi|greece|santorini|europe|japan|spain|barcelona|portugal|iceland|switzerland|yacht|first class)\b/i,
      lines: ['Your passport is worn soft from adventure, and a new horizon is waiting just outside the window.',
        'Cobblestone streets glow in the late-afternoon light, and the air smells of fresh bread and espresso.',
        'The world opens in front of you, one breathtaking view after another, and you are free to wander every one.',
        'A warm breeze carries the sound of church bells, laughter at café tables, and a language you are falling in love with.'] },
    { id: 'nature', place: true, prep: 'by', label: 'the water', re: /\b(forest|woods|lake|river|meadow|waterfall|garden|flowers|wildflowers|field|countryside|vineyard|ranch|farm)\b/i,
      noun: /\b(forest|woods|lake|river|meadow|waterfall|garden|vineyard|ranch|farm|countryside)\b/i,
      lines: ['Tall trees whisper overhead, and sunlight filters down in soft golden beams.',
        'The water lies still as glass, mirroring the sky, and the air smells of moss and wildflowers.',
        'Birdsong drifts through the green, and the grass is cool and soft beneath your feet.',
        'Wildflowers nod in the breeze, and the whole world seems to be breathing slowly with you.'] },
    { id: 'snow', place: false, re: /\b(snow\w*|ski(ing)?|winter|christmas|holidays?|fireplace)\b/i,
      lines: ['Snow drifts down in slow, silent flakes, and your breath clouds in the crisp air.',
        'Inside, a fire crackles and a mug warms your hands while the world outside glitters white.'] },
    { id: 'work', place: false, re: /\b(office|business|laptop|clients?|company|ceo|entrepreneur|startup|desk|typing|my brand|launch\w*|sales|customers?|bestsell\w*|my book|author|career|promotion|team)\b/i,
      lines: ['Your laptop glows with good news: another client, another yes, your business humming along beautifully.',
        'Each soft click of the keys builds something that is entirely yours.',
        'Messages of thanks arrive from people you have helped, and your calendar is full of work you love.',
        'You glance at the numbers and smile; what you built is thriving and still growing.'] },
    { id: 'car', place: false, re: /\b(car|convertible|tesla|porsche|ferrari|mercedes|bmw|range rover|jeep|road trip|driv(e|ing))\b/i,
      lines: ['The leather is smooth and warm under your hands, and the engine purrs as the open road unrolls ahead.',
        'Sunlight flashes off the polished hood, and the wind plays through your hair.'] },
    { id: 'wedding', place: false, re: /\b(wedding|bride|groom|marry(ing)?|married|vows?|engaged|proposal|propose[sd]?)\b/i,
      lines: ['Flowers, soft music and the glow of candles surround you as you say yes to forever.',
        'Every face around you is shining, and the one you love is looking at you as if you are the whole world.'] },
    { id: 'love', place: false, re: /\b(partner|husband|wife|boyfriend|girlfriend|fianc[eé]e?|soul ?mate|love of my life|romance|romantic|hand in hand|lover|spouse|handsome|beautiful (man|woman))\b/i,
      lines: ['Someone who adores you is right beside you, their hand warm in yours.',
        'You catch each other’s eyes and laugh at nothing at all, completely at ease.',
        'There is a gentleness between the two of you that makes the whole world slow down.'] },
    { id: 'family', place: false, re: /\b(family|mom|mother|dad|father|sisters?|brothers?|parents|cousins|aunt|uncle|loved ones)\b/i,
      lines: ['The people you love most gather around a long table, passing plates and laughing until their cheeks hurt.',
        'Hugs linger a little longer here, and the room is full of warmth and easy laughter.'] },
    { id: 'friends', place: false, re: /\b(friends?|besties|girls trip|guys trip|my people|tribe)\b/i,
      lines: ['Your favorite people are all around you, glasses raised, the laughter loud and easy.'] },
    { id: 'dog', place: false, pet: true, re: /\b(dogs?|pupp(y|ies)|retriever|lab|labrador|poodle|doodle|shepherd|corgi|husky)\b/i,
      lines: ['Your dog bounds happily through the scene, tail wagging, then flops down at your feet with a contented sigh.',
        'A wet nose nudges your hand, and your dog’s whole body wiggles with joy.'] },
    { id: 'cat', place: false, pet: true, re: /\b(cats?|kittens?|kitty)\b/i,
      lines: ['A cat curls up in a patch of sunlight nearby, purring softly.'] },
    { id: 'horse', place: false, pet: true, re: /\b(horses?|pony|ponies|mare|stallion)\b/i,
      lines: ['A beautiful horse nuzzles your shoulder, its coat warm and gleaming in the sun.'] },
    { id: 'money', place: false, re: /\b(money|abundan\w*|wealth\w*|rich|millionaire|debt[- ]free|financial\w*|income|savings|paid off|mortgage|investments?|retire\w*)\b/i,
      lines: ['Every bill is paid, your savings keep growing, and there is more than enough to share.',
        'You check your accounts and simply smile; money comes to you easily and stays.',
        'You say yes to what you love without a second thought, because there is plenty.'] },
    { id: 'health', place: false, re: /\b(health\w*|run(ning)?|runner|marathon|fit|fitness|strong|gym|weight|lean|toned|heal(ed|ing)?|athlet\w*|swim(ming)?)\b/i,
      lines: ['Your body is strong and light, and every breath is deep and easy.',
        'You move with a lightness you have not known in years, your muscles strong and your skin glowing.',
        'Your heart beats strong and steady, and you finish with a smile, ready for more.'] },
    { id: 'yoga', place: false, re: /\b(yoga|meditat\w*|pilates|stretch\w*)\b/i,
      lines: ['Your mat is warm beneath your palms as you flow from pose to pose, calm and strong.'] }
  ];
  var TIME_LINES = [
    { re: /\bsunset|dusk|golden hour|evening\b/i, line: 'The sun sinks low and paints everything in honey and rose.' },
    { re: /\bsunrise|dawn|morning\b/i, line: 'The first light of morning spills across everything in soft peach and gold.' },
    { re: /\bnight|stars|starry|moon\w*\b/i, line: 'Overhead, the sky is scattered with stars, and the night air is soft and warm.' }
  ];
  var GENERIC_LINES = ['The light around you is soft and golden, and every color is a little brighter than you remember.',
    'Your shoulders are loose, your breath is slow, and a quiet smile will not leave your face.',
    'The air is warm, the world feels wide open, and you are exactly where you are meant to be.',
    'Everything about this moment tells you that you belong here, and that you always did.',
    'There is no rush and nowhere else to be, only this moment, unfolding beautifully around you.'];
  var FEELING_LINES = [
    { re: /peace\w*|calm|serene|relaxed|at ease|still/i, line: 'Your breath slows, your shoulders soften, and there is nowhere else you need to be.' },
    { re: /\bfree\b|freedom|light|unbound/i, line: 'There is so much space around you and inside you, like a window thrown wide open on a summer day.' },
    { re: /lov(ed|ing)|adored|cherished|desired|seen|wanted/i, line: 'You are wrapped in tenderness, completely seen and completely cherished.' },
    { re: /proud|accomplished|successful|powerful|confident|unstoppable|strong/i, line: 'You stand a little taller, chin lifted, knowing in your bones that you earned every bit of this.' },
    { re: /abundan|wealthy|prosperous|rich|secure|safe/i, line: 'There is a deep, quiet security in you now, the knowing that you have more than enough.' },
    { re: /joy\w*|happy|happiness|delight\w*|excited|alive|ecstatic|giddy/i, line: 'Joy bubbles up and spills over into laughter you could not hold back if you tried.' },
    { re: /grateful|thankful|blessed/i, line: 'Gratitude fills your chest like warm sunlight, soft and steady.' },
    { re: /connected|belong\w*|whole|complete|fulfilled|content/i, line: 'Everything feels whole and connected, as if every piece of your life has clicked gently into place.' },
    { re: /hope\w*|inspired|purpose\w*|meaning\w*/i, line: 'A bright sense of purpose glows in you, steady as a candle flame.' }
  ];
  var DRINK_RE = /\b((?:frozen|iced|cold|chilled|hot|fresh|tall)\s+)?(daiquiris?|margaritas?|pi[nñ]a coladas?|mojitos?|cocktails?|champagne|prosecco|wine|ros[eé]|lemonade|coconut water|coconut|smoothie|coffee|latte|cappuccino|espresso|tea|mai tai|sangria)\b/i;
  var HOT_DRINK_RE = /^(hot|coffee|latte|cappuccino|espresso|tea)/i;
  var OPENERS = {
    moment: ['Oh, stay right there for a moment.', 'Let’s step right into it.', 'What a moment to live in.', 'Mmm, picture it with me.', 'Beautiful. Let’s slow it down and look closer.'],
    setting: ['Now the whole scene is coming alive.', 'I can picture it so clearly now.', 'Oh, that makes it even more beautiful.', 'Lovely. Let’s fill in the scene.'],
    feeling: ['Let that settle in for a moment.', 'Breathe that in.', 'Yes. Hold that feeling close.'],
    more: ['Ooh, I love that detail.', 'Even more beautiful.', 'That brings it into focus.']
  };

  function hashStr(s) { var h = 2166136261; s = String(s || ''); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function seededRng(seed) { var x = seed || 1; return function () { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 100000) / 100000; }; }
  function detectThemes(text) {
    var t = String(text || '');
    return THEMES.filter(function (th) { return th.re.test(t); });
  }
  /* The place in their own words: "a tropical beach", "my dream home", "Paris". */
  function placeFor(text) {
    var t = String(text || '');
    for (var i = 0; i < THEMES.length; i++) {
      var th = THEMES[i]; if (!th.place || !th.re.test(t)) continue;
      var nounRe = th.noun || th.re, m = t.match(nounRe), phrase = th.label;
      if (m) {
        var before = t.slice(0, m.index).split(/\s+/).filter(Boolean).slice(-3), words = [];
        for (var j = before.length - 1; j >= 0; j--) { var w = before[j].replace(/[^\w’'-]/g, ''); if (!w) break; words.unshift(w); if (/^(a|an|the|my|our)$/i.test(w)) break; if (words.length >= 3 || /^(on|in|at|to|by|from|of|with|and|while|is|am|are)$/i.test(w)) { words.shift(); break; } }
        var det = words.length && /^(a|an|the|my|our)$/i.test(words[0]);
        phrase = det ? words.concat([m[0]]).join(' ').toLowerCase().replace(/^our\b/, 'my') : (/^[A-Z]/.test(m[0]) || /^(paris|italy|rome|venice|tuscany|greece|santorini|europe|japan|spain|barcelona|portugal|iceland|switzerland|new york|manhattan|london|tokyo|chicago|dubai|los angeles|miami|hawaii|bali|fiji)$/i.test(m[0]) ? cap(m[0]) : 'the ' + m[0].toLowerCase());
        if (/^(the|a|an) (mountain|peak)$/i.test(phrase)) phrase = 'the mountains';
      }
      return { id: th.id, prep: /^(the|a|an|my) (yacht|stage|podium|beach|shore|island|coast|lagoon)/i.test(phrase) ? 'on' : /^(the|a|an|my) (lake|river|ocean|waterfall)/i.test(phrase) ? 'by' : /^(the|a|an|my) (home|house)/i.test(phrase) ? 'in' : (/^[A-Z]/.test(phrase) ? 'in' : th.prep), phrase: phrase };
    }
    return null;
  }
  function hasPeople(text) { return PEOPLE_RE.test(text || '') || /\b(crowd|audience|applause|applauding|guests)\b/i.test(text || ''); }
  function hasPets(text) { return PET_RE.test(text || ''); }
  function justMe(text) { return /^\s*(just me|only me|me alone|alone|by myself|no one|nobody|myself|just myself|solo|it'?s just me|it’s just me)\b/i.test(text || ''); }
  function explicitFeeling(text) {
    var m = String(text || '').match(/\b(?:i\s+(?:want\s+to\s+|would\s+love\s+to\s+|’d\s+love\s+to\s+|'d\s+love\s+to\s+)?feel|feeling)\s+(?:so\s+|completely\s+|totally\s+|truly\s+)?((?:peace\w*|calm|serene|free|loved|adored|cherished|proud|confident|powerful|joyful|happy|abundant|wealthy|secure|safe|grateful|blessed|connected|fulfilled|content|alive|excited|relaxed|whole|hopeful|inspired|successful|beautiful|radiant)(?:[\s,]+(?:and\s+)?(?:peace\w*|calm|serene|free|loved|adored|cherished|proud|confident|powerful|joyful|happy|abundant|wealthy|secure|safe|grateful|blessed|connected|fulfilled|content|alive|excited|relaxed|whole|hopeful|inspired|successful|beautiful|radiant))*)/i);
    return m ? m[1].replace(/\s+/g, ' ').trim() : '';
  }
  function drinkLine(text, pick) {
    var m = String(text || '').match(DRINK_RE); if (!m) return '';
    var d = (m[0]).toLowerCase().replace(/s$/, '').replace(/^pina/, 'piña');
    if (HOT_DRINK_RE.test(d)) return pick(['Your ' + d + ' steams gently beside you, rich and comforting.', 'You wrap your hands around a warm ' + d + ' and breathe in its rich aroma.']);
    return pick(['The ' + d + ' is cold and sweet in your hand, beads of water sliding down the glass.', 'You take a slow sip of your ' + d + ', icy and sweet against the warmth of the day.']);
  }
  /* Picks up to `max` sensory lines for a piece of text, never reusing a line in `used`. */
  function sceneLines(text, ctx, opts) {
    opts = opts || {};
    var rng = opts.rng || Math.random, used = opts.used || [], max = opts.max || 2, out = [];
    var pickFrom = function (arr) {
      var fresh = arr.filter(function (l) { return used.indexOf(l) < 0 && out.indexOf(l) < 0; });
      if (!fresh.length) return '';
      var l = fresh[Math.floor(rng() * fresh.length)]; return l;
    };
    var push = function (l) { if (l && out.length < max && out.indexOf(l) < 0) { out.push(l); used.push(l); } };
    var all = String(text || ''), context = String(ctx || '');
    var themes = detectThemes(all);
    var placeThemes = themes.filter(function (t) { return t.place; }), detailThemes = themes.filter(function (t) { return !t.place; });
    var ctxPlace = placeThemes[0] || detectThemes(context).filter(function (t) { return t.place; })[0];
    /* Combinations that make a scene feel specific. */
    if (/\b(laptop|typing|business|clients?)\b/i.test(all) && ctxPlace && /beach|travel|nature|mountain/.test(ctxPlace.id))
      push(pickFrom(['The soft click of your keys mixes with the sound of the waves as your business runs beautifully from paradise.'.replace('the waves', ctxPlace.id === 'beach' ? 'the waves' : ctxPlace.id === 'mountain' ? 'the wind in the pines' : 'the world around you'),
        'Your laptop screen glows with good news while ' + (ctxPlace.id === 'beach' ? 'the ocean shimmers' : 'the view stretches out') + ' just beyond it; this is what freedom looks like.']));
    push(drinkLine(all, function (a) { return pickFrom(a); }));
    if (placeThemes[0]) push(pickFrom(placeThemes[0].lines));
    detailThemes.forEach(function (t) { if (out.length < max) push(pickFrom(t.lines)); });
    TIME_LINES.forEach(function (t) { if (out.length < max && t.re.test(all)) push(pickFrom([t.line])); });
    if (out.length < max && ctxPlace && !placeThemes[0]) push(pickFrom(ctxPlace.lines));
    while (out.length < Math.min(max, opts.min || 1)) { var g = pickFrom(GENERIC_LINES); if (!g) break; push(g); }
    return out;
  }
  function echoSentence(key, text) {
    var c = presentClause(text);
    if (c) return cap(toYou(c)) + '.';
    var n = toYou(nounPhrase(text));
    if (!n) return '';
    if (key === 'dream') return 'You are living your dream: ' + n + '.';
    if (key === 'setting') return cap(n) + '.';
    return 'Here you are: ' + n + '.';
  }
  function pickOne(arr, used) {
    var fresh = arr.filter(function (l) { return !used || used.indexOf(l) < 0; });
    var l = (fresh.length ? fresh : arr)[Math.floor(Math.random() * (fresh.length ? fresh : arr).length)];
    if (used) used.push(l); return l;
  }

  /* ---------------- Affirmations ---------------- */
  function affirmationsFor(key, value) {
    var out = [], c;
    if (key === 'dream') {
      c = presentClause(value);
      out.push(c ? c + '.' : 'I welcome ' + nounPhrase(value) + ' into my life now.');
      out.push('My dream is already on its way to me, and I am ready to receive it.');
    } else if (key === 'moment') {
      c = presentClause(value);
      out.push(c ? c + ', and it feels completely natural.' : 'I am fully present in this moment: ' + nounPhrase(value) + '.');
    } else if (key === 'setting') {
      out.push('I am exactly where I belong: ' + nounPhrase(value) + '.');
      if (PEOPLE_RE.test(value) || PET_RE.test(value)) out.push('I am surrounded by love, and I give love freely.');
    } else if (key === 'feeling') {
      out.push('I feel ' + feelingList(value) + '. This is who I am becoming.');
      out.push('Every day I step deeper into my best life.');
    }
    return out.map(function (s) { return cap(s.replace(/\s+/g, ' ').replace(/\.\.+$/, '.').replace(/([.!?])\.$/, '$1')); });
  }
  var OPENING_LINE = 'What a beautiful dream to hold. Tell me more, and we’ll create a vision blueprint that will help make it feel real to you.';
  var PEOPLE_NOTE = 'Anyone with you will be AI-generated from your description, never a real photo of anyone but you.';
  /* Paints the visitor's answer back as a short sensory scene (rule-based fallback for the AI guide). */
  function mirrorFor(key, value, used, answers) {
    used = used || []; answers = answers || {};
    var ctx = [answers.dream, answers.moment, answers.setting].filter(Boolean).join(' . ');
    var echo = echoSentence(key, value), lines;
    if (key === 'dream') {
      lines = sceneLines(value, ctx, { used: used, max: 2, min: 1 });
      return OPENING_LINE + ' Picture it with me: ' + [echo].concat(lines).filter(Boolean).join(' ');
    }
    if (key === 'moment' || key === 'more') {
      lines = sceneLines(value, ctx, { used: used, max: 2, min: 2 });
      return [pickOne(OPENERS[key], used), echo].concat(lines).filter(Boolean).join(' ');
    }
    if (key === 'setting') {
      lines = sceneLines(value + ' . ' + ctx, ctx, { used: used, max: 2, min: 1 });
      var s = [pickOne(OPENERS.setting, used)].concat(lines).filter(Boolean).join(' ');
      if (hasPeople(value) && !/AI-generated/.test(s)) s += ' ' + PEOPLE_NOTE;
      return s;
    }
    if (key === 'feeling') {
      var f = feelingList(value), fl = '';
      FEELING_LINES.forEach(function (x) { if (!fl && x.re.test(f) && used.indexOf(x.line) < 0) fl = x.line; });
      if (fl) used.push(fl);
      lines = sceneLines(ctx, ctx, { used: used, max: 1, min: 1 });
      return [cap(toYou(f)) + '.', pickOne(OPENERS.feeling, used), fl].concat(lines).filter(Boolean).join(' ');
    }
    return '';
  }

  /* ---------------- Dream vision paragraphs (second person) ---------------- */
  function visionParagraphs(a, kept) {
    if (state.aiVision && state.aiVision.sig === answersSig(a) && state.aiVision.paras && state.aiVision.paras.length) {
      return state.aiVision.paras.slice(0, 2).map(function (p) { return p.replace(/\s*Ready to make your dream reel\?\s*$/i, ''); });
    }
    var dream = presentClause(a.dream);
    var f = a.feeling ? toYou(feelingList(a.feeling)) : '';
    var aff = (kept && kept[0]) ? ' Your own words hum quietly beneath it all: “' + kept[0] + '”' : '';
    var p = 'Close your eyes and let it be real. ' + (dream ? cap(toYou(dream)) + '. ' : (a.dream ? 'You are living your dream: ' + toYou(nounPhrase(a.dream)) + '. ' : '')) +
      (a.moment ? a.moment + ' ' : '') + (f ? 'You feel ' + f + ', not as a wish but as the simple truth of your life.' : '') + aff + ' This is your best life, already unfolding.';
    return [p.replace(/\s+/g, ' ').trim()];
  }
  function answersSig(a) { a = a || {}; return [a.dream, a.moment, a.setting, a.feeling].map(function (x) { return String(x || '').trim(); }).join('|'); }

  /* ---------------- State ---------------- */
  var inlineHost = document.querySelector('[data-vision-guide-inline]');
  /* Sanctuary mode: the same guide mounted inside sanctuary.html, restored from the saved vision. */
  var SANCTUARY = !!(inlineHost && inlineHost.getAttribute('data-vg-mode') === 'sanctuary');
  function fresh() { return { v: 2, step: 'welcome', q: 0, pending: 'dream', rounds: 0, answers: {}, slots: {}, affirmations: [], messages: [], used: [], aiVision: null, approved: false, product: null, sample: false, sampleDone: false, startedAt: null, updatedAt: null }; }
  function readSaved() { try { return JSON.parse(localStorage.getItem(SAVED_KEY) || 'null'); } catch (e) { return null; } }
  function stateFromSaved(sv) {
    if (!sv) return null;
    if (sv.state && sv.state.v === 2) return Object.assign(fresh(), sv.state);
    var bp = sv.blueprint; if (!bp) return null;
    var st = fresh(); st.step = 'chat';
    if (bp.dream) st.answers.dream = bp.dream; if (bp.moment) st.answers.moment = bp.moment;
    if (bp.people_pets_place) st.answers.setting = bp.people_pets_place; if (bp.feeling) st.answers.feeling = bp.feeling;
    st.affirmations = (bp.affirmation_choices || (bp.affirmations || []).map(function (t) { return { statement: t, keep: true }; })).map(function (x) { return { text: x.statement, keep: x.keep !== false, from: x.from || 'dream' }; });
    st.messages = (bp.transcript || sv.messages || []).map(function (m) { return { role: m.role === 'assistant' ? 'guide' : m.role, text: m.text || m.content || '' }; });
    st.approved = !!bp.approved; st.product = bp.chosen_product || null; st.pending = undefined;
    st.rounds = st.messages.filter(function (m) { return m.role === 'user'; }).length;
    var gs = bp.guide_state; if (gs) { if (typeof gs.rounds === 'number') st.rounds = gs.rounds; st.slots = gs.slots || {}; st.aiVision = gs.ai_vision || null; st.pending = gs.pending || null; if (!st.messages.length) st.pending = 'dream'; }
    return st;
  }
  var state = fresh();
  try {
    var stored = SANCTUARY ? stateFromSaved(readSaved()) : null;
    if (!stored) { stored = JSON.parse(localStorage.getItem(STATE_KEY) || 'null'); }
    if (stored && stored.v === 2) state = Object.assign(fresh(), stored);
  } catch (e) { /* ignore */ }
  if (state.sample && !state.sampleDone) state = fresh();
  if (!state.answers) state.answers = {};
  if (!state.slots) state.slots = {};
  if (!state.used) state.used = [];
  /* ?product=<code> (e.g. from collection.html) preselects that product for the final cards and the Choose flow. */
  try {
    var qp = new URLSearchParams(location.search).get('product');
    if (qp && PRODUCT_ORDER.indexOf(qp) !== -1) {
      state.product = qp;
      localStorage.setItem('iamreel_vision_cart', JSON.stringify([qp]));
      sessionStorage.setItem('iamreel_checkout_cart', JSON.stringify([qp]));
    }
  } catch (e) { /* ignore */ }
  if (typeof state.rounds !== 'number') state.rounds = state.messages.filter(function (m) { return m.role === 'user'; }).length;
  var saveTimer = null;
  function persist() {
    if (state.sample && !state.sampleDone) return; /* a sample still playing is never stored */
    state.updatedAt = new Date().toISOString();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) { /* storage full or blocked */ }
      if (SANCTUARY && hasDream() && !state.sample) { saveLocal(); try { window.dispatchEvent(new CustomEvent('iamreel:vision-updated')); } catch (e) { /* ignore */ } }
    }, 120);
  }
  function keptAffirmations() { return state.affirmations.filter(function (x) { return x.keep; }).map(function (x) { return x.text; }); }
  function transcript() { return state.messages.map(function (m) { return { role: m.role, text: m.text }; }); }
  /* Blueprint export — compatible with visions.blueprint (jsonb) for the paid guide to continue from. */
  function withEnding(ps) { ps = ps.slice(); if (ps.length) ps[ps.length - 1] = ps[ps.length - 1] + ' Ready to make your dream reel?'; return ps; }
  function exportBlueprint() {
    var a = state.answers;
    return {
      source: 'free_vision_guide_v2',
      dream: a.dream || '', dream_details: a.details || '', moment: a.moment || '', people_pets_place: a.setting || '', feeling: a.feeling || '',
      affirmations: keptAffirmations(),
      affirmation_choices: state.affirmations.map(function (x) { return { statement: x.text, keep: x.keep, from: x.from }; }),
      dream_vision: state.approved ? withEnding(visionParagraphs(a, keptAffirmations())) : [],
      chosen_product: state.product || null,
      approved: !!state.approved,
      transcript: transcript(),
      guide_state: { rounds: roundsUsed(), max_rounds: maxRounds(), pending: state.pending === undefined ? null : state.pending, slots: state.slots || {}, ai_vision: state.aiVision || null },
      reel_plan: readReelPlan(),
      created_at: state.startedAt, updated_at: state.updatedAt
    };
  }
  /* The Sanctuary Reel Planner keeps its plan in localStorage; it rides along inside visions.blueprint so saves never drop it. */
  function readReelPlan() { try { return JSON.parse(localStorage.getItem('iamreel_reel_plan_v1') || 'null') || undefined; } catch (e) { return undefined; } }
  function conversationSummary() {
    var a = state.answers;
    return ['Dream: ' + (a.dream || '') + (a.details ? ' · ' + a.details : ''), 'Moment: ' + (a.moment || ''), 'Feeling: ' + (a.feeling || '')].join('\n');
  }

  /* ---------------- Shell ---------------- */
  var root = document.createElement('div');
  root.id = 'vg-guide';
  if (inlineHost) { root.className = 'vg-inline'; inlineHost.appendChild(root); } else document.body.appendChild(root);
  if (!document.querySelector('link[data-vg-css]')) {
    var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = new URL('guide.css?v=20261105a', base).href; css.setAttribute('data-vg-css', '');
    document.head.appendChild(css);
  }
  var icon = asset('assets/vision-guide/vision-icon.png');
  var icon2x = asset('assets/vision-guide/vision-icon@2x.png');
  var kaleidoImg = asset('assets/vision-guide-icon-dark.jpg');
  root.innerHTML =
    '<button class="vg-launch" type="button" aria-haspopup="dialog" aria-controls="vg-dialog"><img src="' + icon + '" srcset="' + icon + ' 1x, ' + icon2x + ' 2x" alt="" width="44" height="44"><span class="vg-eyebrow">I AM REEL</span><strong>Your Vision Guide</strong><span>What is your dream?</span></button>' +
    '<dialog id="vg-dialog" aria-labelledby="vg-title"><div class="vg-shell">' +
    '<header class="vg-header"><div class="vg-brand"><img class="vg-logo" src="' + icon + '" srcset="' + icon + ' 1x, ' + icon2x + ' 2x" alt="Vision Guide logo" width="48" height="48"><div><span class="vg-eyebrow">I AM REEL</span><h2 id="vg-title">Your Vision Guide</h2></div></div>' +
    '<div class="vg-header-actions"><button class="vg-button vg-secondary vg-small-btn vg-startover" type="button">Start over</button><button class="vg-close" type="button" aria-label="Close Vision Guide">×</button></div></header>' +
    '<div class="vg-layout"><main class="vg-main" tabindex="-1"></main><aside class="vg-blueprint" aria-label="Your Vision Blueprint" aria-live="polite"></aside></div>' +
    '<footer class="vg-footer"><span>One dream. A future that feels like you.</span><button class="vg-button vg-primary vg-save-open" type="button">♡ ' + SAVE_LABEL + '</button></footer>' +
    '<div class="vg-save" hidden></div>' +
    '</div></dialog>';
  var dialog = root.querySelector('dialog'), main = root.querySelector('.vg-main'), side = root.querySelector('.vg-blueprint'), savePane = root.querySelector('.vg-save');
  var returnFocus = null;
  var btn = function (label, action, kind, extra) { return '<button type="button" class="vg-button vg-' + (kind || 'primary') + '" data-action="' + action + '"' + (extra || '') + '>' + label + '</button>'; };

  /* ---------------- Blueprint aside: "Your dream" ---------------- */
  function bpField(label, text) { return '<div class="vg-field"><span>' + esc(label) + '</span><p>' + esc(text) + '</p></div>'; }
  function renderBlueprint() {
    var a = state.answers, f = '';
    if (a.dream) f += bpField('The dream', a.dream + (a.details ? ' · ' + a.details : ''));
    if (a.moment) f += bpField('Your moment', a.moment);
    if (a.feeling) f += bpField('Desired feelings', a.feeling);
    if (state.affirmations.length) f += '<div class="vg-field"><span>Your affirmations</span><small class="vg-muted vg-small">Keep the ones that feel true (checked) and uncheck any that don’t.</small><ul class="vg-affirms" data-affirms>' + affirmsHtml() + '</ul></div>';
    if (state.product && products()[state.product]) f += bpField('Your choice', products()[state.product].name);
    var saveBlock = '';
    if (state.approved) saveBlock = state.sample
      ? '<p class="vg-muted vg-small">This sample isn’t saved. Tap “Start over” to share your own dream.</p>'
      : '<div class="vg-side-save">' + btn('♡ ' + SAVE_LABEL, 'save-open') + '<p class="vg-small vg-save-note">' + SAVE_NOTE + '</p></div>';
    side.innerHTML = (state.sample ? SAMPLE_TAG : '') + '<span class="vg-eyebrow">YOUR VISION BLUEPRINT</span><h3>Your dream</h3>' +
      (f || '<p class="vg-muted">Share your dream and it will come alive here: your moment, your feelings and your affirmations.</p>') + saveBlock +
      '<div class="vg-gift">✦ FREE personalized Vision Wallpaper<p>Included with every personalized product: you, living your dream, every time you unlock your phone.</p></div>' +
      (state.sample ? '' : '<p class="vg-muted vg-small">Your dream stays private on this device until you save it to your Sanctuary.</p>');
  }

  /* ---------------- Products ---------------- */
  function products() { return window.IAMREEL_PRODUCTS || {}; }
  function priceHtml(p) {
    if (p == null || p.price == null || p.price === '') return '';
    var n = Number(p.price);
    return '<span class="vg-price">$' + (n % 1 ? n.toFixed(2) : String(n)) + '</span>';
  }
  function productsHtml(intro) {
    var cat = products();
    var cards = PRODUCT_ORDER.filter(function (k) { return cat[k]; }).map(function (k) {
      var p = cat[k];
      return '<article class="vg-product' + (state.product === k ? ' is-selected' : '') + '" data-product="' + k + '"><img src="' + esc(asset(p.image)) + '" alt="" loading="lazy">' +
        '<div><h4>' + esc(p.name) + '</h4><p>' + esc(PRODUCT_COPY[k] || '') + '</p>' + priceHtml(p) +
        '<span class="vg-included">✦ FREE personalized Vision Wallpaper included</span>' +
        btn(state.product === k ? 'Chosen ✓' : 'Choose this product', 'choose', 'primary', ' data-code="' + k + '"' + (state.product === k ? ' aria-pressed="true"' : '')) + '</div></article>';
    }).join('');
    return '<span class="vg-eyebrow">2 / CHOOSE YOUR DREAM IMAGES</span><h3 id="vg-products-title">Choose your dream images</h3>' +
      '<p>' + (intro || 'Turn your dream into images and film you can see every day.') + '</p>' +
      '<div class="vg-kaleido"><img src="' + kaleidoImg + '" alt=""><p><strong>' + KALEIDO + '</strong></p></div>' +
      '<div class="vg-products">' + cards + '</div>' +
      '<div class="vg-wallpaper"><img src="' + esc(asset('assets/ev-collection/phone-wallpaper.webp')) + '" alt="" loading="lazy"><div><span class="vg-eyebrow">OUR GIFT TO YOU</span><h4>Your FREE personalized Vision Wallpaper</h4>' +
      '<p>Imagine the first thing you see every time you unlock your phone: you, already living your dream. Your Vision Wallpaper turns dozens of everyday glances into quiet moments that lift your spirit and keep your dream in front of you.</p>' +
      '<p>It’s included free with every personalized product. After you purchase, you’ll upload your photo in your private Sanctuary and we’ll personalize your wallpaper so it’s unmistakably you, for your phone or desktop.</p></div></div>';
  }

  /* ---------------- Views ---------------- */
  function composeHtml(placeholder) {
    return '<div class="vg-compose"><form class="vg-compose-row" data-compose><label class="vg-sr" for="vg-input" hidden>Your answer</label>' +
      '<textarea id="vg-input" rows="1" maxlength="' + MAX_ANSWER + '" placeholder="' + esc(limitReached() ? limitNote() : (placeholder || 'Type your answer…')) + '" aria-label="Type your answer, then press Enter to send"' + (limitReached() ? ' disabled' : '') + '></textarea>' +
      '<button type="submit" class="vg-button vg-primary" aria-label="Send"' + (limitReached() ? ' disabled' : '') + '>Send ➤</button></form>' +
      (limitReached() ? '<p class="vg-limit-note" role="status">' + esc(limitNote()) + '</p>' : '<p class="vg-hint"><span>Press Enter to send · Shift + Enter for a new line</span><span class="vg-count" aria-live="off">0/' + MAX_ANSWER + '</span></p><p class="vg-rounds vg-small vg-muted">' + roundsText() + '</p>') +
      '<details class="vg-guidelines"' + (window.innerWidth > 640 ? ' open' : '') + '><summary>Content guidelines</summary>' + GUIDELINES + '</details><div class="vg-compose-warn" aria-live="polite"></div></div>';
  }
  function welcomeHtml() {
    return '<span class="vg-eyebrow">A BRIGHTER FUTURE, MADE PERSONAL</span>' +
      '<h3>What would you love to see?</h3>' +
      '<p>I’m your Vision Guide. Tell me one dream and I’ll bring it to life as a moment you can step into, with affirmations that help you step into your best life, and see how you’d love to bring your dream to life.</p>' +
      '<p class="vg-small vg-muted">Tell me your dream right here:</p>' + composeHtml('Tell me your dream…') +
      '<div class="vg-actions vg-sample-row"><span class="vg-small vg-muted">Curious first? See a dream come alive:</span>' + btn('Try a sample vision', 'sample', 'secondary') + '</div>' +
      '<div class="vg-faq"><h4>How does it work?</h4><p>Type your dream in your own words. I’ll paint it as one vivid moment and ask if it’s the dream you’d love to see. Say yes or refine it once, and your dream, feelings and affirmations fill in on the right. Save it to your Sanctuary, then choose how you’d love to see it. After purchase, you’ll securely upload your photos so your personalized images look like you, followed by production and a loving human review.</p>' +
      btn('Help me choose a product', 'browse', 'secondary') + '</div>';
  }
  function affirmsHtml() {
    if (!state.affirmations.length) return '<li class="vg-muted"><span>Your affirmations will appear here.</span></li>';
    return state.affirmations.map(function (x, i) {
      return '<li class="' + (x.keep ? '' : 'off') + '"><label><input type="checkbox" data-aff="' + i + '"' + (x.keep ? ' checked' : '') + '><span>' + esc(x.text) + '</span></label></li>';
    }).join('');
  }

  function renderConversation() {
    main.innerHTML =
      (state.sample ? '<div class="vg-sample-head">' + SAMPLE_TAG + '<span class="vg-eyebrow">' + qLabel() + '</span></div>' : '<span class="vg-eyebrow">' + qLabel() + '</span>') +
      '<div class="vg-chat" data-chat role="log" aria-live="polite"></div>' +
      composeHtml(state.answers.dream ? REFINE_PH : 'Tell me your dream…') +
      '<section class="vg-section" data-products' + (state.approved ? '' : ' hidden') + '></section>';
    var chat = main.querySelector('[data-chat]');
    state.messages.forEach(function (m) { chat.appendChild(msgEl(m.role, m.text)); });
    if (state.approved) refreshProducts();
    bindCompose();
  }
  function render() {
    renderBlueprint();
    if (state.step === 'welcome') { main.innerHTML = welcomeHtml(); bindCompose(); }
    else if (state.step === 'browse') {
      main.innerHTML = '<section data-products>' + productsHtml('Here’s everything we create. Share your dream first and every piece is made around it, then come back and choose.') + '</section><div class="vg-actions">' + btn('Back to my dream', 'start') + '</div>';
    }
    else renderConversation();
  }
  function msgEl(role, text) { var d = document.createElement('div'); d.className = 'vg-msg ' + role; d.textContent = text; return d; }
  function addMsg(role, text) {
    state.messages.push({ role: role, text: text }); persist();
    var chat = main.querySelector('[data-chat]'); if (!chat) return;
    var el = msgEl(role, text); chat.appendChild(el);
    if (role !== 'user') el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function refreshAffirms() { var ul = side.querySelector('[data-affirms]'); if (ul) ul.innerHTML = affirmsHtml(); }
  function refreshProducts() {
    var p = main.querySelector('[data-products]'); if (!p) return;
    p.hidden = false;
    if (!p.innerHTML) p.innerHTML = productsHtml();
  }
  /* Keeps any affirmation the visitor unchecked switched off when the list is refreshed. */
  function setAffirmations(list, from) {
    var off = state.affirmations.filter(function (x) { return !x.keep; }).map(function (x) { return x.text.toLowerCase(); });
    var seen = {};
    state.affirmations = list.map(function (t) { return String(t).trim(); }).filter(function (t) { var k = t.toLowerCase(); if (!t || seen[k]) return false; seen[k] = 1; return true; })
      .slice(0, 5).map(function (t) { return { text: t, keep: off.indexOf(t.toLowerCase()) < 0, from: from }; });
  }

  /* ---------------- Conversation engine (2 short rounds) ----------------
     Round 1: they type their dream; the guide paints ONE vivid moment from exactly their words and asks if it's the dream.
     Round 2: they confirm or refine; the guide revises the moment, asks if it feels right, and the "Your dream" panel is complete. */
  var busy = false, typingEl = null, typingAt = 0;
  var ASK_LINE = 'Is this the dream you’d love to see?';
  var CLOSE_LINE = 'Does this feel right? Your dream is ready, with your feelings and affirmations, in Your dream.';
  var REFINE_PH = 'Say yes, or tell me what to change…';
  var YES_RE = /^(yes|yep|yeah|ready|approve|approved|looks? (good|great|perfect)|perfect|i love it|love it|it does|it is|it feels right)\b/i;
  var PURE_YES_RE = /^\s*(yes|yes please|yes!+|yep|yeah|perfect|i love it|love it|it does|it is|it feels right|that'?s it|that’s it|exactly|absolutely)[\s.!💛❤️]*$/i;
  function showTyping() {
    var chat = main.querySelector('[data-chat]'); busy = true; typingAt = Date.now();
    typingEl = document.createElement('div'); typingEl.className = 'vg-typing'; typingEl.setAttribute('aria-hidden', 'true');
    typingEl.innerHTML = '<span class="vg-dots"><i></i><i></i><i></i></span> Your Vision Guide is writing…';
    if (chat) { chat.appendChild(typingEl); typingEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  }
  function hideTyping(cb) {
    var wait = Math.max(0, 650 - (Date.now() - typingAt));
    setTimeout(function () { if (typingEl) typingEl.remove(); typingEl = null; busy = false; cb(); }, wait);
  }
  function typing(cb) { showTyping(); hideTyping(cb); }
  function qLabel() { return '1 / YOUR DREAM' + (state.step !== 'welcome' && !state.approved && !limitReached() ? ' · ANSWER ' + Math.min(roundsUsed() + 1, maxRounds()) + ' OF ' + maxRounds() : ''); }
  function userTexts() { return state.messages.filter(function (m) { return m.role === 'user'; }).map(function (m) { return m.text; }); }
  function updateRoundsUi() { var r = main.querySelector('.vg-rounds'); if (r) r.textContent = roundsText(); var label = main.querySelector('.vg-eyebrow'); if (label) label.textContent = qLabel(); }
  function lockInput() {
    var input = main.querySelector('#vg-input'), send = main.querySelector('[data-compose] button[type="submit"]');
    if (input) { input.disabled = true; input.value = ''; input.placeholder = limitNote(); }
    if (send) send.disabled = true;
    var hint = main.querySelector('.vg-hint'); if (hint) { hint.outerHTML = '<p class="vg-limit-note" role="status">' + esc(limitNote()) + '</p>'; }
    var r = main.querySelector('.vg-rounds'); if (r) r.remove();
  }
  /* Rule-based fallback: one sensory moment built only from their own words. */
  function ruleMoment(text, first) {
    var all = userTexts().join(' . ');
    var refineYes = !first && PURE_YES_RE.test(text);
    var lines = sceneLines(refineYes ? all : text + ' . ' + all, all, { used: state.used, max: 3, min: 2 });
    var f = explicitFeeling(all), fl = '';
    FEELING_LINES.forEach(function (x) { if (!fl && x.re.test(f || all) && state.used.indexOf(x.line) < 0) fl = x.line; });
    if (fl) state.used.push(fl);
    var touch = String(text).replace(/^\s*(yes|yeah|yep|absolutely|definitely|i love it|love it|perfect)\b[\s,.!-]*(and\s+)?(please\s+)?(add|include|also)?\s*/i, '').trim();
    var echo = refineYes ? '' : first ? echoSentence('dream', text)
      : [echoSentence('dream', state.answers.dream || ''), touch ? echoSentence('moment', cap(touch)) : ''].filter(Boolean).join(' ');
    return { moment: [echo].concat(lines).concat(fl ? [fl] : []).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(), feeling: cap(f || 'Joyful, free and at peace') };
  }
  function finish() {
    state.approved = true; state.pending = null;
    persist(); renderBlueprint(); refreshProducts(); lockInput(); updateRoundsUi();
  }
  function approve() { if (state.answers.dream && state.answers.moment) finish(); }
  function deliver(reply) {
    persist(); renderBlueprint();
    addMsg('guide', reply);
    if (limitReached()) { finish(); return; }
    updateRoundsUi();
    var input = main.querySelector('#vg-input'); if (input) input.placeholder = REFINE_PH;
  }
  function ruleTurn(text, first, check) {
    var a = state.answers, m = ruleMoment(text, first);
    if (m.moment) a.moment = m.moment;
    a.feeling = m.feeling;
    var affs = affirmationsFor('dream', a.dream);
    if (!first && !PURE_YES_RE.test(text)) affs = affs.concat(affirmationsFor('moment', text));
    setAffirmations(affs.concat(affirmationsFor('feeling', a.feeling)), 'dream');
    var reply = (first ? 'What a beautiful dream to hold. Picture it with me: ' : (PURE_YES_RE.test(text) ? 'Then let’s step all the way in. ' : 'Here it is again, with your new touch. ')) + a.moment;
    if (check.soft) reply += ' ' + check.message;
    deliver(reply + '\n\n' + (limitReached() ? CLOSE_LINE : ASK_LINE));
  }
  function handleAnswer(text) {
    text = String(text || '').trim().slice(0, MAX_ANSWER).trim(); if (!text || busy || samplePlaying) return;
    if (state.step === 'welcome') { startConversation(text); return; }
    if (limitReached() || state.approved) { lockInput(); return; }
    var first = !state.answers.dream;
    var check = checkContent(text, first ? 'dream' : 'moment');
    addMsg('user', text);
    warnCompose('');
    if (!check.ok) { typing(function () { addMsg('note', check.message + ' Whenever you’re ready, tell me again in a new way.'); }); return; }
    state.rounds = roundsUsed() + 1;
    if (first) state.answers.dream = cap(clean(text));
    else if (!PURE_YES_RE.test(text)) state.answers.details = (state.answers.details ? state.answers.details + ' · ' : '') + cap(clean(text));
    persist(); updateRoundsUi();
    showTyping();
    aiTurn(first ? 'dream' : 'refine').then(function (r) {
      hideTyping(function () {
        try { if (r && applyAi(r, check)) return; } catch (e) { /* fall through to the rule-based guide */ }
        ruleTurn(text, first, check);
      });
    });
  }
  function startConversation(firstAnswer) {
    state.step = 'chat'; state.startedAt = state.startedAt || new Date().toISOString();
    if (!state.messages.length) state.messages.push({ role: 'guide', text: 'Welcome. This is your space to dream out loud. Tell me your dream, and I’ll bring it to life as one moment you can step into.' });
    persist(); render();
    if (firstAnswer) handleAnswer(firstAnswer);
    else focusInput();
  }
  function focusInput() { var i = main.querySelector('#vg-input'); if (i) i.focus({ preventScroll: true }); }
  function warnCompose(msg) { var w = main.querySelector('.vg-compose-warn'); if (w) w.innerHTML = msg ? '<span class="vg-warn" role="alert">' + esc(msg) + '</span>' : ''; }

  /* ---------- Real AI (Grok via /api/guide), with a seamless rule-based fallback ---------- */
  var AI_URL = new URL('../../api/guide', base).href;
  var BANNED_RE = /\b(vibrat\w*|frequenc\w*|manifest\w*|goals?|high(er|est) self)\b|\bI (can )?(feel|sense) (the|your|this) energy\b|\bI can feel\b/i;
  function aiEnabled() { return window.IAMREEL_GUIDE_AI !== false && !state.sample && /^https?:/.test(location.protocol); }
  function aiTurn(stage) {
    if (!aiEnabled() || !window.fetch) return Promise.resolve(null);
    var a = state.answers;
    var body = {
      stage: stage, roundsLeft: roundsLeft(), maxRounds: maxRounds(),
      slots: { dream: a.dream || '', moment: a.moment || '', feeling: a.feeling || '' },
      messages: state.messages.filter(function (m) { return m.role === 'user' || m.role === 'guide'; }).slice(-16).map(function (m) { return { role: m.role === 'guide' ? 'assistant' : 'user', content: String(m.text).slice(0, 1200) }; })
    };
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 16000);
    return Promise.race([
      fetch(AI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl ? ctrl.signal : undefined })
        .then(function (r) { if (!r.ok) throw new Error('ai ' + r.status); return r.json(); }),
      new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, 16500); })
    ]).then(function (r) {
      clearTimeout(timer);
      if (!r || typeof r.reply !== 'string' || !r.reply.trim() || BANNED_RE.test(r.reply)) return null;
      return r;
    }).catch(function () { clearTimeout(timer); return null; });
  }
  function applyAi(r, check) {
    var a = state.answers, sl = r.slots || {};
    var ok = function (v) { return v && !BANNED_RE.test(v) && checkContent(v, 'moment').ok; };
    var moment = String(sl.moment || '').trim(); if (!ok(moment)) return false;
    a.moment = moment;
    var dream = String(sl.dream || '').trim(); if (ok(dream)) { a.dream = cap(dream); delete a.details; }
    var feeling = String(sl.feeling || '').trim(); a.feeling = ok(feeling) ? cap(feeling) : (a.feeling || 'Joyful, free and at peace');
    var aff = (r.affirmations || []).filter(function (t) { return typeof t === 'string' && ok(t.trim()); });
    setAffirmations(aff.length ? aff : affirmationsFor('dream', a.dream).concat(affirmationsFor('feeling', a.feeling)), 'ai');
    if (Array.isArray(r.dream_vision) && r.dream_vision.length && !r.dream_vision.some(function (p) { return BANNED_RE.test(p); })) state.aiVision = { sig: answersSig(a), paras: r.dream_vision.slice(0, 2).map(String) };
    var reply = r.reply.trim(); if (check.soft) reply += ' ' + check.message;
    deliver(reply);
    return true;
  }
  var sampleToken = 0, samplePlaying = false;
  function sampleDelay(text) { return Math.min(2600, 900 + String(text).length * 5); }
  function runSample() {
    var token = ++sampleToken;
    closeSave();
    state = fresh(); state.step = 'chat'; state.sample = true; state.startedAt = new Date().toISOString();
    state.messages.push({ role: 'note', text: SAMPLE_NOTE });
    state.messages.push({ role: 'guide', text: 'Welcome. This is your space to dream out loud. Tell me your dream, and I’ll bring it to life as one moment you can step into.' });
    samplePlaying = true;
    render();
    var input = main.querySelector('#vg-input'), send = main.querySelector('[data-compose] button[type="submit"]');
    if (input) { input.disabled = true; input.placeholder = 'Watch the sample dream unfold…'; }
    if (send) send.disabled = true;
    main.scrollTop = 0;
    var i = 0;
    var alive = function () { return token === sampleToken; };
    function step() {
      if (!alive()) return;
      var t = SAMPLE_TURNS[i];
      if (!t) { finishSample(); return; }
      addMsg('user', t.user);
      state.rounds = i + 1; updateRoundsUi();
      showTyping();
      setTimeout(function () {
        if (!alive()) return;
        if (typingEl) typingEl.remove(); typingEl = null;
        Object.keys(t.fields).forEach(function (k) { state.answers[k] = t.fields[k]; });
        setAffirmations(t.affirm, 'sample');
        renderBlueprint();
        addMsg('guide', t.reply);
        i++; setTimeout(step, 1300);
      }, sampleDelay(t.reply));
    }
    function finishSample() {
      samplePlaying = false; busy = false;
      state.aiVision = { sig: answersSig(state.answers), paras: SAMPLE_VISION.slice() };
      state.sampleDone = true;
      addMsg('guide', 'That’s how your Vision Guide works. Tap “Start over” whenever you’re ready to share your own dream. 💛');
      finish(); persist();
    }
    setTimeout(step, 900);
  }
  function startOver() {
    sampleToken++; samplePlaying = false; busy = false;
    if (typingEl) { typingEl.remove(); typingEl = null; }
    state = fresh();
    try { localStorage.removeItem(STATE_KEY); sessionStorage.removeItem('iamreel_checkout_cart'); } catch (e) { /* ignore */ }
    closeSave(); render(); main.scrollTop = 0; focusInput();
  }
  function bindCompose() {
    var form = main.querySelector('[data-compose]'), input = main.querySelector('#vg-input');
    if (!form || !input) return;
    var grow = function () { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 160) + 'px'; };
    var counter = main.querySelector('.vg-count');
    var count = function () { if (counter) { counter.textContent = input.value.length + '/' + MAX_ANSWER; counter.classList.toggle('vg-count-full', input.value.length >= MAX_ANSWER); } };
    input.addEventListener('input', function () { grow(); count(); warnCompose(''); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true })); }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault(); if (busy || samplePlaying) return;
      var v = input.value.trim(); if (!v) { focusInput(); return; }
      if (state.step === 'welcome') { var c = checkContent(v, 'dream'); if (!c.ok) { warnCompose(c.message); return; } }
      input.value = ''; grow(); count();
      handleAnswer(v);
      setTimeout(focusInput, 0);
    });
  }

  root.addEventListener('change', function (e) {
    var i = e.target.getAttribute && e.target.getAttribute('data-aff'); if (i == null) return;
    var a = state.affirmations[Number(i)]; if (!a) return;
    a.keep = e.target.checked; a.edited = true;
    e.target.closest('li').classList.toggle('off', !a.keep);
    persist();
  });


  /* ---------------- Actions ---------------- */
  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-action]'); if (!b) return;
    var act = b.getAttribute('data-action');
    if (act === 'start') { if (state.step === 'browse' && Object.keys(state.answers).length) state.step = 'chat'; startConversation(); }
    else if (act === 'sample') runSample();
    else if (act === 'browse') { state.step = 'browse'; persist(); render(); main.scrollTop = 0; }
    else if (act === 'approve') approve();
    else if (act === 'save-open') openSave('save');
    else if (act === 'choose') chooseProduct(b.getAttribute('data-code'));
    else if (act === 'save-submit') submitSave(false);
    else if (act === 'save-signin') submitSave(true);
    else if (act === 'save-toggle') { saveMode = saveMode === 'signup' ? 'signin' : 'signup'; renderSave(); }
    else if (act === 'save-close') closeSave();
    else if (act === 'startover') startOver();
  });
  root.querySelector('.vg-startover').addEventListener('click', startOver);
  root.querySelector('.vg-save-open').addEventListener('click', function () { openSave('save'); });

  /* Checkout hand-off: reuses the site's existing cart keys (collection.html → sanctuary.html). */
  function chooseProduct(code) {
    if (!code || !products()[code]) return;
    state.product = code; persist(); renderBlueprint();
    main.querySelectorAll('.vg-product').forEach(function (card) {
      var on = card.getAttribute('data-product') === code;
      card.classList.toggle('is-selected', on);
      var b = card.querySelector('[data-action="choose"]'); if (b) { b.textContent = on ? 'Chosen ✓' : 'Choose this product'; b.setAttribute('aria-pressed', on ? 'true' : 'false'); }
    });
    try {
      localStorage.setItem('iamreel_vision_cart', JSON.stringify([code]));
      sessionStorage.setItem('iamreel_checkout_cart', JSON.stringify([code]));
    } catch (e) { /* ignore */ }
    // TODO(checkout): No payment provider is wired on the site yet. The existing hook is the
    // collection.html cart → sessionStorage.iamreel_checkout_cart → sanctuary.html. New codes
    // (dream_scenes_3, vision_board_8) and the new prices also need adding to the real catalog
    // and to collection.html's names map before a paid checkout can accept them.
    openSave('checkout');
  }

  /* ---------------- Save to Sanctuary (free account) ---------------- */
  var saveMode = 'signup', saveIntent = 'save', sb = null, sessionCache = null;
  function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  function getClient() {
    if (sb) return Promise.resolve(sb);
    var ready = window.supabase ? Promise.resolve() : loadScript(SUPABASE_CDN).catch(function () {});
    return ready.then(function () {
      if (!window.supabase || !window.IAMREEL_SUPABASE_KEY) return null;
      sb = window.supabase.createClient(SUPABASE_URL, window.IAMREEL_SUPABASE_KEY);
      return sb;
    });
  }
  function saveLocal(extra) {
    var prev = readSaved() || {}, prevCloud = prev.cloud || {};
    var snap = Object.assign({ blueprint: exportBlueprint(), summary: conversationSummary(), messages: state.messages, state: JSON.parse(JSON.stringify(state)), savedAt: new Date().toISOString(), cloud: { pending: true, visionId: prevCloud.visionId || null } }, extra || {});
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(snap)); localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
    return snap;
  }
  function cloudSave(client, session) {
    var bp = exportBlueprint(), prev = readSaved() || {}, existingId = prev.cloud && prev.cloud.visionId;
    var row = { title: short(bp.dream || 'My Dream Future', 60), path: 'standard', status: bp.approved ? 'blueprint_ready' : 'draft', blueprint: bp, conversation_summary: conversationSummary() };
    var write = existingId
      ? client.from('visions').update(row).eq('id', existingId).select().single().then(function (res) {
          if (res.error || !res.data) return client.from('visions').insert(Object.assign({ user_id: session.user.id }, row)).select().single();
          return res;
        })
      : client.from('visions').insert(Object.assign({ user_id: session.user.id }, row)).select().single();
    return write.then(function (res) {
      if (res.error) throw res.error;
      var vision = res.data, tasks = [], isUpdate = existingId && vision.id === existingId;
      var kept = keptAffirmations();
      var clearAff = isUpdate ? client.from('affirmations').delete().eq('vision_id', vision.id).then(function () {}, function () {}) : Promise.resolve();
      var clearMsg = isUpdate ? client.from('vision_messages').delete().eq('vision_id', vision.id).then(function () {}, function () {}) : Promise.resolve();
      if (kept.length) tasks.push(clearAff.then(function () { return client.from('affirmations').insert(kept.map(function (s, i) { return { user_id: session.user.id, vision_id: vision.id, statement: s, sort_order: i }; })); }).then(function (r) { if (r && r.error) console.warn('[Vision Guide] affirmations not saved:', r.error.message); }));
      var msgs = state.messages.filter(function (m) { return m.role !== 'note'; }).map(function (m) { return { user_id: session.user.id, vision_id: vision.id, role: m.role === 'guide' ? 'assistant' : 'user', content: m.text }; });
      if (msgs.length) tasks.push(clearMsg.then(function () { return client.from('vision_messages').insert(msgs); }).then(function (r) { if (r && r.error) console.warn('[Vision Guide] messages not saved:', r.error.message); }));
      return Promise.all(tasks).then(function () { saveLocal({ cloud: { pending: false, visionId: vision.id, syncedAt: new Date().toISOString() } }); return vision; });
    });
  }
  function hasDream() { return Object.keys(state.answers).length > 0; }
  function renderSave() {
    var checkout = saveIntent === 'checkout', p = state.product && products()[state.product];
    var head = checkout
      ? '<span class="vg-eyebrow">ONE STEP BEFORE CHECKOUT</span><h3>Save your dream and continue</h3><p>You chose <strong>' + esc(p ? p.name : '') + '</strong>. Create your free Sanctuary account so your dream, affirmations and order stay together. After purchase, you’ll upload your photos there.</p>'
      : '<span class="vg-eyebrow">YOUR PRIVATE SANCTUARY</span><h3>' + SAVE_LABEL + '</h3><p>Create your free account and your dream, blueprint and affirmations will be waiting in your private Sanctuary whenever you want to return.</p>';
    if (state.sample) {
      savePane.innerHTML = '<div class="vg-save-card" role="dialog" aria-label="This is a sample vision"><span class="vg-eyebrow">SAMPLE VISION</span><h3>This dream is a sample</h3><p>It’s here to show you how your Vision Guide works, so it isn’t saved to a Sanctuary. Start over and tell me your dream.</p>' +
        btn('Start over with my dream', 'startover') + '<button class="vg-linkish" data-action="save-close" type="button">Not now</button></div>';
      return;
    }
    if (!hasDream() && !checkout) {
      savePane.innerHTML = '<div class="vg-save-card" role="dialog" aria-label="Save this dream to my sanctuary">' + head + '<p class="vg-status">Share your dream first, and then you can save it.</p>' + '<button class="vg-linkish" data-action="save-close" type="button">Not now</button></div>';
      return;
    }
    if (sessionCache) {
      savePane.innerHTML = '<div class="vg-save-card" role="dialog" aria-label="Save this dream to my sanctuary">' + head + '<p class="vg-small">Signed in as ' + esc(sessionCache.user.email || '') + '</p>' +
        btn(checkout ? 'Save &amp; continue' : 'Save to my Sanctuary', 'save-submit') + '<button class="vg-linkish" data-action="save-close" type="button">Not now</button><p class="vg-status" role="status" aria-live="polite"></p></div>';
      return;
    }
    var signin = saveMode === 'signin';
    savePane.innerHTML = '<div class="vg-save-card" role="dialog" aria-label="Save this dream to my sanctuary">' + head +
      '<form data-save-form><label for="vg-email">Email</label><input id="vg-email" type="email" autocomplete="email" required>' +
      '<label for="vg-pass">' + (signin ? 'Password' : 'Create a password (8+ characters)') + '</label><input id="vg-pass" type="password" minlength="8" autocomplete="' + (signin ? 'current-password' : 'new-password') + '" required>' +
      '<div class="vg-actions">' + (signin ? btn('Sign in &amp; save', 'save-signin') : btn('Create my free Sanctuary', 'save-submit')) +
      btn(signin ? 'New here? Create a free account' : 'I already have an account', 'save-toggle', 'secondary') + '</div></form>' +
      '<button class="vg-linkish" data-action="save-close" type="button">Not now</button><p class="vg-status" role="status" aria-live="polite"></p></div>';
    var f = savePane.querySelector('[data-save-form]');
    if (f) f.addEventListener('submit', function (e) { e.preventDefault(); submitSave(saveMode === 'signin'); });
  }
  function openSave(intent) {
    saveIntent = intent || 'save'; savePane.hidden = false; renderSave();
    var first = savePane.querySelector('input,button'); if (first) first.focus();
    getClient().then(function (c) { if (!c) return; return c.auth.getSession().then(function (r) { var s = r.data && r.data.session; if (s && !sessionCache) { sessionCache = s; renderSave(); } }); }).catch(function () {});
  }
  function closeSave() { savePane.hidden = true; savePane.innerHTML = ''; }
  function setStatus(t) { var s = savePane.querySelector('.vg-status'); if (s) s.textContent = t; }
  function goToSanctuary(note) {
    if (SANCTUARY) { /* Already in the Sanctuary: refresh the saved panel and close the save card. */
      try { window.dispatchEvent(new CustomEvent('iamreel:vision-saved')); } catch (e) { /* ignore */ }
      setTimeout(closeSave, note ? 2600 : 1200); return;
    }
    var url = 'sanctuary.html?saved=1' + (saveIntent === 'checkout' && state.product ? '&checkout=' + encodeURIComponent(state.product) : '');
    // TODO(sanctuary): sanctuary.html shows the saved dream and syncs it after sign-in; the
    // checkout/payment step for the chosen product still needs to be built there.
    setTimeout(function () { location.href = new URL('../../' + url, base).href; }, note ? 2600 : 900);
  }
  function submitSave(isSignin) {
    if (!hasDream() || state.sample) { renderSave(); return; }
    saveLocal();
    var email = (savePane.querySelector('#vg-email') || {}).value, pass = (savePane.querySelector('#vg-pass') || {}).value;
    if (!sessionCache) {
      if (!email || !/.+@.+\..+/.test(email)) { setStatus('Please enter your email address.'); return; }
      if (!pass || pass.length < 8) { setStatus('Please choose a password with at least 8 characters.'); return; }
    }
    savePane.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
    setStatus(sessionCache ? 'Saving your dream vision…' : isSignin ? 'Signing you in…' : 'Creating your free Sanctuary…');
    getClient().then(function (client) {
      if (!client) { setStatus('Your dream vision is saved privately on this device. Taking you to your Sanctuary…'); goToSanctuary(true); return; }
      var auth = sessionCache ? Promise.resolve({ data: { session: sessionCache } })
        : isSignin ? client.auth.signInWithPassword({ email: email, password: pass })
        : client.auth.signUp({ email: email, password: pass, options: { emailRedirectTo: new URL('../../sanctuary.html', base).href } });
      return auth.then(function (res) {
        if (res.error) throw res.error;
        var session = res.data && res.data.session;
        if (!session) { setStatus('Almost there! Check your inbox to confirm your email. Your dream vision is saved on this device and moves into your Sanctuary when you sign in.'); goToSanctuary(true); return; }
        sessionCache = session;
        return cloudSave(client, session).then(function () { setStatus('Saved to your Sanctuary. 💛'); goToSanctuary(); })
          .catch(function (err) { console.warn('[Vision Guide] cloud save failed:', err && err.message); setStatus('Your dream vision is saved on this device and will sync to your Sanctuary. Taking you there…'); goToSanctuary(true); });
      });
    }).catch(function (err) {
      savePane.querySelectorAll('button').forEach(function (b) { b.disabled = false; });
      setStatus((err && err.message) ? err.message : 'Something went wrong. Please try again.');
    });
  }

  /* ---------------- Open / close (launcher mode) ---------------- */
  function open(opener) {
    returnFocus = opener || document.activeElement;
    if (inlineHost) { inlineHost.scrollIntoView({ behavior: 'smooth', block: 'start' }); focusInput(); return; }
    if (!dialog.open) { if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', ''); }
    focusInput();
  }
  function close() { if (inlineHost) return; if (dialog.open) dialog.close(); }
  root.querySelector('.vg-launch').addEventListener('click', function (e) { open(e.currentTarget); });
  root.querySelector('.vg-close').addEventListener('click', close);
  dialog.addEventListener('close', function () { if (returnFocus && returnFocus.focus) returnFocus.focus(); });
  dialog.addEventListener('click', function (e) { if (e.target === dialog) close(); });
  window.addEventListener('iamreel:open-vision-guide', function () { open(); });
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-open-vision-guide]');
    if (t) { e.preventDefault(); open(t); }
  });
  if (inlineHost) { dialog.setAttribute('open', ''); }
  window.iamreelVisionGuide = { open: open, close: close, startOver: startOver, state: function () { return JSON.parse(JSON.stringify(state)); }, blueprint: exportBlueprint, checkContent: checkContent };

  /* Signed-in visitors: the header button becomes "My Sanctuary". */
  function navMemberState() {
    if (!window.supabase || !window.IAMREEL_SUPABASE_KEY) return;
    getClient().then(function (c) { return c && c.auth.getSession(); }).then(function (r) {
      var s = r && r.data && r.data.session; if (!s) return;
      sessionCache = s;
      var nav = document.querySelector('#nav .nav-cta');
      if (nav && !/sanctuary/.test(nav.getAttribute('href') || '')) { nav.textContent = 'My Sanctuary'; nav.setAttribute('href', 'sanctuary.html'); nav.removeAttribute('data-open-vision-guide'); }
    }).catch(function () {});
  }

  /* Make sure prices are available, then render. */
  (window.IAMREEL_PRODUCTS ? Promise.resolve() : loadScript(new URL('../../iam-config.js', base).href).catch(function () {})).then(function () { render(); navMemberState(); });
})();
