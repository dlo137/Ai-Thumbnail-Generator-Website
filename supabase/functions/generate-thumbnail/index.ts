// deno run --allow-env --allow-net --allow-read
import { serve } from "https://deno.land/std/http/server.ts";
import { encodeBase64 } from "https://deno.land/std/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Choose a 16:9 size YouTube accepts. 1280x720 is standard.
const WIDTH = 1280;
const HEIGHT = 720;

type GenerateBody = {
  prompt: string;
  style?: string;
  seed?: number;
  subjectImageUrl?: string;
  referenceImageUrls?: string[];
  baseImageUrl?: string;
  adjustmentMode?: boolean;
  allowTextFallback?: boolean;
  eraseMask?: string;
  aspectRatio?: string;
  count?: number;
};

type GeminiImagePart = { inlineData: { mimeType: string; data: string } };

function b64ToUint8(base64: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function detectMimeTypeFromBytes(bytes: Uint8Array): string {
  if (bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
      bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A) {
    return "image/png";
  }
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xD8) {
    return "image/jpeg";
  }
  if (bytes.length >= 12 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return "image/webp";
  }
  if (bytes.length >= 6 &&
      bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 &&
      bytes[3] === 0x38 && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61) {
    return "image/gif";
  }
  return "image/jpeg";
}

async function fetchImageAsBase64(imageUrl: string): Promise<{data: string, mimeType: string}> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    if (response.status === 401 || response.status === 403 || response.status === 404) {
      throw new Error("Image URL expired or not accessible");
    }
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }

  let mimeType = response.headers.get("content-type");
  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  if (!mimeType || !mimeType.startsWith("image/")) {
    mimeType = detectMimeTypeFromBytes(uint8Array);
  }

  return {
    data: encodeBase64(uint8Array),
    mimeType: mimeType
  };
}

async function buildSharedImageParts(
  subjectImageUrl?: string,
  referenceImageUrls?: string[]
): Promise<GeminiImagePart[]> {
  const parts: GeminiImagePart[] = [];

  if (referenceImageUrls && referenceImageUrls.length > 0) {
    for (const refUrl of referenceImageUrls) {
      try {
        const imageData = await fetchImageAsBase64(refUrl);
        parts.push({ inlineData: { mimeType: imageData.mimeType, data: imageData.data } });
      } catch (e) {
        console.log('Failed to fetch reference image:', e);
      }
    }
  }

  if (subjectImageUrl) {
    try {
      const imageData = await fetchImageAsBase64(subjectImageUrl);
      parts.push({ inlineData: { mimeType: imageData.mimeType, data: imageData.data } });
    } catch (e) {
      console.log('Failed to fetch subject image:', e);
    }
  }

  return parts;
}

async function callGeminiImagePreview(
  prompt: string,
  hasSubject: boolean,
  hasReference: boolean,
  sharedImageParts: GeminiImagePart[],
  baseImageUrl?: string,
  isBlankFrame?: boolean,
  aspectRatio?: string
) {
  const lowerPrompt = prompt.toLowerCase();

  const shouldIncludeText =
    lowerPrompt.includes('review') ||
    lowerPrompt.includes(' vs ') ||
    lowerPrompt.includes('versus') ||
    lowerPrompt.includes('podcast') ||
    lowerPrompt.includes('gamer') ||
    lowerPrompt.includes('tutorial') ||
    lowerPrompt.includes('how to') ||
    lowerPrompt.match(/top\s*\d+/i) ||
    lowerPrompt.includes('best') ||
    lowerPrompt.includes('unboxing') ||
    lowerPrompt.includes('reaction');

  let fullPrompt = shouldIncludeText
    ? `A ${prompt}, large close-up filling the frame, cinematic lighting, clean gradient background, with bold stylized text overlay`
    : `A ${prompt}, large close-up filling the frame, cinematic lighting, clean gradient background, photorealistic`;

  if (hasReference) {
    fullPrompt += ", inspired by reference style";
  }

  if (hasSubject) {
    fullPrompt += " Feature a person prominently in the thumbnail.";
  }

  const parts: any[] = [{ text: fullPrompt }, ...sharedImageParts];

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
    {
      method: "POST",
      headers: {
        "x-goog-api-key": GEMINI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: parts
        }],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
          imageConfig: {
            aspectRatio: aspectRatio || "16:9"
          }
        }
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Gemini image API error ${response.status}:`, errorText);
    if (response.status === 403 || response.status === 429) {
      throw new Error(`BILLING_ERROR: Gemini API returned ${response.status} - ${errorText}`);
    }
    throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();

  if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
    console.log('Gemini response:', JSON.stringify(result, null, 2));
    throw new Error("No content generated from Gemini API");
  }

  const content = result.candidates[0].content;

  for (const part of content.parts || []) {
    if (part.inlineData && part.inlineData.data) {
      return b64ToUint8(part.inlineData.data);
    }
  }

  throw new Error("Gemini did not return image data in response");
}

async function callGeminiImageEdit(prompt: string, baseImageUrl: string): Promise<Uint8Array> {
  const baseImageData = await fetchImageAsBase64(baseImageUrl);

  const editPrompt = `Edit this existing image according to the following instruction. Keep everything else exactly the same - only make the specific change requested.

Edit instruction: ${prompt}

IMPORTANT: This is an IMAGE EDIT task. Do NOT create a new image from scratch. Modify the provided image while preserving all other elements, composition, and style.`;

  const parts: any[] = [
    { text: editPrompt },
    {
      inlineData: {
        mimeType: baseImageData.mimeType,
        data: baseImageData.data
      }
    }
  ];

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
    {
      method: "POST",
      headers: {
        "x-goog-api-key": GEMINI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: parts
        }],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
          imageConfig: {
            aspectRatio: "16:9"
          }
        }
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Gemini edit API error ${response.status}:`, errorText);
    if (response.status === 403 || response.status === 429) {
      throw new Error(`BILLING_ERROR: Gemini API returned ${response.status} - ${errorText}`);
    }
    throw new Error(`Gemini Edit API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();

  if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
    console.log('Gemini edit response:', JSON.stringify(result, null, 2));
    throw new Error("No content generated from Gemini Edit API");
  }

  const content = result.candidates[0].content;

  for (const part of content.parts || []) {
    if (part.inlineData && part.inlineData.data) {
      return b64ToUint8(part.inlineData.data);
    }
  }

  throw new Error("Gemini Edit did not return image data in response");
}

async function createMaskedImage(baseImageUrl: string, maskSvgPath: string): Promise<string> {
  console.log('Mask path received:', maskSvgPath);
  return baseImageUrl;
}

// Reads the user's current credit balance. Returns null (distinct from 0) on
// a lookup failure, so callers can tell "genuinely zero credits" apart from
// "couldn't check" and respond differently.
async function getUserCredits(admin: ReturnType<typeof createClient>, userId: string): Promise<number | null> {
  const { data: profile, error } = await admin
    .from("profiles")
    .select("credits_current")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    console.error("Failed to fetch credits for", userId, error);
    return null;
  }
  return profile.credits_current ?? 0;
}

function insufficientCreditsResponse(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 402,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function creditsCheckFailedResponse() {
  return new Response(JSON.stringify({ error: "Unable to verify your credit balance. Please try again." }), {
    status: 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Deducts `amount` credits from the user's profile row, floored at 0. Runs
// with the service-role client so it works regardless of RLS. Deliberately
// best-effort: a failure here is logged but never throws, since the images
// were already generated/uploaded and returned to the caller by the time
// this runs — a credits bookkeeping hiccup shouldn't discard a successful
// generation. Skipped entirely for anonymous/dev-bypass requests, which have
// no profile row to charge.
async function deductUserCredits(admin: ReturnType<typeof createClient>, userId: string, amount: number) {
  if (!userId || userId === "anonymous" || amount <= 0) return;

  try {
    const { data: profile, error: fetchError } = await admin
      .from("profiles")
      .select("credits_current")
      .eq("id", userId)
      .single();

    if (fetchError || !profile) {
      console.error("Failed to fetch profile for credit deduction:", fetchError);
      return;
    }

    const newCredits = Math.max(0, (profile.credits_current ?? 0) - amount);
    const { error: updateError } = await admin
      .from("profiles")
      .update({ credits_current: newCredits })
      .eq("id", userId);

    if (updateError) {
      console.error("Failed to deduct credits:", updateError);
    }
  } catch (e) {
    console.error("Credit deduction error:", e);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const contentType = req.headers.get("Content-Type") ?? "";
    console.log('Request content-type:', contentType);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const rawBody = await req.text();
    console.log('Raw request body length:', rawBody.length);
    console.log('Raw request body:', rawBody.substring(0, 500));

    if (!rawBody || rawBody.length < 10) {
      return new Response(JSON.stringify({ error: "Empty or invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let body: GenerateBody;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(JSON.stringify({ error: "Invalid JSON in request body", raw: rawBody.substring(0, 100) }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { prompt, subjectImageUrl, baseImageUrl, adjustmentMode, allowTextFallback, eraseMask, aspectRatio, count } = body;
    const referenceImageUrls = body.referenceImageUrls?.slice(0, 1);

    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "Missing prompt", receivedBody: body }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let effectiveBaseImageUrl = baseImageUrl;
    if (eraseMask && baseImageUrl) {
      console.log('Inpainting mode: mask provided');
      effectiveBaseImageUrl = await createMaskedImage(baseImageUrl, eraseMask);
    }

    let blankFrameUrl: string | undefined;
    if (!baseImageUrl && !adjustmentMode) {
      blankFrameUrl = "https://zxklggjxauvvesqwqvgi.supabase.co/storage/v1/object/sign/assets/1280x720.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xZjhhYzAxYi05MTVjLTQ0YWItOGNmZi1iZTE1MGI3Y2IwNjgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvMTI4MHg3MjAuanBnIiwiaWF0IjoxNzU5ODg4NzM5LCJleHAiOjQ5MTM0ODg3Mzl9.9hJa0Js0yoNpbaJACIsXtm_7QxSQLCZq-ZnpLsARsKw";
      console.log('Using blank frame reference for proper framing');
    }

    let finalPrompt = prompt;

    if (subjectImageUrl && referenceImageUrls && referenceImageUrls.length > 0) {
      finalPrompt = `STYLE TRANSFER: Create a 16:9 YouTube thumbnail featuring the subject person in the style and composition of the reference image. Match the reference's pose, lighting, color palette, background elements, and artistic style while naturally integrating the subject person. Maintain the visual mood and framing of the reference. Generate in 1280x720 resolution. ${prompt}`;
    } else if (referenceImageUrls && referenceImageUrls.length > 0) {
      finalPrompt = `Create a 16:9 YouTube thumbnail inspired by the reference image(s) incorporating this concept: ${prompt}. Match the composition, lighting, and visual style. Generate in 1280x720 resolution.`;
    } else if (subjectImageUrl) {
      finalPrompt = `Create a 16:9 YouTube thumbnail featuring the person from the uploaded image: ${prompt}. Generate in 1280x720 resolution.`;
    }

    console.log('Generating with prompt:', finalPrompt);
    console.log('Subject image URL:', subjectImageUrl);
    console.log('Reference image URLs:', referenceImageUrls);
    console.log('Base image URL (adjustment mode):', baseImageUrl);
    console.log('Adjustment mode:', adjustmentMode);

    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || 'anonymous';
    const SEVEN_DAYS = 7 * 24 * 60 * 60;

    // ADJUSTMENT MODE: Edit existing image instead of generating new ones
    if (adjustmentMode && baseImageUrl) {
      console.log('Using Gemini for image EDITING (adjustment mode)...');

      // Block before spending an expensive Gemini call — 1 credit per edit.
      // Skipped for anonymous/dev-bypass requests, which have no profile row.
      if (userId !== "anonymous") {
        const currentCredits = await getUserCredits(supabaseAdmin, userId);
        if (currentCredits === null) return creditsCheckFailedResponse();
        if (currentCredits < 1) {
          return insufficientCreditsResponse("Insufficient credits. You need at least 1 credit to edit a thumbnail.");
        }
      }

      let editedBytes: Uint8Array;
      try {
        editedBytes = await callGeminiImageEdit(prompt, baseImageUrl);
      } catch (error: any) {
        console.error('Gemini image edit failed:', error);
        throw new Error(`Image edit failed: ${error?.message || String(error)}`);
      }

      const filename = `${userId}/${crypto.randomUUID()}.png`;
      const upload = await supabaseAdmin.storage.from("thumbnails").upload(filename, editedBytes, { contentType: "image/png", upsert: true });
      if (upload.error) throw upload.error;

      const signed = await supabaseAdmin.storage.from("thumbnails").createSignedUrl(filename, SEVEN_DAYS);
      if (signed.error) throw signed.error;

      await deductUserCredits(supabaseAdmin, userId, 1);

      return new Response(JSON.stringify({
        imageUrl: signed.data?.signedUrl,
        url: signed.data?.signedUrl,
        width: WIDTH,
        height: HEIGHT,
        file: filename,
        variation1: {
          imageUrl: signed.data?.signedUrl,
          width: WIDTH,
          height: HEIGHT,
          file: filename,
          prompt: prompt
        }
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // GENERATION MODE: Create new images
    if (subjectImageUrl || (referenceImageUrls && referenceImageUrls.length > 0)) {
      console.log('Using Gemini for generation with image context...');
    } else {
      console.log('Using Gemini for text-only generation...');
    }

    const effectiveBaseImage = effectiveBaseImageUrl || blankFrameUrl;
    const isUsingBlankFrame = !effectiveBaseImageUrl && !!blankFrameUrl;

    const VARIATION_MOODS = [
      "dramatic lighting, strong contrast, cinematic framing",
      "energetic composition, dynamic angles, vibrant aesthetic",
      "clean minimal look, soft tones, simple composition",
      "bold saturated colors, high energy, eye-catching contrast",
      "warm inviting tones, natural lighting, approachable mood",
      "moody atmospheric lighting, deep shadows, cinematic depth",
    ];

    const requestedCount = typeof count === "number" && count > 0 ? Math.min(Math.floor(count), VARIATION_MOODS.length) : 3;

    // Block before spending requestedCount worth of expensive Gemini calls —
    // 1 credit per image in the batch. Skipped for anonymous/dev-bypass
    // requests (the free/teaser flow), which have no profile row.
    if (userId !== "anonymous") {
      const currentCredits = await getUserCredits(supabaseAdmin, userId);
      if (currentCredits === null) return creditsCheckFailedResponse();
      if (currentCredits < requestedCount) {
        return insufficientCreditsResponse(
          `Insufficient credits. This batch needs ${requestedCount} credit${requestedCount > 1 ? "s" : ""}, but you only have ${currentCredits}.`
        );
      }
    }

    const selectedMoods = requestedCount === 1 ? [VARIATION_MOODS[1]] : VARIATION_MOODS.slice(0, requestedCount);
    const variationPromptsToUse = selectedMoods.map((mood) => `${finalPrompt} Visual mood: ${mood}.`);

    const sharedImageParts = await buildSharedImageParts(subjectImageUrl, referenceImageUrls);
    const hasSubject = !!subjectImageUrl;
    const hasReference = !!(referenceImageUrls && referenceImageUrls.length > 0);

    const settled = await Promise.allSettled(
      variationPromptsToUse.map((p) =>
        callGeminiImagePreview(p, hasSubject, hasReference, sharedImageParts, effectiveBaseImage, isUsingBlankFrame, aspectRatio)
      )
    );

    const succeededBytes: Uint8Array[] = [];
    settled.forEach((result, i) => {
      if (result.status === "fulfilled") {
        succeededBytes.push(result.value);
      } else {
        console.error(`Gemini variation ${i + 1} failed:`, result.reason?.message || result.reason);
      }
    });

    if (succeededBytes.length === 0) {
      const firstRejected = settled.find((r): r is PromiseRejectedResult => r.status === "rejected");
      const reason = firstRejected?.reason?.message || String(firstRejected?.reason) || "All variations failed";
      throw new Error(`Image generation failed: ${reason}`);
    }

    const uploads = await Promise.all(
      succeededBytes.map(async (bytes) => {
        const filename = `${userId}/${crypto.randomUUID()}.png`;
        const upload = await supabaseAdmin.storage.from("thumbnails").upload(filename, bytes, { contentType: "image/png", upsert: true });
        if (upload.error) throw upload.error;

        const signed = await supabaseAdmin.storage.from("thumbnails").createSignedUrl(filename, SEVEN_DAYS);
        if (signed.error) throw signed.error;

        return { filename, signedUrl: signed.data?.signedUrl };
      })
    );

    await deductUserCredits(supabaseAdmin, userId, uploads.length);

    const responseBody: Record<string, unknown> = {
      imageUrl: uploads[0].signedUrl,
      url: uploads[0].signedUrl,
      width: WIDTH,
      height: HEIGHT,
      file: uploads[0].filename,
    };
    uploads.forEach((u, i) => {
      responseBody[`variation${i + 1}`] = {
        imageUrl: u.signedUrl,
        width: WIDTH,
        height: HEIGHT,
        file: u.filename,
        prompt: finalPrompt,
      };
    });

    return new Response(JSON.stringify(responseBody), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    const message = e?.message || String(e);
    console.error("generate-thumbnail error:", message);
    const isBilling = message.includes("BILLING_ERROR") || message.includes("Cloud Billing") || message.includes("PERMISSION_DENIED");
    return new Response(JSON.stringify({
      error: isBilling
        ? "Image generation is temporarily unavailable due to a billing issue. Please try again later."
        : message,
      detail: message
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
