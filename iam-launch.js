const SUPABASE_URL = "https://jtlqvxcmbgqtcpdhldbm.supabase.co";

/*
  I AM REEL launch application
  Supabase authentication + Vision Guide + PayPal Sandbox + My Sanctuary
*/

let iamSupabase = null;
let currentVision = null;
let paypalClientId = null;

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
  await refreshAccount();
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
      setStatus("Your Vision Blueprint is ready to review.");
    } else {
      setStatus("");
    }

    await loadSanctuary();
  } catch (error) {
    setStatus(error.message);
  }
}

async function getPayPalConfiguration() {
  const session = await getSession();

  const response = await fetch(
    SUPABASE_URL + "/functions/v1/paypal-checkout",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + session.access_token
      },
      body: JSON.stringify({
        action: "config"
      })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "PayPal is unavailable.");
  }

  return result;
}

async function loadPayPal() {
  if (window.paypal) return;

  if (!paypalClientId) {
    const configuration = await getPayPalConfiguration();
    paypalClientId = configuration.client_id;
  }

  await new Promise((resolve, reject) => {
    const script = document.createElement("script");

    script.src =
      "https://www.paypal.com/sdk/js?client-id=" +
      encodeURIComponent(paypalClientId) +
      "&currency=USD&intent=capture";

    script.onload = resolve;
    script.onerror = reject;

    document.head.appendChild(script);
  });
}

async function buyProduct(productCode) {
  try {
    const session = await getSession();

    if (!session) {
      throw new Error(
        "Create your free account or sign in before checkout."
      );
    }

    setStatus("Opening secure PayPal Sandbox checkout…");

    const vision = await ensureVision();

    const response = await fetch(
      SUPABASE_URL + "/functions/v1/paypal-checkout",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + session.access_token
        },
        body: JSON.stringify({
          action: "create",
          product_code: productCode,
          vision_id: vision.id
        })
      }
    );

    const order = await response.json();

    if (!response.ok) {
      throw new Error(order.error || "Could not create the order.");
    }

    await loadPayPal();

    const paypalZone = $("#paypal-zone");
    const paypalModal = $("#paypal-modal");

    if (!paypalZone || !paypalModal) {
      throw new Error("PayPal checkout area is not available.");
    }

    paypalZone.innerHTML = "";
    paypalModal.classList.remove("iam-hidden");

    window.paypal
      .Buttons({
        createOrder: () => order.id,

        onApprove: async (data) => {
          setStatus("Verifying your PayPal payment…");

          const captureResponse = await fetch(
            SUPABASE_URL + "/functions/v1/paypal-checkout",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + session.access_token
              },
              body: JSON.stringify({
                action: "capture",
                paypal_order_id: data.orderID
              })
            }
          );

          const capture = await captureResponse.json();

          if (!captureResponse.ok) {
            throw new Error(
              capture.error || "Payment verification failed."
            );
          }

          paypalModal.classList.add("iam-hidden");

          setStatus(
            "Sandbox payment completed. Your order is now in My Sanctuary."
          );

          await loadSanctuary();
        },

        onCancel: () => {
          setStatus("Checkout cancelled.");
        },

        onError: () => {
          setStatus("PayPal checkout could not complete.");
        }
      })
      .render("#paypal-zone");
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

  $("#iam-message")?.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter") {
        sendVisionMessage();
      }
    }
  );

  document
    .querySelectorAll("[data-buy]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        buyProduct(button.dataset.buy);
      });
    });

  $("#paypal-close")?.addEventListener(
    "click",
    () => {
      $("#paypal-modal")?.classList.add("iam-hidden");
    }
  );

  await refreshAccount();
}

document.addEventListener(
  "DOMContentLoaded",
  initializeIamReel
);
