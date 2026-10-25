// supabase/functions/generate-wallpaper/index.ts
// Deploy: supabase functions deploy generate-wallpaper
// Requires secret: OPENAI_API_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { vision_id, format } = await req.json();
    if (!vision_id) {
      return new Response(JSON.stringify({ error: "vision_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: vision, error } = await supabase
      .from("visions")
      .select("id, blueprint, user_id")
      .eq("id", vision_id)
      .single();

    if (error || !vision) {
      return new Response(JSON.stringify({ error: "Vision not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bp = vision.blueprint || {};
    const scene = [
      bp.summary,
      bp.environment,
      ...(bp.locations || []),
      ...(bp.feelings || []),
      ...(bp.activities || []),
      bp.spiritual_scene,
    ].filter(Boolean).join(". ");

    const size = format === "phone" ? "1024x1792" : "1792x1024";
    const prompt = `Cinematic inspirational wallpaper. Place: ${bp.environment || bp.locations?.[0] || "a beautiful meaningful place"}. What they are looking at: ${bp.summary || scene || "a vivid hopeful scene"}. Feeling: ${(bp.feelings || []).join(", ") || "peaceful, free, deeply happy"}. Soft golden light, no text, no watermark, high quality.`;

    const imgRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt.slice(0, 1000),
        n: 1,
        size,
        quality: "standard",
      }),
    });

    if (!imgRes.ok) {
      const errText = await imgRes.text();
      console.error("OpenAI image error:", errText);
      return new Response(JSON.stringify({ error: "Could not generate wallpaper" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imgData = await imgRes.json();
    const imageUrl = imgData.data?.[0]?.url;

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "No image returned" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Optionally save to sanctuary_assets
    await supabase.from("sanctuary_assets").insert({
      user_id: vision.user_id,
      vision_id,
      kind: "wallpaper",
      format: format || "desktop",
      url: imageUrl,
    }).then(() => {}).catch(() => {});

    return new Response(JSON.stringify({ url: imageUrl, format }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
