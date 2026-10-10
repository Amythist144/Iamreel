(() => {
  'use strict';
  if (window.iamreelDemoGuide) return;
  const script = document.currentScript;
  const base = new URL('.', script.src);
  const sheet = document.createElement('link');
  sheet.rel = 'stylesheet'; sheet.href = new URL('demo.css', base); document.head.append(sheet);
  const root = document.createElement('div'); root.id = 'vg-demo'; document.body.append(root);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const questions = [
    ['goal', 'Let’s focus on one goal. What would you love to see yourself experiencing?', 'A loving relationship, meaningful work, a peaceful home…'],
    ['moment', 'Imagine that goal coming to life. What specific moment would you like to see?', 'Walking hand in hand along a sunrise beach…'],
    ['setting', 'Where does this moment happen, and who or what should be there?', 'A quiet beach with my partner; warm sunrise light…'],
    ['feeling', 'How do you want to feel when you see this vision?', 'Loved, peaceful, confident, joyful…'],
    ['style', 'What visual style and affirmation would make this feel like you?', 'Natural and cinematic. “I welcome a loving, joyful future.”']
  ];
  const example = {goal:'Build a loving, lasting relationship',moment:'Walk hand in hand with my partner along a sunrise beach',setting:'A quiet ocean beach, warm sunlight, two people walking away from the camera',feeling:'Loved, peaceful, hopeful and connected',style:'Natural cinematic imagery. “I welcome a loving, joyful future.”'};
  const products = [
    {id:'reel',name:'Personalized Cinematic Vision Reel',price:300,copy:'A moving, cinematic expression of your one goal, with music and optional affirmations.',image:'assets/ev-create/cv-prod-video.webp'},
    {id:'image',name:'Personalized Vision Image',price:30,copy:'One meaningful scene to make your future feel vivid and personal.',image:'assets/ev-create/cv-prod-portrait.webp'},
    {id:'collection',name:'Vision Collection keepsake',price:null,copy:'Explore wall art, journals, pillows or blankets inspired by an approved vision image. Pricing will come from Shopify.',image:'assets/ev-collection/vc-pillow-romance.jpg'}
  ];
  let state = {step:'welcome',answers:{},question:0,product:null,wallpaper:'Phone',photos:false,approved:false,stage:0,globalText:'',globalConsent:{text:false,image:false,name:false,likeness:false}};
  let history = [], returnFocus = null, timer = null;
  const stages = ['Blueprint Complete','Photos Received','Character Creation','Production','Human Review','Complete'];
  const asset = path => new URL('../../' + path, base).href;
  root.innerHTML = `<button class="vg-launch" type="button" aria-haspopup="dialog" aria-controls="vg-dialog"><span aria-hidden="true">✦</span> Vision Guide <small>DEMO</small></button><dialog id="vg-dialog" aria-labelledby="vg-title"><div class="vg-shell"><header class="vg-header"><div><span class="vg-eyebrow">I AM REEL</span><h2 id="vg-title">Your Vision Guide</h2></div><button class="vg-close" type="button" aria-label="Close Vision Guide">×</button></header><div class="vg-notice">PRESENTATION DEMO · Simulated conversation and order · No charges or uploads</div><div class="vg-layout"><main class="vg-main" tabindex="-1"></main><aside class="vg-blueprint" aria-label="Your Vision Blueprint"></aside></div><footer class="vg-footer"><button class="vg-reset" type="button">Restart demo</button><span>One goal. A future that feels like you.</span></footer></div></dialog>`;
  const dialog = root.querySelector('dialog'), main = root.querySelector('.vg-main'), side = root.querySelector('.vg-blueprint');
  const button = (label,action,kind='primary') => `<button type="button" class="vg-button vg-${kind}" data-action="${action}">${label}</button>`;
  const move = step => { history.push(state.step); state.step=step; render(); };
  function blueprint() {
    const entries = questions.filter(([key]) => state.answers[key]);
    side.innerHTML = `<span class="vg-eyebrow">YOUR VISION BLUEPRINT</span><h3>One goal, made personal.</h3>${entries.length ? entries.map(([key])=>`<div class="vg-field"><span>${({goal:'My goal',moment:'The moment',setting:'People & place',feeling:'The feeling',style:'Style & affirmation'})[key]}</span><p>${esc(state.answers[key])}</p></div>`).join('') : '<p class="vg-muted">Your answers will build a clear picture here, one question at a time.</p>'}<div class="vg-gift">✦ FREE Vision Wallpaper Included<p>One phone or desktop wallpaper with every personalized product.</p></div><p class="vg-muted vg-small">Demo only: sample prices, no live Shopify catalog. Nothing is sent to a server. Don’t enter sensitive information.</p>`;
  }
  function render() {
    clearInterval(timer); timer=null;
    blueprint();
    const selected=products.find(p=>p.id===state.product);
    let html='';
    switch(state.step) {
      case 'welcome': html=`<span class="vg-eyebrow">A BRIGHTER FUTURE, MADE PERSONAL</span><h3>What would you love to see?</h3><p>I’ll help you shape one goal into a Vision Blueprint, choose a product, and try the order journey.</p><p>This is a scripted interactive demo for presentations—not a connected AI service.</p><div class="vg-actions">${button('Start my vision','start')}${button('Try a sample vision','example','secondary')}</div><div class="vg-faq"><h4>How does it work?</h4><p>Develop your vision first. Then choose a product. In the live service, verified payment unlocks secure reference-photo uploads, followed by production and human review.</p>${button('Help me choose a product','browse','secondary')}</div>`; break;
      case 'account': html=`<span class="vg-eyebrow">1 / FREE ACCOUNT</span><h3>A place to develop your vision.</h3><p>In the live service, a free account saves your Blueprint. For this demo, use a sample account—no email or password needed.</p><div class="vg-demo-card">Demo customer<br><strong>Presentation guest</strong></div>${button('Continue with demo account','account')}`;break;
      case 'conversation': {
        const [key,q,placeholder]=questions[state.question];
        html=`<span class="vg-eyebrow">2 / YOUR VISION · QUESTION ${state.question+1} OF ${questions.length}</span><h3>${q}</h3>${state.question ? `<div class="vg-reply"><span>YOUR LAST ANSWER</span><p>${esc(state.answers[questions[state.question-1][0]])}</p><p>Thank you. Let’s add a little more detail to this same goal.</p></div>`:''}<form id="vg-answer"><label for="vg-answer-text">Your answer</label><textarea id="vg-answer-text" maxlength="800" required placeholder="${esc(placeholder)}">${esc(state.answers[key]||'')}</textarea><div class="vg-actions"><button class="vg-button vg-primary" type="submit">${state.question===4?'Review my Blueprint':'Continue'}</button>${state.question?button('Previous question','previous','secondary'):''}</div></form>${button('Use the sample answer','sample-answer','quiet')}`;break;
      }
      case 'review': html=`<span class="vg-eyebrow">3 / REVIEW & REFINE</span><h3>Does this feel like your future?</h3><p>Edit any detail below. Your approved Blueprint will guide the product.</p><form id="vg-review">${questions.map(([key])=>`<label for="vg-${key}">${({goal:'One goal',moment:'Specific moment',setting:'People, pets & place',feeling:'Desired feeling',style:'Visual style & approved wording'})[key]}</label><textarea id="vg-${key}" name="${key}" maxlength="800" required>${esc(state.answers[key]||'')}</textarea>`).join('')}<button type="submit" class="vg-button vg-primary">Approve Blueprint & see products</button></form>`;break;
      case 'products': html=`<span class="vg-eyebrow">4 / CHOOSE YOUR PRODUCT</span><h3>${state.approved?'Bring this vision to life.':'Find the right way to see your future.'}</h3><p>${state.approved?'For a vivid moving scene, explore the Cinematic Vision Reel. For one focused reminder, start with a Vision Image.':'These are demo examples. Develop your Blueprint before trying checkout.'}</p><div class="vg-products">${products.map(p=>`<article class="vg-product"><img src="${asset(p.image)}" alt="Sample ${esc(p.name)}" loading="lazy"><div><h4>${p.name}</h4><p>${p.copy}</p><strong>${p.price===null?'Quote in live catalog':`$${p.price} · demo price`}</strong><span class="vg-included">FREE Vision Wallpaper Included</span>${button(p.price===null?'Explore keepsakes':'Choose this product','choose-'+p.id)}</div></article>`).join('')}</div>${button('Review my Blueprint','review','secondary')}`;break;
      case 'keepsake': html=`<span class="vg-eyebrow">VISION COLLECTION</span><h3>One vision, many possibilities.</h3><p>A keepsake can be created from your approved vision image. Choose the personalized image first; collection product prices and availability will come from Shopify in the live service.</p><div class="vg-demo-card">Wall art · Journal · Pillow · Blanket · Mug</div>${button('Choose a Vision Image first','choose-image')}${button('Back to products','products','secondary')}`;break;
      case 'checkout': html=`<span class="vg-eyebrow">5 / SIMULATED SHOPIFY CHECKOUT</span><h3>Review your demo order.</h3><div class="vg-order"><h4>${selected.name}</h4><p>One approved Vision Blueprint</p><p>FREE Vision Wallpaper Included</p><strong>Demo total: $${selected.price}</strong></div><p>No payment details are collected. This button simulates a successful order; it does not contact Shopify or authorize production.</p>${button('Simulate successful payment','pay')}${button('Choose a different product','products','secondary')}`;break;
      case 'references': html=`<span class="vg-eyebrow">6 / DEMO ORDER CONFIRMED</span><h3>Your vision is ready for the next step.</h3><p>Demo order <strong>DEMO-1001</strong> · No real purchase occurred.</p><p>In the live service, the backend verifies payment before private uploads unlock. Here, use sample references only.</p><div class="vg-photo-slots">${['Front-facing','Side / profile','Full-body'].map((label,i)=>`<div><span aria-hidden="true">${['◉','◐','♙'][i]}</span><strong>${label}</strong><small>${state.photos?'Sample reference selected':'Demo placeholder'}</small></div>`).join('')}</div><p class="vg-small">Use clear, well-lit photos without filters. Your face should be visible in the first two; your whole body should be visible in the third. Never upload customer photos to GitHub.</p>${button(state.photos?'Sample references selected':'Use sample reference photos','photos',state.photos?'secondary':'primary')}<fieldset><legend>Choose your FREE Vision Wallpaper</legend>${['Phone','Desktop'].map(v=>`<label class="vg-radio"><input type="radio" name="wallpaper" value="${v}" ${state.wallpaper===v?'checked':''}> ${v} wallpaper</label>`).join('')}</fieldset>${button('Review production package','package')}`;break;
      case 'package': html=`<span class="vg-eyebrow">7 / PRODUCTION PACKAGE</span><h3>One last review.</h3><dl class="vg-summary"><dt>Customer & order</dt><dd>Presentation guest / DEMO-1001</dd><dt>Product</dt><dd>${selected.name}</dd><dt>Approved vision</dt><dd>${esc(state.answers.goal)}</dd><dt>References</dt><dd>3 sample placeholders · no uploads</dd><dt>FREE wallpaper</dt><dd>${state.wallpaper}</dd><dt>Production</dt><dd>Manual creation + human quality review</dd></dl><p>Your full Blueprint, people and places, visual preferences and affirmations appear in the panel.</p>${button('Confirm & simulate production','produce')}${button('Change reference details','references','secondary')}`;break;
      case 'production': html=`<span class="vg-eyebrow">8 / MANUAL PRODUCTION DEMO</span><h3>Your vision is taking shape.</h3><p>Advance the queue to show the developer each stage. No image or video is being generated.</p><ol class="vg-stages">${stages.map((s,i)=>`<li class="${i<state.stage?'vg-done':i===state.stage?'vg-current':''}"><span>${i<state.stage?'✓':i+1}</span>${s}${i===state.stage?' <small>Current demo stage</small>':''}</li>`).join('')}</ol>${button(state.stage===5?'View demo delivery':'Advance demo stage',state.stage===5?'delivery':'advance')}`;break;
      case 'delivery': html=`<span class="vg-eyebrow">9 / SAMPLE DELIVERY</span><h3>A future to keep in sight.</h3><p>Demo order complete: ${selected.name} + FREE ${state.wallpaper.toLowerCase()} Vision Wallpaper.</p><img class="vg-delivery" src="${asset('assets/ev-collection/computer-wallpaper.webp')}" alt="Sample sunrise beach artwork; not generated from your Blueprint"><p class="vg-small">Illustrative sample only—not personalized to your answers. Live delivery follows production and human review.</p>${button('Download demo production brief','download','secondary')}<div class="vg-faq"><h4>What future would you love for humanity?</h4><p>Contributing to the Global Vision Project is optional and never required to purchase. We collect a separate Blueprint, not a video.</p>${button('Try a Global Vision contribution','global')}</div>`;break;
      case 'global': html=`<span class="vg-eyebrow">OPTIONAL / GLOBAL VISION PROJECT</span><h3>What do you want the future of humanity to look like?</h3><form id="vg-global"><label for="vg-humanity">Describe one idea for humanity</label><textarea id="vg-humanity" maxlength="1200" required placeholder="Thriving communities with gardens, clean energy and connection…">${esc(state.globalText)}</textarea><fieldset><legend>Separate permissions for sharing personal vision elements</legend><p class="vg-small">All optional. Demo selections only—no permission or submission is saved to I AM REEL.</p>${Object.entries({text:'Written personal vision content',image:'Approved generated imagery',name:'My name',likeness:'My personal likeness'}).map(([key,label])=>`<label class="vg-radio"><input type="checkbox" name="consent-${key}" ${state.globalConsent[key]?'checked':''}> ${label}</label>`).join('')}</fieldset><button class="vg-button vg-primary" type="submit">Review Global Blueprint</button></form>`;break;
      case 'global-review': html=`<span class="vg-eyebrow">GLOBAL BLUEPRINT / REVIEW</span><h3>A vision for our shared future.</h3><div class="vg-demo-card">${esc(state.globalText)}</div><p>Selected personal-vision permissions: ${esc(Object.keys(state.globalConsent).filter(k=>state.globalConsent[k]).join(', ')||'None')}.</p><p>In the live service, an approved structured Blueprint will be stored for future theme analysis. This demo submits nothing and generates no media.</p>${button('Simulate approving submission','global-submit')}${button('Edit Global Blueprint','global','secondary')}`;break;
      case 'global-done': html=`<span class="vg-eyebrow">DEMO COMPLETE</span><h3>Thank you for imagining a brighter future.</h3><p>Your Global Blueprint has been approved in this demo only. Nothing was submitted or stored on a server.</p>${button('Return to sample delivery','delivery')}${button('Start a new demonstration','reset','secondary')}`;break;
    }
    main.innerHTML=html; main.scrollTop=0;
    main.focus({preventScroll:true});
  }
  function reset(){clearInterval(timer);state={step:'welcome',answers:{},question:0,product:null,wallpaper:'Phone',photos:false,approved:false,stage:0,globalText:'',globalConsent:{text:false,image:false,name:false,likeness:false}};history=[];render();}
  function open(){returnFocus=document.activeElement;if(!dialog.open)dialog.showModal();render();}
  function close(){dialog.close();returnFocus?.focus();}
  function action(a){
    if(a==='start')move('account');
    else if(a==='example'){state.answers={...example};state.approved=false;move('review');}
    else if(a==='account'){state.question=0;move('conversation');}
    else if(a==='browse')move('products');
    else if(a==='sample-answer'){main.querySelector('textarea').value=example[questions[state.question][0]];main.querySelector('textarea').focus();}
    else if(a==='previous'){state.question=Math.max(0,state.question-1);render();}
    else if(a.startsWith('choose-')){const id=a.slice(7);if(id==='collection')move('keepsake');else if(!state.approved){state.product=id;move('account');}else{state.product=id;move('checkout');}}
    else if(a==='pay')move('references');
    else if(a==='photos'){state.photos=true;render();}
    else if(a==='package'){if(!state.photos){main.querySelector('[data-action="photos"]').focus();return;}move('package');}
    else if(a==='produce'){state.stage=0;move('production');}
    else if(a==='advance'){state.stage=Math.min(5,state.stage+1);render();}
    else if(a==='reset')reset();
    else if(a==='global-submit')move('global-done');
    else if(a==='download'){
      const data={demo:true,noRealOrder:true,customer:'Presentation guest',orderId:'DEMO-1001',product:state.product,blueprint:state.answers,wallpaper:state.wallpaper,referencePhotos:'Sample placeholders only',productionStages:stages,globalBlueprint:state.globalText,permissions:state.globalConsent};
      const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='I_AM_REEL_DEMO_Production_Brief.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }else move(a);
  }
  root.addEventListener('click', e=>{const a=e.target.closest('[data-action]');if(a)action(a.dataset.action);});
  root.querySelector('.vg-launch').onclick=open;root.querySelector('.vg-close').onclick=close;root.querySelector('.vg-reset').onclick=reset;
  dialog.addEventListener('cancel',()=>{returnFocus?.focus();});
  root.addEventListener('change',e=>{if(e.target.name==='wallpaper')state.wallpaper=e.target.value;});
  root.addEventListener('submit',e=>{
    e.preventDefault();
    if(e.target.id==='vg-answer'){
      const text=main.querySelector('textarea').value.trim();if(!text)return;state.answers[questions[state.question][0]]=text;
      if(state.question<4){state.question++;render();}else move('review');
    }else if(e.target.id==='vg-review'){
      const data=new FormData(e.target);for(const [key] of questions){const value=String(data.get(key)||'').trim();if(!value)return;state.answers[key]=value;}
      state.approved=true;move(state.product?'checkout':'products');
    }else if(e.target.id==='vg-global'){
      state.globalText=main.querySelector('textarea').value.trim();if(!state.globalText)return;
      for(const key of Object.keys(state.globalConsent))state.globalConsent[key]=Boolean(e.target.querySelector(`[name="consent-${key}"]`).checked);move('global-review');
    }
  });
  document.addEventListener('click',e=>{
    if(root.contains(e.target))return;
    const cta=e.target.closest('a,button,input[type="submit"]');if(!cta)return;
    const label=(cta.textContent||cta.value||'').trim().replace(/\s+/g,' ').toLowerCase();
    const start=/^start (my|your|with your) vision\b|^start creating\b|^start your future now\b/.test(label);
    const guide=/ask (the|your) guide|vision guide/.test(label);
    const create=label==='create your vision'&&!cta.closest('nav');
    const product=cta.matches('.cv-product-select,.cv-open-guide,.guide-preview-link,[data-open-vision-guide]');
    if(start||guide||create||product){e.preventDefault();e.stopImmediatePropagation();open();}
  },true);
  window.addEventListener('iamreel:open-vision-guide',open);
  window.iamreelDemoGuide={open,reset};
  if(new URLSearchParams(location.search).get('vision-demo')==='1')open();
})();
