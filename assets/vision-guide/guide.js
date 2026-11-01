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

  /* ---------------- Questions (one at a time) ---------------- */
  var QUESTIONS = [
    { key: 'dream', label: 'Your dream', ask: 'Let’s begin with one dream. What would you love to see yourself living? Just type it the way you’d tell a close friend.', placeholder: 'For example: travel the world with the love of my life…' },
    { key: 'moment', label: 'Specific moment', ask: 'Now picture that dream as already real. What’s one specific moment you’d love to see yourself in? (Like “walking hand in hand along a sunrise beach” or “opening the door to my new home.”)', placeholder: 'The moment I see myself in…' },
    { key: 'setting', label: 'People, pets & place', ask: 'Where are you, and who or what is with you? Describe the people, pets and place. Anyone besides you will be AI-generated, not a real photo, so simply describe them, like “a handsome man with dark hair and a beard,” “my golden retriever” or “a crowd applauding.”', placeholder: 'Where I am and who is with me…' },
    { key: 'feeling', label: 'Desired feeling', ask: 'How do you want to feel in that moment? Name the feelings: peaceful, adored, free, proud, abundant… whatever is true for you.', placeholder: 'I want to feel…' }
  ];
  var SAMPLE = {
    dream: 'Build a loving, lasting relationship',
    moment: 'Walk hand in hand with my partner along a sunrise beach',
    setting: 'A quiet ocean beach at sunrise with warm golden light, and a handsome man with dark hair and a beard walking beside me',
    feeling: 'Loved, peaceful, hopeful and connected'
  };
  var PRODUCT_ORDER = ['cinematic_reel', 'dream_portrait', 'dream_scenes_3', 'vision_board_8', 'video_meditation'];
  var PRODUCT_COPY = {
    cinematic_reel: 'Your dream, filmed. A cinematic reel of you living the moment you described, set to music and woven with your affirmations. It opens and closes with a hypnotic kaleidoscope that quiets your mind, so you receive your dream as reel.',
    dream_portrait: 'One stunning personalized image of you inside your dream, a single vivid reminder of who you’re becoming.',
    dream_scenes_3: 'Three personalized scenes that tell your dream like a story: the moment, the place and the feeling, all with you in them.',
    vision_board_8: 'A personalized Vision Board with up to 8 images from your dream, designed as one beautiful board for your wall, desk or screen.',
    video_meditation: 'A guided meditation video built from 3 personalized images of you living your dream, paired with your own affirmations. It opens and closes with a hypnotic kaleidoscope to settle you before and after.'
  };
  /* Codes the existing Vision Collection checkout already knows (collection.html names map). */
  var COLLECTION_CODES = ['dream_portrait', 'audio_meditation', 'video_meditation', 'cinematic_reel'];

  /* ---------------- Content guidelines ---------------- */
  var GUIDELINES = 'A loving note: keep your vision uplifting and personal. We don’t create explicit or sexual content, strong language, violence or hate, celebrities or public figures, real people other than you, or children in personalized images. Anyone else in your scenes is AI-generated from your description.';
  var RULES = [
    { cat: 'explicit', re: /\b(porn\w*|nudes?|naked|nudity|topless|bottomless|xxx|nsfw|erotic\w*|fetish\w*|sex|sexual\w*|intercourse|orgasm\w*|genital\w*|boobs?|tits|penis|vagina|lingerie|stripper|strip ?club|striptease|onlyfans|horny)\b/,
      msg: 'Let’s keep your vision beautiful and tasteful. Romance and closeness are welcome, but we don’t create explicit or sexual content. Could you describe the feeling of the moment instead, like being adored, close and safe?' },
    { cat: 'profanity', re: /\b(fuck\w*|f\*+k\w*|shit\w*|bullshit|bitch\w*|cunt\w*|asshole\w*|motherf\w*|dickhead\w*|bastard\w*|whore\w*|slut\w*|pissed)\b/,
      msg: 'I can feel the passion in that! Let’s say it in words that raise your vibration. Could you rephrase it without the strong language?' },
    { cat: 'violence', re: /\b(kill(?!\s+it\b)|kills|killing(?!\s+it\b)|murder\w*|stab\w*|behead\w*|massacre\w*|tortur\w*|gore|gory|bomb(s|ing)?|terroris\w*|rape\w*|raping|assault\w*|revenge|weapons?|guns?|rifles?|shoot (him|her|them|people)|hurt (him|her|them)|destroy (him|her|them)|nazi\w*|kkk|white power|heil|genocide|ethnic cleansing|hate (all|those|every))\b/,
      msg: 'Your vision is a place of peace and possibility, so we don’t create violent or hateful imagery. What would it look like if that energy became something you’re building or celebrating?' },
    { cat: 'celebrity', re: /\b(celebrit(y|ies)|famous (person|people|actor|actress|singer|rapper|athlete)|public figure|movie star|taylor swift|beyonc[eé]|oprah|elon musk|donald trump|trump|joe biden|biden|barack obama|obama|kamala harris|kim kardashian|kardashians?|brad pitt|angelina jolie|tom cruise|tom hanks|leonardo dicaprio|dicaprio|rihanna|drake|kanye|lady gaga|ariana grande|justin bieber|selena gomez|jennifer aniston|jennifer lopez|j\.?lo|george clooney|dwayne johnson|keanu reeves|ryan reynolds|ryan gosling|chris hemsworth|zendaya|harry styles|ed sheeran|adele|lebron( james)?|michael jordan|tom brady|cristiano ronaldo|ronaldo|lionel messi|messi|serena williams|king charles|prince harry|prince william|meghan markle|kate middleton|the pope|prime minister|the president)\b/,
      msg: 'This dream is all about you, so we don’t include celebrities or public figures. You can describe the kind of person or energy instead, like “a legendary musician joining me on stage” or “a crowd of thousands applauding.”' },
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
      out.push('I feel ' + feelingList(value) + '. This is my natural frequency.');
      out.push('Every day I raise my vibration and step deeper into my best life.');
    }
    return out.map(function (s) { return cap(s.replace(/\s+/g, ' ').replace(/\.\.+$/, '.').replace(/([.!?])\.$/, '$1')); });
  }
  function mirrorFor(key, value) {
    var c;
    if (key === 'dream') return '“' + short(value) + '.” What a beautiful dream to hold. I can already feel the energy in it, and I’ve started your Vision Blueprint.';
    if (key === 'moment') { c = presentClause(value); return 'Oh, I love that moment. ' + (c ? cap(toYou(c)) + '.' : 'I can see it: ' + toYou(nounPhrase(value)) + '.') + ' It’s in your blueprint now.'; }
    if (key === 'setting') {
      var s = 'Beautiful. I can see the whole scene: ' + toYou(nounPhrase(value)) + '.';
      if (PEOPLE_RE.test(value)) s += ' Anyone with you will be AI-generated from your description, never a real photo of anyone but you, so feel free to add how you’d love them to look.';
      return s;
    }
    if (key === 'feeling') return cap(toYou(feelingList(value))) + '. Yes. That’s the frequency we’ll build everything around.';
    return '';
  }

  /* ---------------- Dream vision paragraphs (second person) ---------------- */
  function visionParagraphs(a, kept) {
    var dream = presentClause(a.dream), moment = presentClause(a.moment);
    var p1 = 'Close your eyes and let it be real. ' +
      (dream ? cap(toYou(dream)) + ', and today it shows in everything around you. ' : 'You are living your dream of ' + toYou(nounPhrase(a.dream)) + ', and today it shows in everything around you. ') +
      (moment ? cap(toYou(moment)) + '. ' : (a.moment ? 'This is your moment: ' + toYou(nounPhrase(a.moment)) + '. ' : '')) +
      (a.setting ? 'All around you is ' + toYou(nounPhrase(a.setting)) + '. ' : '') +
      'The light is soft and golden, every color a little brighter than you remember, and every breath tells you that you belong here.';
    var aff = (kept && kept[0]) ? ' Your words hum quietly beneath it all: “' + kept[0] + '”' : '';
    var p2 = (a.feeling ? 'You feel ' + toYou(feelingList(a.feeling)) + ', not as a wish but as the frequency you are living at.' : 'You feel it in your whole body, not as a wish but as the frequency you are living at.') +
      aff + ' This is your best life, already unfolding, and each time you see it, you rise to meet it.';
    return [p1.replace(/\s+/g, ' '), p2.replace(/\s+/g, ' ')];
  }

  /* ---------------- State ---------------- */
  function fresh() { return { v: 1, step: 'welcome', q: 0, answers: {}, affirmations: [], messages: [], approved: false, product: null, sample: false, startedAt: null, updatedAt: null }; }
  var state = fresh();
  try { var stored = JSON.parse(localStorage.getItem(STATE_KEY) || 'null'); if (stored && stored.v === 1) state = Object.assign(fresh(), stored); } catch (e) { /* ignore */ }
  var saveTimer = null;
  function persist() {
    state.updatedAt = new Date().toISOString();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) { /* storage full or blocked */ } }, 120);
  }
  function keptAffirmations() { return state.affirmations.filter(function (x) { return x.keep; }).map(function (x) { return x.text; }); }
  /* Blueprint export — compatible with visions.blueprint (jsonb) for the paid guide to continue from. */
  function exportBlueprint() {
    var a = state.answers;
    return {
      source: 'free_vision_guide_v1',
      dream: a.dream || '', moment: a.moment || '', people_pets_place: a.setting || '', feeling: a.feeling || '',
      affirmations: keptAffirmations(),
      affirmation_choices: state.affirmations.map(function (x) { return { statement: x.text, keep: x.keep, from: x.from }; }),
      dream_vision: state.approved ? visionParagraphs(a, keptAffirmations()) : [],
      chosen_product: state.product || null,
      approved: !!state.approved,
      created_at: state.startedAt, updated_at: state.updatedAt
    };
  }
  function conversationSummary() {
    var a = state.answers;
    return ['Dream: ' + (a.dream || ''), 'Moment: ' + (a.moment || ''), 'People, pets & place: ' + (a.setting || ''), 'Feeling: ' + (a.feeling || '')].join('\n');
  }

  /* ---------------- Shell ---------------- */
  var inlineHost = document.querySelector('[data-vision-guide-inline]');
  var root = document.createElement('div');
  root.id = 'vg-guide';
  if (inlineHost) { root.className = 'vg-inline'; inlineHost.appendChild(root); } else document.body.appendChild(root);
  if (!document.querySelector('link[data-vg-css]')) {
    var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = new URL('guide.css?v=20261031b', base).href; css.setAttribute('data-vg-css', '');
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
    '<footer class="vg-footer"><span>One dream. A future that feels like you.</span><button class="vg-button vg-primary vg-save-open" type="button">♡ Save this dream vision</button></footer>' +
    '<div class="vg-save" hidden></div>' +
    '</div></dialog>';
  var dialog = root.querySelector('dialog'), main = root.querySelector('.vg-main'), side = root.querySelector('.vg-blueprint'), savePane = root.querySelector('.vg-save');
  var returnFocus = null;
  var btn = function (label, action, kind, extra) { return '<button type="button" class="vg-button vg-' + (kind || 'primary') + '" data-action="' + action + '"' + (extra || '') + '>' + label + '</button>'; };

  /* ---------------- Blueprint aside ---------------- */
  function renderBlueprint() {
    var a = state.answers, kept = keptAffirmations();
    var fields = QUESTIONS.filter(function (q) { return a[q.key]; }).map(function (q) {
      return '<div class="vg-field"><span>' + esc(q.label) + '</span><p>' + esc(a[q.key]) + '</p></div>';
    }).join('');
    if (kept.length) fields += '<div class="vg-field"><span>Affirmations</span><ul>' + kept.map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('') + '</ul></div>';
    if (state.product && products()[state.product]) fields += '<div class="vg-field"><span>Your choice</span><p>' + esc(products()[state.product].name) + '</p></div>';
    side.innerHTML = '<span class="vg-eyebrow">YOUR VISION BLUEPRINT</span><h3>One dream, made personal.</h3>' +
      (fields || '<p class="vg-muted">Your answers will build a clear picture here, one question at a time.</p>') +
      '<div class="vg-gift">✦ FREE personalized Vision Wallpaper<p>Included with every personalized product: you, living your dream, every time you unlock your phone.</p></div>' +
      '<p class="vg-muted vg-small">Your dream stays private on this device until you save it to your Sanctuary.</p>';
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
    return '<span class="vg-eyebrow">4 / CHOOSE YOUR DREAM IMAGES</span><h3 id="vg-products-title">Choose your dream images</h3>' +
      '<p>' + (intro || 'Turn the vision you just created into images and film you can see every day.') + '</p>' +
      '<div class="vg-kaleido"><img src="' + kaleidoImg + '" alt=""><p><strong>Every video, including your Dream Reel, opens and closes with a hypnotic kaleidoscope.</strong> It quiets the mind into a calm, receptive state, so your mind and feelings can accept your dream as reel.</p></div>' +
      '<div class="vg-products">' + cards + '</div>' +
      '<div class="vg-wallpaper"><img src="' + esc(asset('assets/ev-collection/phone-wallpaper.webp')) + '" alt="" loading="lazy"><div><span class="vg-eyebrow">OUR GIFT TO YOU</span><h4>Your FREE personalized Vision Wallpaper</h4>' +
      '<p>Imagine the first thing you see every time you unlock your phone: you, already living your dream. Your Vision Wallpaper turns dozens of everyday glances into quiet moments that raise your vibration and keep your dream in front of you.</p>' +
      '<p>It’s included free with every personalized product. After you purchase, you’ll upload your photo in your private Sanctuary and we’ll personalize your wallpaper so it’s unmistakably you, for your phone or desktop.</p></div></div>';
  }

  /* ---------------- Views ---------------- */
  function composeHtml(placeholder) {
    return '<div class="vg-compose"><form class="vg-compose-row" data-compose><label class="vg-sr" for="vg-input" hidden>Your answer</label>' +
      '<textarea id="vg-input" rows="1" maxlength="600" placeholder="' + esc(placeholder || 'Type your answer…') + '" aria-label="Type your answer, then press Enter to send"></textarea>' +
      '<button type="submit" class="vg-button vg-primary" aria-label="Send">Send ➤</button></form>' +
      '<p class="vg-hint">Press Enter to send · Shift + Enter for a new line</p>' +
      '<details class="vg-guidelines"' + (window.innerWidth > 640 ? ' open' : '') + '><summary>Content guidelines</summary>' + GUIDELINES + '</details><div class="vg-compose-warn" aria-live="polite"></div></div>';
  }
  function welcomeHtml() {
    return '<span class="vg-eyebrow">A BRIGHTER FUTURE, MADE PERSONAL</span>' +
      '<h3>What would you love to see?</h3>' +
      '<p>I’m your Vision Guide. Together we’ll shape one dream into a Vision Blueprint, write affirmations that raise your vibration, and see how you’d love to bring your dream to life.</p>' +
      '<div class="vg-actions">' + btn('Start my vision', 'start') + btn('Try a sample vision', 'sample', 'secondary') + '</div>' +
      '<p class="vg-small vg-muted">Or simply tell me your dream right here:</p>' + composeHtml('Tell me your dream…') +
      '<div class="vg-faq"><h4>How does it work?</h4><p>Share your dream first, one question at a time, in your own words. As you answer, I build your Vision Blueprint and affirmations for you to review. When it feels like your future, choose how you’d love to see it. After purchase, you’ll securely upload your photos so your personalized images look like you, followed by production and a loving human review.</p>' +
      btn('Help me choose a product', 'browse', 'secondary') + '</div>';
  }
  function reviewHtml() {
    var a = state.answers;
    var box = function (key, label, help) {
      return '<label class="vg-label" for="vg-f-' + key + '">' + label + (help ? '<small>' + help + '</small>' : '') + '</label>' +
        '<textarea id="vg-f-' + key + '" data-field="' + key + '" placeholder="' + esc((QUESTIONS.filter(function (q) { return q.key === key; })[0] || {}).placeholder || '') + '">' + esc(a[key] || '') + '</textarea><div class="vg-field-warn" data-warn="' + key + '" aria-live="polite"></div>';
    };
    return '<span class="vg-eyebrow">2 / REVIEW &amp; REFINE</span><h3>Does this feel like your future?</h3>' +
      '<p>Everything you share appears here. Change any words so they feel exactly right. Your blueprint updates as you type.</p>' +
      box('dream', 'Your dream') + box('moment', 'Specific moment') +
      box('setting', 'People, pets &amp; place', 'Only you appear as yourself. Everyone else is AI-generated from your description, never a real photo of anyone else. Describe them freely: “a handsome man with dark hair and a beard,” “a crowd applauding,” “my fluffy white dog.” No celebrities, public figures or children, please.') +
      box('feeling', 'Desired feeling') +
      '<div class="vg-label">Your affirmations<small>Written in the present tense as you share. Keep the ones that feel true (checked) and uncheck any that don’t.</small></div>' +
      '<ul class="vg-affirms" data-affirms></ul>' +
      '<div class="vg-actions" data-approve-wrap></div>';
  }
  function affirmsHtml() {
    if (!state.affirmations.length) return '<li class="vg-muted"><span>Your affirmations will appear here as you answer.</span></li>';
    return state.affirmations.map(function (x, i) {
      return '<li class="' + (x.keep ? '' : 'off') + '"><label><input type="checkbox" data-aff="' + i + '"' + (x.keep ? ' checked' : '') + '><span>' + esc(x.text) + '</span></label></li>';
    }).join('');
  }
  function visionHtml() {
    var paras = visionParagraphs(state.answers, keptAffirmations());
    return '<span class="vg-eyebrow">3 / YOUR DREAM VISION</span><h3>Here is your dream, alive.</h3>' +
      '<div class="vg-vision">' + paras.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
      '<p class="vg-ready">Ready to make your dream reel?</p></div>';
  }

  function renderConversation() {
    var done = state.q >= QUESTIONS.length;
    var current = QUESTIONS[Math.min(state.q, QUESTIONS.length - 1)];
    main.innerHTML =
      '<span class="vg-eyebrow">1 / YOUR DREAM' + (done ? '' : ' · QUESTION ' + (state.q + 1) + ' OF ' + QUESTIONS.length) + '</span>' +
      '<div class="vg-chat" data-chat role="log" aria-live="polite"></div>' +
      composeHtml(done ? 'Add anything else, or type “yes” when it feels right…' : current.placeholder) +
      '<section class="vg-section" data-review' + (Object.keys(state.answers).length ? '' : ' hidden') + '>' + reviewHtml() + '</section>' +
      '<section class="vg-section" data-vision' + (state.approved ? '' : ' hidden') + '></section>' +
      '<section class="vg-section" data-products' + (state.approved ? '' : ' hidden') + '></section>';
    var chat = main.querySelector('[data-chat]');
    state.messages.forEach(function (m) { chat.appendChild(msgEl(m.role, m.text)); });
    refreshAffirms(); refreshApprove();
    if (state.approved) refreshVision();
    bindCompose();
  }
  function render() {
    renderBlueprint();
    if (state.step === 'welcome') { main.innerHTML = welcomeHtml(); bindCompose(); }
    else if (state.step === 'browse') {
      main.innerHTML = '<section data-products>' + productsHtml('Here’s everything we create. Share your dream first and every piece is made around it, then come back and choose.') + '</section><div class="vg-actions">' + btn('Start my vision', 'start') + '</div>';
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
  function refreshAffirms() { var ul = main.querySelector('[data-affirms]'); if (ul) ul.innerHTML = affirmsHtml(); }
  function refreshApprove() {
    var w = main.querySelector('[data-approve-wrap]'); if (!w) return;
    var done = QUESTIONS.every(function (q) { return state.answers[q.key]; });
    w.innerHTML = done ? btn(state.approved ? 'Update my dream vision' : 'Yes! See my dream vision', 'approve') : '<p class="vg-small vg-muted">Answer the questions above and your dream vision will appear here.</p>';
  }
  function refreshVision() {
    var v = main.querySelector('[data-vision]'), p = main.querySelector('[data-products]');
    if (!v || !p) return;
    v.hidden = false; p.hidden = false;
    v.innerHTML = visionHtml();
    if (!p.innerHTML) p.innerHTML = productsHtml();
  }
  function showReviewSection() { var r = main.querySelector('[data-review]'); if (r) r.hidden = false; }
  function setField(key, value) {
    state.answers[key] = value;
    var ta = main.querySelector('#vg-f-' + key); if (ta && ta.value !== value) ta.value = value;
  }
  function addAffirmations(key, value) {
    var at = -1;
    state.affirmations.forEach(function (x, i) { if (at < 0 && x.from === key && !x.edited) at = i; });
    state.affirmations = state.affirmations.filter(function (x) { return x.from !== key || x.edited; });
    if (at < 0 || at > state.affirmations.length) at = state.affirmations.length;
    affirmationsFor(key, value).forEach(function (text) {
      if (!state.affirmations.some(function (x) { return x.text.toLowerCase() === text.toLowerCase(); })) state.affirmations.splice(at++, 0, { text: text, keep: true, from: key });
    });
    refreshAffirms();
  }

  /* ---------------- Conversation engine ---------------- */
  var busy = false;
  function typing(cb) {
    var chat = main.querySelector('[data-chat]'); busy = true;
    var t = document.createElement('div'); t.className = 'vg-typing'; t.textContent = 'Your Vision Guide is writing…';
    if (chat) chat.appendChild(t);
    setTimeout(function () { t.remove(); busy = false; cb(); }, 650);
  }
  function startConversation(firstAnswer) {
    state.step = 'chat'; state.startedAt = state.startedAt || new Date().toISOString();
    if (!state.messages.length) state.messages.push({ role: 'guide', text: 'Welcome. This is your space to dream out loud. ' + QUESTIONS[0].ask });
    persist(); render();
    if (firstAnswer) handleAnswer(firstAnswer);
    else focusInput();
  }
  function focusInput() { var i = main.querySelector('#vg-input'); if (i) i.focus({ preventScroll: true }); }
  function warnCompose(msg) { var w = main.querySelector('.vg-compose-warn'); if (w) w.innerHTML = msg ? '<span class="vg-warn" role="alert">' + esc(msg) + '</span>' : ''; }
  function handleAnswer(text) {
    text = String(text || '').trim(); if (!text || busy) return;
    if (state.step === 'welcome') { startConversation(text); return; }
    var q = QUESTIONS[state.q];
    var check = checkContent(text, q ? q.key : 'moment');
    addMsg('user', text);
    warnCompose('');
    if (!check.ok) { typing(function () { addMsg('note', check.message + (q ? ' ' + 'Whenever you’re ready, tell me again in a new way.' : '')); }); return; }
    if (!q) { // all four answered: approve or add detail
      if (/^(yes|yep|yeah|ready|approve|approved|looks? (good|great|perfect)|perfect|i love it|love it|it does|it feels right)\b/i.test(text)) { typing(function () { addMsg('guide', 'Wonderful. Here is your dream, alive. 💛'); approve(); }); return; }
      setField('moment', clean(state.answers.moment) + '. ' + cap(clean(text)));
      addAffirmations('moment', state.answers.moment);
      persist(); renderBlueprint(); if (state.approved) refreshVision();
      typing(function () { addMsg('guide', 'Lovely. I’ve woven that into your moment. You can fine-tune any words below. When it feels right, type “yes” or tap “See my dream vision.”'); });
      return;
    }
    setField(q.key, text);
    addAffirmations(q.key, text);
    state.q += 1; persist(); renderBlueprint(); showReviewSection(); refreshApprove();
    var label = main.querySelector('.vg-eyebrow');
    if (label) label.textContent = '1 / YOUR DREAM' + (state.q < QUESTIONS.length ? ' · QUESTION ' + (state.q + 1) + ' OF ' + QUESTIONS.length : '');
    typing(function () {
      var reply = mirrorFor(q.key, text);
      if (check.soft) reply += ' ' + check.message;
      addMsg('guide', reply);
      var next = QUESTIONS[state.q];
      var input = main.querySelector('#vg-input');
      if (next) { addMsg('guide', next.ask); if (input) input.placeholder = next.placeholder; }
      else {
        addMsg('guide', 'Your Vision Blueprint is ready. Look it over below: edit any words so they feel exactly right, and uncheck any affirmation that doesn’t feel true for you. When it feels like your future, type “yes” or tap “See my dream vision.”');
        if (input) input.placeholder = 'Add anything else, or type “yes” when it feels right…';
      }
    });
  }
  function approve() {
    var missing = QUESTIONS.filter(function (q) { return !state.answers[q.key]; });
    if (missing.length) return;
    state.approved = true; persist(); renderBlueprint(); refreshApprove(); refreshVision();
    var v = main.querySelector('[data-vision]'); if (v) v.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function runSample() {
    state = fresh(); state.step = 'chat'; state.sample = true; state.startedAt = new Date().toISOString();
    state.messages.push({ role: 'note', text: 'Here’s a sample dream so you can see how it works. Edit anything below, or tap “Start over” to share your own.' });
    QUESTIONS.forEach(function (q) {
      state.messages.push({ role: 'guide', text: q.ask });
      state.messages.push({ role: 'user', text: SAMPLE[q.key] });
      state.messages.push({ role: 'guide', text: mirrorFor(q.key, SAMPLE[q.key]) });
      state.answers[q.key] = SAMPLE[q.key];
      affirmationsFor(q.key, SAMPLE[q.key]).forEach(function (t) { if (!state.affirmations.some(function (x) { return x.text === t; })) state.affirmations.push({ text: t, keep: true, from: q.key }); });
    });
    state.q = QUESTIONS.length; persist(); render();
    var r = main.querySelector('[data-review]'); if (r) r.scrollIntoView({ block: 'start' });
  }
  function startOver() {
    state = fresh();
    try { localStorage.removeItem(STATE_KEY); sessionStorage.removeItem('iamreel_checkout_cart'); } catch (e) { /* ignore */ }
    closeSave(); render(); main.scrollTop = 0; focusInput();
  }
  function bindCompose() {
    var form = main.querySelector('[data-compose]'), input = main.querySelector('#vg-input');
    if (!form || !input) return;
    var grow = function () { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 160) + 'px'; };
    input.addEventListener('input', function () { grow(); warnCompose(''); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true })); }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault(); if (busy) return;
      var v = input.value.trim(); if (!v) { focusInput(); return; }
      if (state.step === 'welcome') { var c = checkContent(v, 'dream'); if (!c.ok) { warnCompose(c.message); return; } }
      input.value = ''; grow();
      handleAnswer(v);
      setTimeout(focusInput, 0);
    });
  }

  /* Review edits (live blueprint) */
  var editTimer = null;
  main.addEventListener('input', function (e) {
    var key = e.target.getAttribute && e.target.getAttribute('data-field'); if (!key) return;
    var value = e.target.value, warn = main.querySelector('[data-warn="' + key + '"]');
    var c = checkContent(value, key);
    if (warn) warn.innerHTML = !c.ok ? '<span class="vg-warn" role="alert">' + esc(c.message) + '</span>' : (c.soft ? '<span class="vg-warn">' + esc(c.message) + '</span>' : '');
    if (!c.ok) return;
    state.answers[key] = value.trim();
    if (!state.answers[key]) delete state.answers[key];
    persist(); renderBlueprint(); refreshApprove();
    clearTimeout(editTimer);
    editTimer = setTimeout(function () { if (state.answers[key]) addAffirmations(key, state.answers[key]); persist(); renderBlueprint(); if (state.approved) refreshVision(); }, 700);
  });
  main.addEventListener('change', function (e) {
    var i = e.target.getAttribute && e.target.getAttribute('data-aff'); if (i == null) return;
    var a = state.affirmations[Number(i)]; if (!a) return;
    a.keep = e.target.checked; a.edited = true;
    e.target.closest('li').classList.toggle('off', !a.keep);
    persist(); renderBlueprint(); if (state.approved) refreshVision();
  });

  /* ---------------- Actions ---------------- */
  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-action]'); if (!b) return;
    var act = b.getAttribute('data-action');
    if (act === 'start') { if (state.step === 'browse' && Object.keys(state.answers).length) state.step = 'chat'; startConversation(); }
    else if (act === 'sample') runSample();
    else if (act === 'browse') { state.step = 'browse'; persist(); render(); main.scrollTop = 0; }
    else if (act === 'approve') approve();
    else if (act === 'choose') chooseProduct(b.getAttribute('data-code'));
    else if (act === 'save-submit') submitSave(false);
    else if (act === 'save-signin') submitSave(true);
    else if (act === 'save-toggle') { saveMode = saveMode === 'signup' ? 'signin' : 'signup'; renderSave(); }
    else if (act === 'save-close') closeSave();
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
    var snap = Object.assign({ blueprint: exportBlueprint(), summary: conversationSummary(), messages: state.messages, savedAt: new Date().toISOString(), cloud: { pending: true } }, extra || {});
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(snap)); localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
    return snap;
  }
  function cloudSave(client, session) {
    var bp = exportBlueprint();
    return client.from('visions').insert({
      user_id: session.user.id, title: short(bp.dream || 'My Dream Future', 60), path: 'standard',
      status: bp.approved ? 'blueprint_ready' : 'draft', blueprint: bp, conversation_summary: conversationSummary()
    }).select().single().then(function (res) {
      if (res.error) throw res.error;
      var vision = res.data, tasks = [];
      var kept = keptAffirmations();
      if (kept.length) tasks.push(client.from('affirmations').insert(kept.map(function (s, i) { return { user_id: session.user.id, vision_id: vision.id, statement: s, sort_order: i }; })).then(function (r) { if (r.error) console.warn('[Vision Guide] affirmations not saved:', r.error.message); }));
      var msgs = state.messages.filter(function (m) { return m.role !== 'note'; }).map(function (m) { return { vision_id: vision.id, role: m.role === 'guide' ? 'assistant' : 'user', content: m.text }; });
      if (msgs.length) tasks.push(client.from('vision_messages').insert(msgs).then(function (r) { if (r.error) console.warn('[Vision Guide] messages not saved:', r.error.message); }));
      return Promise.all(tasks).then(function () { saveLocal({ cloud: { pending: false, visionId: vision.id, syncedAt: new Date().toISOString() } }); return vision; });
    });
  }
  function hasDream() { return Object.keys(state.answers).length > 0; }
  function renderSave() {
    var checkout = saveIntent === 'checkout', p = state.product && products()[state.product];
    var head = checkout
      ? '<span class="vg-eyebrow">ONE STEP BEFORE CHECKOUT</span><h3>Save your dream and continue</h3><p>You chose <strong>' + esc(p ? p.name : '') + '</strong>. Create your free Sanctuary account so your dream, affirmations and order stay together. After purchase, you’ll upload your photos there.</p>'
      : '<span class="vg-eyebrow">YOUR PRIVATE SANCTUARY</span><h3>Save this dream vision</h3><p>Create your free account and your dream, blueprint and affirmations will be waiting in your private Sanctuary whenever you want to return.</p>';
    if (!hasDream() && !checkout) {
      savePane.innerHTML = '<div class="vg-save-card" role="dialog" aria-label="Save this dream vision">' + head + '<p class="vg-status">Share your dream first, even just one answer, and then you can save it.</p>' + btn('Start my vision', 'start') + '<button class="vg-linkish" data-action="save-close" type="button">Not now</button></div>';
      return;
    }
    if (sessionCache) {
      savePane.innerHTML = '<div class="vg-save-card" role="dialog" aria-label="Save this dream vision">' + head + '<p class="vg-small">Signed in as ' + esc(sessionCache.user.email || '') + '</p>' +
        btn(checkout ? 'Save &amp; continue' : 'Save to my Sanctuary', 'save-submit') + '<button class="vg-linkish" data-action="save-close" type="button">Not now</button><p class="vg-status" role="status" aria-live="polite"></p></div>';
      return;
    }
    var signin = saveMode === 'signin';
    savePane.innerHTML = '<div class="vg-save-card" role="dialog" aria-label="Save this dream vision">' + head +
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
    var url = 'sanctuary.html?saved=1' + (saveIntent === 'checkout' && state.product ? '&checkout=' + encodeURIComponent(state.product) : '');
    // TODO(sanctuary): sanctuary.html shows the saved dream and syncs it after sign-in; the
    // checkout/payment step for the chosen product still needs to be built there.
    setTimeout(function () { location.href = new URL('../../' + url, base).href; }, note ? 2600 : 900);
  }
  function submitSave(isSignin) {
    if (!hasDream()) { renderSave(); return; }
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
