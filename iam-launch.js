const SUPABASE_URL = "https://jtlqvxcmbgqtcpdhldbm.supabase.co";

/*
  I AM REEL launch application
  Supabase authentication + Vision Guide + PayPal Sandbox + My Sanctuary
*/

let iamSupabase = null;
let currentVision = null;
let paypalClientId = null;
let productChoiceReady = false;
let blueprintReady = false;
let userTurnCount = 0;

const $ = (selector) => document.querySelector(selector);

function setStatus(message) {
  const element = $("#iam-status");
  if (element) element.textContent = message || "";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function addMessage(role, text) {
  const chat = $("#iam-chat");
  if (!chat) return;

  const message = document.createElement("div");
  message.className = "iam-msg " + role;
  message.textContent = text;

  chat.appendChild(message);
  chat.scrollTop = chat.scrollHeight;
}

async function getSession() {
  if (!iamSupabase) return null;

  const result = await iamSupabase.auth.getSession();
  return result.data.session;
}

async function refreshAccount() {
  const session = await getSession();
  const signedIn = Boolean(session);

  $("#iam-auth")?.classList.toggle("iam-hidden", signedIn);
  $("#iam-member")?.classList.toggle("iam-hidden", !signedIn);

  if (!signedIn) return;


  const { data } = await iamSupabase
    .from("visions")
    .select("id,title,status,blueprint,conversation_summary")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (data && data[0]) {
    currentVision = data[0];
    blueprintReady = currentVision.status === "blueprint_ready" || currentVision.status === "production_ready";
    const submitVision = $("#iam-submit-vision");
    if (submitVision) submitVision.disabled = false;
    document.querySelectorAll("[data-wallpaper-choice]").forEach((button) => { button.disabled = !blueprintReady; });
    const wallpaperStatus = $("#iam-wallpaper-status");
    if (blueprintReady && wallpaperStatus) wallpaperStatus.textContent = "Your Blueprint is ready. Choose a wallpaper format to create your complimentary design.";

    const title = $("#iam-vision-title");
    if (title) {
      title.textContent = currentVision.title || "My Dream Future";
    }

    await loadMessages();
    renderBlueprint();
  }

  await loadSanctuary();
}

async function signUp() {
  setStatus("Creating your free account…");

  const email = $("#auth-email").value.trim();
  const password = $("#auth-password").value;

  const { error } = await iamSupabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin + "/create.html"
    }
  });

  if (error) {
    setStatus(error.message);
    return;
  }

  setStatus(
    "Check your email to confirm your account, then return here and sign in."
  );
}

async function signIn() {
  setStatus("Signing in…");

  const email = $("#auth-email").value.trim();
  const password = $("#auth-password").value;

  const { error } = await iamSupabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    setStatus(error.message);
    return;
  }

  setStatus("Welcome back.");
  const inlineProducts = [...document.querySelectorAll("#iam-inline-store input[type=checkbox]")];
  const inlineCheckout = $("#iam-inline-checkout");
  const inlineSummary = $("#iam-cart-summary");
  const inlinePrices = { dream_portrait: 999, audio_meditation: 4900, video_meditation: 9900, cinematic_reel: 19900 };
  const updateInlineCart = () => {
    const selected = inlineProducts.filter(x => x.checked);
    inlineProducts.forEach(x => {
      const card = x.closest(".iam-choice-card");
      card?.classList.toggle("selected", x.checked);
      const label = card?.querySelector(".iam-btn");
      if (label) label.textContent = x.checked ? "Added to cart ✓" : "Add to cart";
    });
    const total = selected.reduce((sum,x)=>sum+(inlinePrices[x.value]||0),0);
    if (inlineSummary) inlineSummary.textContent = selected.length ? selected.length + " selected · $" + (total/100).toFixed(2) : "Choose one or more experiences above.";
    if (inlineCheckout) inlineCheckout.disabled = selected.length === 0;
  };
  inlineProducts.forEach(x => x.addEventListener("change", updateInlineCart));
  inlineCheckout?.addEventListener("click", () => {
    const codes = inlineProducts.filter(x => x.checked).map(x => x.value);
    if (!codes.length) return;
    location.href = "collection.html?checkout=" + encodeURIComponent(codes.join(",")) + "#vision-store";
  });
  updateInlineCart();


  // Decision after ~4 turns
  $("#iam-yes-wallpaper")?.addEventListener("click", () => {
    document.querySelectorAll(".iam-action-btn").forEach(b => b.classList.remove("is-chosen"));
    $("#iam-yes-wallpaper")?.classList.add("is-chosen");
    $("#iam-wallpaper-choices")?.classList.remove("iam-hidden");
    $("#iam-photo-explain")?.classList.add("iam-hidden");
    $("#iam-wallpaper-choices")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  $("#iam-add-photo")?.addEventListener("click", () => {
    document.querySelectorAll(".iam-action-btn").forEach(b => b.classList.remove("is-chosen"));
    $("#iam-add-photo")?.classList.add("is-chosen");
    $("#iam-wallpaper-choices")?.classList.add("iam-hidden");
    $("#iam-photo-explain")?.classList.remove("iam-hidden");
    $("#iam-product-handoff")?.classList.remove("iam-hidden");
    $("#iam-product-handoff")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // Wallpaper choice leads to products
  document.querySelectorAll("#iam-wallpaper-choices [data-wallpaper-choice]").forEach(btn => {
    btn.addEventListener("click", async () => {
      document.querySelectorAll("#iam-wallpaper-choices .iam-action-btn").forEach(b => b.classList.remove("is-chosen"));
      btn.classList.add("is-chosen");
      const format = btn.dataset.wallpaperChoice;
      localStorage.setItem("iamreel_wallpaper_format", format);
      const result = $("#iam-wallpaper-result");
      const status = $("#iam-wallpaper-status");
      const img = $("#iam-wallpaper-image");
      if (status) status.textContent = "Creating your free " + format + " wallpaper from the best scene in your vision…";
      if (img) img.style.display = "none";
      result?.classList.remove("iam-hidden");
      result?.scrollIntoView({ behavior: "smooth", block: "nearest" });

      try {
        const session = await getSession();
        const response = await fetch(SUPABASE_URL + "/functions/v1/generate-wallpaper", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + (session?.access_token || ""),
          },
          body: JSON.stringify({ vision_id: currentVision?.id, format }),
        });
        const data = await response.json();
        if (!response.ok || !data.url) throw new Error(data.error || "Could not create wallpaper");
        if (img) {
          img.src = data.url;
          img.style.display = "block";
        }
        if (status) status.textContent = "Your free " + format + " wallpaper is ready.";
      } catch (err) {
        if (status) status.textContent = "Wallpaper needs the OpenAI function deployed. " + (err.message || "");
      }
    });
  });

  $("#iam-show-products")?.addEventListener("click", () => {
    $("#iam-show-products")?.classList.add("is-chosen");
    $("#iam-product-handoff")?.classList.remove("iam-hidden");
    $("#iam-product-handoff")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // Show photo panel only for personalized visual products
  const personalized = ["dream_portrait", "video_meditation", "cinematic_reel"];
  document.querySelectorAll("#iam-inline-store input[type=checkbox]").forEach(box => {
    box.addEventListener("change", () => {
      const anyPersonal = [...document.querySelectorAll("#iam-inline-store input[type=checkbox]")]
        .some(x => x.checked && personalized.includes(x.value));
      $("#iam-photo-panel")?.classList.toggle("iam-hidden", !anyPersonal);
    });
  });

  $("#iam-photo-yes")?.addEventListener("click", () => {
    $("#iam-photo-status").textContent = "Great — we’ll use this Future Self in your personalized vision.";
  });
  $("#iam-photo-no")?.addEventListener("click", () => {
    $("#iam-photo-status").textContent = "We’ll generate another version. You can also upload a different photo.";
    $("#iam-photo-upload")?.click();
  });

  setupWallpaperChoices();
  setupProductHandoff();
  await refreshAccount();
  const submitVisionButton = $("#iam-submit-vision");
  if (submitVisionButton && currentVision) submitVisionButton.disabled = false;

  iamSupabase.auth.onAuthStateChange((_event, session) => {
    if (session) refreshAccount();
  });
}

async function resetVisionGuide() {
  const session = await getSession();
  if (!session) return;
  const button = $("#iam-reset-vision");
  if (button) { button.disabled = true; button.textContent = "Starting over…"; }
  setStatus("Starting a fresh Vision Guide…");
  try {
    const oldVision = currentVision;
    if (oldVision?.id) {
      // Retire the old session so refreshAccount will never choose it again.
      await iamSupabase.from("visions").update({
        status: "reset",
        updated_at: new Date(Date.now() - 60000).toISOString()
      }).eq("id", oldVision.id).eq("user_id", session.user.id);
    }

    const { data: fresh, error } = await iamSupabase.from("visions").insert({
      user_id: session.user.id,
      title: "My Dream Future",
      path: "standard",
      status: "draft",
      blueprint: {}
    }).select().single();
    if (error) throw error;

    currentVision = fresh;
    blueprintReady = false;
    productChoiceReady = false;
    userTurnCount = 0;
    $("#iam-wallpaper-choices")?.classList.add("iam-hidden");
    $("#iam-requirements-note")?.classList.add("iam-hidden");
    $("#iam-wallpaper-result")?.classList.add("iam-hidden");
    $("#iam-decision")?.classList.add("iam-hidden");
    localStorage.removeItem("iamreel_rejected_affirmations");
    localStorage.removeItem("iamreel_wallpaper_format");
    localStorage.removeItem("iamreel_promo_code");

    const chat = $("#iam-chat"); if (chat) chat.innerHTML = "";
    const list = $("#iam-affirmation-list"); if (list) list.innerHTML = "";
    const starters = $("#iam-starter-pills");
    if (starters) {
      starters.classList.remove("is-used");
      starters.innerHTML = `
        <button type="button" data-vision-starter="I AM abundant.">I AM abundant</button>
        <button type="button" data-vision-starter="I AM happy.">I AM happy</button>
        <button type="button" data-vision-starter="I AM traveling the world.">I AM traveling the world</button>
        <button type="button" data-vision-starter="I AM in a happy relationship.">I AM in a happy relationship</button>
        <button type="button" data-vision-starter="I AM healthy.">I AM healthy</button>`;
      starters.querySelectorAll("[data-vision-starter]").forEach(b => b.addEventListener("click", () => {
        const field=$("#iam-message"); if(!field)return;
        field.value=b.dataset.visionStarter||b.textContent.trim();
        starters.classList.add("is-used");
        sendVisionMessage();
      }));
    }
    $("#iam-product-handoff")?.classList.add("iam-hidden");
    const submit=$("#iam-submit-vision"); if(submit){submit.disabled=false;submit.textContent="Submit my vision";}
    const title=$("#iam-vision-title"); if(title)title.textContent="Let’s build your dream future";
    const promo=$("#iam-promo-code"); if(promo)promo.value="";
    const promoStatus=$("#iam-promo-status"); if(promoStatus)promoStatus.textContent="";
    addMessage("guide","Tell me more about the life you want to step into.");
    setStatus("");
  } catch (error) {
    setStatus(error.message || "Could not start a fresh vision.");
  } finally {
    if (button) { button.disabled=false; button.textContent="Reset to start over"; }
  }
}
async function signOut() {
  await iamSupabase.auth.signOut();
  currentVision = null;
  window.location.reload();
}

async function ensureVision() {
  if (currentVision) return currentVision;

  const session = await getSession();

  if (!session) {
    throw new Error("Please create your free account or sign in first.");
  }

  const { data, error } = await iamSupabase
    .from("visions")
    .insert({
      user_id: session.user.id,
      title: "My Dream Future",
      path: "standard"
    })
    .select()
    .single();

  if (error) throw error;

  currentVision = data;
  return data;
}

async function loadMessages() {
  if (!currentVision) return;

  const { data } = await iamSupabase
    .from("vision_messages")
    .select("role,content")
    .eq("vision_id", currentVision.id)
    .order("created_at");

  const chat = $("#iam-chat");

  if (!chat) return;

  chat.innerHTML = "";

  if (!data || !data.length) {
    addMessage(
      "guide",
      "What is your dream future? Tell me what you would love your life to look and feel like."
    );
    return;
  }

  $("#iam-starter-pills")?.classList.add("is-used");

  data.forEach((item) => {
    addMessage(
      item.role === "assistant" ? "guide" : "user",
      item.content
    );
  });
}

function renderBlueprint() {
  const element = $("#iam-blueprint");

  if (!element) return;

  const blueprint = currentVision?.blueprint || {};

  const values = Object.values(blueprint)
    .flat()
    .filter((value) => typeof value === "string");

  if (!values.length) {
    element.innerHTML =
      '<span class="iam-note">Your Blueprint will take shape as you talk with your Guide.</span>';
    return;
  }

  element.innerHTML = values
    .slice(0, 14)
    .map(
      (value) =>
        '<span class="iam-pill">' +
        escapeHtml(value) +
        "</span>"
    )
    .join("");
}

function renderVisionAffirmations(items) {
  const list = $("#iam-affirmation-list");
  if (!list || !Array.isArray(items)) return;
  const seen = new Set();
  const unique = items.filter(item => {
    const statement = typeof item === "string" ? item : item?.statement;
    if (!statement || seen.has(statement)) return false;
    seen.add(statement); return true;
  });
  list.innerHTML = unique.map((item,i) => {
    const statement = typeof item === "string" ? item : item.statement;
    return '<label class="iam-affirmation-item"><input type="checkbox" class="iam-affirmation-choice" data-statement="' + escapeHtml(statement) + '" checked><span>' + escapeHtml(statement) + '</span></label>';
  }).join("");
  list.querySelectorAll(".iam-affirmation-choice").forEach(box => box.addEventListener("change", () => {
    const rejected = [...list.querySelectorAll(".iam-affirmation-choice:not(:checked)")].map(x => x.dataset.statement);
    localStorage.setItem("iamreel_rejected_affirmations", JSON.stringify(rejected));
    if (!box.checked) {
      const input = $("#iam-message");
      if (input) {
        input.placeholder = "Tell your Guide how you’d like to change that affirmation…";
        input.focus();
      }
    }
  }));
}

async function sendVisionMessage() {
  const input = $("#iam-message");

  if (!input) return;

  const text = input.value.trim();

  if (!text) return;

  input.value = "";
  addMessage("user", text);
  userTurnCount++;

  setStatus("Your Vision Guide is thinking…");

  try {
    const vision = await ensureVision();
    const session = await getSession();

    const response = await fetch(
      SUPABASE_URL + "/functions/v1/vision-guide",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + session.access_token
        },
        body: JSON.stringify({
          vision_id: vision.id,
          message: text
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "The Vision Guide is unavailable.");
    }

    const bp = result.blueprint || currentVision?.blueprint || {};
    const hasBlueprint = !!(bp.summary || bp.environment || (bp.feelings && bp.feelings.length) || (bp.locations && bp.locations.length));
    const ready = userTurnCount >= 4 && hasBlueprint;
    const closing = /does this feel like|want to create\?|keep it as is|submit it|soften, add|make more vivid/i.test(result.message || "");
    if (!(ready && closing)) {
      addMessage("guide", result.message);
    }

    if (String(result.path || "").toLowerCase() === "roses") {
      const starters = $("#iam-starter-pills");
      if (starters) {
        starters.classList.remove("is-used");
        starters.innerHTML = `
          <button type="button" data-vision-starter="Ascended Master Portrait">Ascended Master Portrait</button>
          <button type="button" data-vision-starter="I AM Mighty I AM Presence Chart">I AM Mighty I AM Presence Chart</button>
          <button type="button" data-vision-starter="Sacred Fire">Sacred Fire</button>`;
        starters.querySelectorAll("[data-vision-starter]").forEach(button => button.addEventListener("click", () => {
          const field = $("#iam-message"); if (!field) return;
          field.value = button.dataset.visionStarter || button.textContent.trim();
          starters.classList.add("is-used");
          sendVisionMessage();
        }));
      }
    }

    currentVision.blueprint =
      result.blueprint || currentVision.blueprint || {};

    renderBlueprint();
    renderVisionAffirmations(result.affirmations || []);

    if (ready) {
      blueprintReady = true;
      $("#iam-decision")?.classList.add("iam-hidden");
      $("#iam-wallpaper-choices")?.classList.remove("iam-hidden");
      $("#iam-wallpaper-choices")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      const note = $("#iam-requirements-note");
      if (note) {
        note.textContent = "To add your photo to the images, purchase one of the products below. Free wallpaper and Audio Meditation do not need a photo.";
        note.classList.remove("iam-hidden");
      }
      setStatus("");
    } else {
      setStatus("");
    }

    if (/choose\s+(my\s+)?vision\s+product|choose\s+(a\s+)?product|vision\s+product/i.test(text)) {
      productChoiceReady = true;
      $("#iam-product-handoff")?.classList.remove("iam-hidden");
      $("#iam-product-handoff")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    await loadSanctuary();
  } catch (error) {
    setStatus(error.message);
  }
}

async function loadSanctuary() {
  const session = await getSession();

  if (!session) return;

  const ordersResult = await iamSupabase
    .from("orders")
    .select("product_code,status,amount_cents")
    .order("created_at", { ascending: false });

  const affirmationsResult = await iamSupabase
    .from("affirmations")
    .select("statement")
    .order("sort_order");

  const orders = $("#iam-orders");
  const affirmations = $("#iam-affirms");

  if (orders) {
    if (ordersResult.data?.length) {
      orders.innerHTML = ordersResult.data
        .map(
          (order) =>
            '<span class="iam-pill">' +
            escapeHtml(
              order.product_code.replaceAll("_", " ")
            ) +
            " · $" +
            (order.amount_cents / 100).toFixed(2) +
            " · " +
            escapeHtml(order.status) +
            "</span>"
        )
        .join("");
    } else {
      orders.innerHTML =
        '<span class="iam-note">Your digital creations and orders will appear here.</span>';
    }
  }

  if (affirmations) {
    if (affirmationsResult.data?.length) {
      affirmations.innerHTML = affirmationsResult.data
        .map(
          (item) =>
            '<span class="iam-pill">' +
            escapeHtml(item.statement) +
            "</span>"
        )
        .join("");
    } else {
      affirmations.innerHTML =
        '<span class="iam-note">Your personalized affirmations will appear here.</span>';
    }
  }
}


function setupWallpaperChoices() {
  const buttons = document.querySelectorAll("[data-wallpaper-choice]");
  buttons.forEach((button) => {
    button.disabled = !blueprintReady;
    button.addEventListener("click", () => {
      const status = $("#iam-wallpaper-status");
      const format = button.dataset.wallpaperChoice;
      localStorage.setItem("iamreel_wallpaper_format", format);
      if (status) status.textContent = "Your " + format + " wallpaper is selected. Image generation will create one complimentary, non-editable wallpaper from your approved Vision Blueprint.";
    });
  });
}

function setupProductHandoff() {
  const input = $("#iam-message");
  if (!input) return;
  const panel = $("#iam-product-handoff");
  const reveal = () => {
    if (!panel) return;
    panel.classList.remove("iam-hidden");
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  document.querySelectorAll("[data-choose-vision-product]").forEach((button) => button.addEventListener("click", reveal));
}

async function initializeIamReel() {
  /*
    The Supabase publishable key is supplied separately.
    No OpenAI or PayPal secret is ever stored in this file.
  */

  if (!window.supabase || !window.IAMREEL_SUPABASE_KEY) {
    console.error("I AM REEL configuration is not loaded.");
    return;
  }

  iamSupabase = window.supabase.createClient(
    SUPABASE_URL,
    window.IAMREEL_SUPABASE_KEY
  );

  $("#signup")?.addEventListener("click", signUp);
  $("#signin")?.addEventListener("click", signIn);
  $("#signout")?.addEventListener("click", signOut);
  $("#iam-reset-vision")?.addEventListener("click", resetVisionGuide);
  $("#iam-apply-promo")?.addEventListener("click", async () => {
    const field = $("#iam-promo-code"); const status = $("#iam-promo-status"); const input = $("#iam-message");
    const code = String(field?.value || "").trim().toUpperCase();
    if (!code) { if (status) status.textContent = "Promo code is optional."; return; }
    if (code !== "ROSES" && code !== "SPIRITUAL") { if (status) status.textContent = "Promo code saved. Any eligible offer will be applied at checkout."; localStorage.setItem("iamreel_promo_code", code); return; }
    localStorage.setItem("iamreel_promo_code", code);
    if (status) status.textContent = "Special experience unlocked.";
    if (input) input.value = code === "ROSES" ? "roses" : "spiritual";
    await sendVisionMessage();
    const starters = $("#iam-starter-pills");
    if (!starters) return;
    starters.classList.remove("is-used");
    const choices = code === "ROSES"
      ? [["Ascended Master Portrait","Ascended Master Portrait"],["I AM Mighty I AM Presence Chart","I AM Mighty I AM Presence Chart"],["Sacred Fire","Sacred Fire"]]
      : [["With Master Jesus","A spiritual portrait of me with Master Jesus"],["With Mother Mary","A spiritual portrait of me with Mother Mary"],["Held in Angel Wings","A spiritual portrait of me held in an angel's wings"],["Healing with Christ","A symbolic spiritual portrait of me receiving healing light with Christ"],["Healing with Archangel Raphael","A symbolic spiritual portrait of me receiving healing light with Archangel Raphael"]];
    starters.innerHTML = choices.map(([label,value]) => '<button type="button" data-vision-starter="'+value.replace(/"/g,"&quot;")+'">'+label+'</button>').join("");
    starters.querySelectorAll("[data-vision-starter]").forEach(button => button.addEventListener("click", () => {
      const box=$("#iam-message"); if(!box)return; box.value=button.dataset.visionStarter||button.textContent.trim(); starters.classList.add("is-used"); sendVisionMessage();
    }));
  });

  document.querySelectorAll("[data-vision-starter]").forEach(button => button.addEventListener("click", () => {
    const input = $("#iam-message");
    if (!input) return;
    input.value = button.dataset.visionStarter || button.textContent.trim();
    $("#iam-starter-pills")?.classList.add("is-used");
    sendVisionMessage();
  }));

  $("#iam-send")?.addEventListener(
    "click",
    sendVisionMessage
  );

  $("#iam-submit-vision")?.addEventListener("click", async () => {
    if (!currentVision) return;
    const button = $("#iam-submit-vision");
    button.disabled = true;
    setStatus("Creating your Dream Future…");
    const { error } = await iamSupabase.from("visions").update({
      status: "blueprint_ready",
      blueprint_completed_at: new Date().toISOString()
    }).eq("id", currentVision.id);
    if (error) {
      setStatus(error.message);
      button.disabled = false;
      return;
    }
    blueprintReady = true;
    productChoiceReady = true;
    setStatus("Your Vision Blueprint is ready.");
    const panel = $("#iam-product-handoff");
    if (panel) {
      panel.classList.remove("iam-hidden");
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    button.textContent = "Vision submitted";
  });


  const msgField = $("#iam-message");
  const counter = $("#iam-char-count");
  msgField?.addEventListener("input", () => {
    if (msgField.value.length > 280) msgField.value = msgField.value.slice(0, 280);
    if (counter) counter.textContent = msgField.value.length + " / 280";
  });

  $("#iam-message")?.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter") {
        sendVisionMessage();
      }
    }
  );



  // Decision after ~4 turns
  $("#iam-yes-wallpaper")?.addEventListener("click", () => {
    document.querySelectorAll(".iam-action-btn").forEach(b => b.classList.remove("is-chosen"));
    $("#iam-yes-wallpaper")?.classList.add("is-chosen");
    $("#iam-wallpaper-choices")?.classList.remove("iam-hidden");
    $("#iam-photo-explain")?.classList.add("iam-hidden");
    $("#iam-wallpaper-choices")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  $("#iam-add-photo")?.addEventListener("click", () => {
    document.querySelectorAll(".iam-action-btn").forEach(b => b.classList.remove("is-chosen"));
    $("#iam-add-photo")?.classList.add("is-chosen");
    $("#iam-wallpaper-choices")?.classList.add("iam-hidden");
    $("#iam-photo-explain")?.classList.remove("iam-hidden");
    $("#iam-product-handoff")?.classList.remove("iam-hidden");
    $("#iam-product-handoff")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // Wallpaper choice leads to products
  document.querySelectorAll("#iam-wallpaper-choices [data-wallpaper-choice]").forEach(btn => {
    btn.addEventListener("click", async () => {
      document.querySelectorAll("#iam-wallpaper-choices .iam-action-btn").forEach(b => b.classList.remove("is-chosen"));
      btn.classList.add("is-chosen");
      const format = btn.dataset.wallpaperChoice;
      localStorage.setItem("iamreel_wallpaper_format", format);
      const result = $("#iam-wallpaper-result");
      const status = $("#iam-wallpaper-status");
      const img = $("#iam-wallpaper-image");
      if (status) status.textContent = "Creating your free " + format + " wallpaper from the best scene in your vision…";
      if (img) img.style.display = "none";
      result?.classList.remove("iam-hidden");
      result?.scrollIntoView({ behavior: "smooth", block: "nearest" });

      try {
        const session = await getSession();
        const response = await fetch(SUPABASE_URL + "/functions/v1/generate-wallpaper", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + (session?.access_token || ""),
          },
          body: JSON.stringify({ vision_id: currentVision?.id, format }),
        });
        const data = await response.json();
        if (!response.ok || !data.url) throw new Error(data.error || "Could not create wallpaper");
        if (img) {
          img.src = data.url;
          img.style.display = "block";
        }
        if (status) status.textContent = "Your free " + format + " wallpaper is ready.";
      } catch (err) {
        if (status) status.textContent = "Wallpaper needs the OpenAI function deployed. " + (err.message || "");
      }
    });
  });

  $("#iam-show-products")?.addEventListener("click", () => {
    $("#iam-show-products")?.classList.add("is-chosen");
    $("#iam-product-handoff")?.classList.remove("iam-hidden");
    $("#iam-product-handoff")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // Show photo panel only for personalized visual products
  const personalized = ["dream_portrait", "video_meditation", "cinematic_reel"];
  document.querySelectorAll("#iam-inline-store input[type=checkbox]").forEach(box => {
    box.addEventListener("change", () => {
      const anyPersonal = [...document.querySelectorAll("#iam-inline-store input[type=checkbox]")]
        .some(x => x.checked && personalized.includes(x.value));
      $("#iam-photo-panel")?.classList.toggle("iam-hidden", !anyPersonal);
    });
  });

  $("#iam-photo-yes")?.addEventListener("click", () => {
    $("#iam-photo-status").textContent = "Great — we’ll use this Future Self in your personalized vision.";
  });
  $("#iam-photo-no")?.addEventListener("click", () => {
    $("#iam-photo-status").textContent = "We’ll generate another version. You can also upload a different photo.";
    $("#iam-photo-upload")?.click();
  });

  setupWallpaperChoices();
  setupProductHandoff();
  await refreshAccount();
}

document.addEventListener(
  "DOMContentLoaded",
  initializeIamReel
);
