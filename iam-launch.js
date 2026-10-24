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

  const email = $("#iam-email");
  if (email) email.textContent = session.user.email || "";

  const { data } = await iamSupabase
    .from("visions")
    .select("id,title,status,blueprint,conversation_summary")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (data && data[0]) {
    currentVision = data[0];
    blueprintReady = currentVision.status === "blueprint_ready" || currentVision.status === "production_ready";
    const submitVision = $("#iam-submit-vision");
    if (submitVision) submitVision.disabled = !blueprintReady;
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

  setupWallpaperChoices();
  setupProductHandoff();
  await refreshAccount();

  iamSupabase.auth.onAuthStateChange((_event, session) => {
    if (session) refreshAccount();
  });
}

async function resetVisionGuide() {
  const session = await getSession();
  if (!session || !currentVision) return;
  const button = $("#iam-reset-vision");
  if (button) { button.disabled = true; button.textContent = "Resetting…"; }
  setStatus("Resetting your Vision Guide…");
  try {
    const response = await fetch(SUPABASE_URL + "/functions/v1/vision-guide", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
      body: JSON.stringify({ vision_id: currentVision.id, action: "reset" })
    });
    const result = await response.json();
    if (!response.ok || !result.reset) throw new Error(result.error || "Reset failed.");

    currentVision = { ...currentVision, title:"My Dream Future", status:"draft", blueprint:{}, conversation_summary:null };
    blueprintReady = false;
    productChoiceReady = false;
    localStorage.removeItem("iamreel_rejected_affirmations");
    localStorage.removeItem("iamreel_wallpaper_format");
    const chat = $("#iam-chat"); if (chat) chat.innerHTML = "";
    const list = $("#iam-affirmation-list"); if (list) list.innerHTML = "";
    $("#iam-product-handoff")?.classList.add("iam-hidden");
    $("#iam-starter-pills")?.classList.remove("is-used");
    const submit = $("#iam-submit-vision"); if (submit) { submit.disabled = true; submit.textContent = "Submit my vision"; }
    const title = $("#iam-vision-title"); if (title) title.textContent = "My Dream Future";
    addMessage("guide","What is your dream future? Choose an intention below or tell me what you want your life to look and feel like.");
    setStatus("");
  } catch (error) {
    setStatus(error.message || "Reset failed.");
  } finally {
    if (button) { button.disabled = false; button.textContent = "Reset to start over"; }
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

    addMessage("guide", result.message);

    currentVision.blueprint =
      result.blueprint || currentVision.blueprint || {};

    renderBlueprint();
    renderVisionAffirmations(result.affirmations || []);

    if (result.blueprint_ready) {
      blueprintReady = true;
      productChoiceReady = true;
      const submitVision = $("#iam-submit-vision");
      if (submitVision) submitVision.disabled = false;
      const requirementsNote = $("#iam-requirements-note");
      if (requirementsNote) requirementsNote.textContent = "Your Vision Blueprint has enough detail. Review your conversation, then submit when you’re ready.";
      document.querySelectorAll("[data-wallpaper-choice]").forEach((button) => { button.disabled = false; });
      const wallpaperStatus = $("#iam-wallpaper-status");
      if (wallpaperStatus) wallpaperStatus.textContent = "Your Blueprint is ready. Choose a wallpaper format to create your complimentary design.";

      $("#iam-product-handoff")?.classList.remove("iam-hidden");
      setStatus("Your Vision Blueprint is taking shape. When you’re ready, say “choose my vision product” or use the choices below.");
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
    setStatus("Finishing your Vision Blueprint…");
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

  $("#iam-message")?.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter") {
        sendVisionMessage();
      }
    }
  );


  setupWallpaperChoices();
  setupProductHandoff();
  await refreshAccount();
}

document.addEventListener(
  "DOMContentLoaded",
  initializeIamReel
);
