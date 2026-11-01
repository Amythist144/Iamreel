/* I AM REEL — content guidelines check, shared by pages that don't load the Vision Guide (e.g. the Sanctuary Reel Planner).
   The RULES below are copied verbatim from assets/vision-guide/guide.js; keep the two in sync when either changes.
   Usage: window.IAMREEL_checkContent(text, field) -> { ok, cat?, soft?, message? }. Fields 'moment'/'setting' are imagery (minors blocked). */
(function () {
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

  window.IAMREEL_CONTENT_GUIDELINES = GUIDELINES;
  window.IAMREEL_checkContent = checkContent;
})();
