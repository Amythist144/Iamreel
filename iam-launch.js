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
  setupWallpaperChoices();
  setupProductHandoff();
  await refreshAccount();

  iamSupabase.auth.onAuthStateChange((_event, session) => {
    if (session) refreshAccount();
  });
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

    if (result.blueprint_ready) {
      blueprintReady = true;
      productChoiceReady = true;
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
