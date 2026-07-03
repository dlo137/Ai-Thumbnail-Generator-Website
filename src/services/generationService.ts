import { supabase } from '../lib/supabase';

// Web equivalent of the mobile app's uploadImageToStorage (generate.tsx) —
// same "thumbnails" bucket, same `${userId}/${label}_${timestamp}.${ext}`
// path convention, just via supabase-js's storage client instead of a raw
// fetch+FormData upload (browsers can hand a File straight to .upload()).
export async function uploadReferenceImage(file: File, label: 'subject' | 'reference'): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? 'anonymous';

  const fileExt = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/${label}_${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('thumbnails')
    .upload(path, file, { contentType: file.type || `image/${fileExt}` });

  if (uploadError) {
    throw new Error(`Failed to upload ${label} image: ${uploadError.message}`);
  }

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from('thumbnails')
    .createSignedUrl(path, 3600);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    throw new Error(`Failed to get a URL for the uploaded ${label} image.`);
  }

  return signedUrlData.signedUrl;
}

function getRatioValue(ratio: string): number {
  const [w, h] = ratio.split(':').map(Number);
  return w > 0 && h > 0 ? w / h : 16 / 9;
}

// Gemini's imageConfig.aspectRatio only accepts these five values — map
// whatever PromptBar's ratio picker offers (e.g. 4:5, 3:2, 21:9) to the
// closest one, same approach the mobile app uses (toGeminiAspectRatio in
// generate.tsx) rather than sending an aspect ratio Gemini doesn't support.
const GEMINI_SUPPORTED_RATIOS: { ratio: string; value: number }[] = [
  { ratio: '1:1', value: 1 },
  { ratio: '3:4', value: 3 / 4 },
  { ratio: '4:3', value: 4 / 3 },
  { ratio: '9:16', value: 9 / 16 },
  { ratio: '16:9', value: 16 / 9 },
];

function toGeminiAspectRatio(ratio: string): string {
  const target = getRatioValue(ratio);
  return GEMINI_SUPPORTED_RATIOS.reduce((closest, candidate) =>
    Math.abs(candidate.value - target) < Math.abs(closest.value - target) ? candidate : closest
  ).ratio;
}

const RETRY_DELAY_MS = 3000;
const MAX_ATTEMPTS = 2;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Mirrors the mobile app's retry loop (handleGenerate/handleModalGenerate in
// generate.tsx) — a single flaky Gemini response (safety filter, transient
// hiccup) shouldn't surface as a hard error immediately; retry once after a
// short delay before giving up.
async function invokeGenerateThumbnail(body: Record<string, unknown>) {
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { data, error } = await supabase.functions.invoke('generate-thumbnail', { body });

    if (!error && !data?.error) {
      return data;
    }

    lastError = error ? new Error(error.message) : new Error(data.error);
    if (attempt < MAX_ATTEMPTS) {
      await delay(RETRY_DELAY_MS);
    }
  }

  throw lastError;
}

// Same prompt-enhancement text the mobile app appends in handleGenerate
// (generate.tsx) based on which of subject/reference are actively set —
// the edge function has no special handling of its own for this, so the
// instruction has to be baked into the prompt text itself.
function enhancePromptForReferences(prompt: string, subjectImageUrl?: string, referenceImageUrl?: string): string {
  if (subjectImageUrl && referenceImageUrl) {
    return `${prompt}. Use the reference image(s) as the exact style and composition template, and replace the main subject/person in the reference with the provided subject image (face swap/body replacement). Maintain the exact background, lighting, pose, and style of the reference.`;
  }
  if (subjectImageUrl) {
    return `${prompt}. Use the provided subject image as the main focus, incorporating the person/face into the generated thumbnail.`;
  }
  if (referenceImageUrl) {
    return `${prompt}. Use the reference image(s) as inspiration for the style, composition, and overall look of the thumbnail.`;
  }
  return prompt;
}

export async function generateThumbnails(
  prompt: string,
  imageBase64?: string,
  count = 3,
  aspectRatio?: string,
  subjectImageUrl?: string,
  referenceImageUrl?: string
): Promise<string[]> {
  let data;
  try {
    data = await invokeGenerateThumbnail({
      prompt: enhancePromptForReferences(prompt, subjectImageUrl, referenceImageUrl),
      imageBase64,
      count,
      aspectRatio: aspectRatio ? toGeminiAspectRatio(aspectRatio) : undefined,
      mode: imageBase64 ? 'style_transfer' : 'new',
      subjectImageUrl,
      referenceImageUrls: referenceImageUrl ? [referenceImageUrl] : undefined,
    });
  } catch (err) {
    throw new Error(`Failed to generate thumbnails: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Edge function returns variation1..variationN objects with imageUrl fields — N
  // matches whatever `count` was requested (up to 6), not a fixed 3, so this
  // reads however many keys actually came back instead of hardcoding 1-3.
  const urls = Object.keys(data ?? {})
    .filter((key) => /^variation\d+$/.test(key))
    .sort((a, b) => Number(a.slice('variation'.length)) - Number(b.slice('variation'.length)))
    .map((key) => data[key]?.imageUrl)
    .filter((u): u is string => typeof u === 'string' && u.length > 0);

  if (urls.length === 0) {
    throw new Error('Invalid response from generate-thumbnail: no image URLs returned');
  }

  return urls;
}

// Edits an existing thumbnail in place — mirrors the mobile app's edit modal
// (handleModalGenerate in generate.tsx), which sends `baseImageUrl` + the
// `adjustmentMode: true` flag rather than `imageBase64`/`mode`/`count`. Those
// two fields are what route the edge function into callGeminiImageEdit (an
// edit-specific prompt: "do NOT create a new image from scratch") instead of
// the normal multi-variation generation path — passing anything else here
// (as the web app previously did) silently falls through to a fresh
// generation that ignores the base image entirely.
export async function editThumbnail(prompt: string, baseImageUrl: string): Promise<string> {
  let data;
  try {
    data = await invokeGenerateThumbnail({
      prompt,
      baseImageUrl,
      adjustmentMode: true,
    });
  } catch (err) {
    throw new Error(`Failed to edit thumbnail: ${err instanceof Error ? err.message : String(err)}`);
  }

  const url = data?.variation1?.imageUrl ?? data?.imageUrl;
  if (typeof url !== 'string' || url.length === 0) {
    throw new Error('Invalid response from generate-thumbnail: no image URL returned');
  }

  return url;
}

export async function generateTitle(prompt: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('generate-title', {
    body: { prompt },
  });

  if (error) {
    throw new Error(`Failed to generate title: ${error.message}`);
  }

  if (typeof data?.title !== 'string') {
    throw new Error('Invalid response from generate-title: expected title string');
  }

  return data.title;
}

export async function getCredits(): Promise<{ current: number; max: number }> {
  const { data, error } = await supabase.functions.invoke('manage-credits', {
    body: { action: 'get' },
  });

  if (error) {
    throw new Error(`Failed to fetch credits: ${error.message}`);
  }

  if (typeof data?.current !== 'number' || typeof data?.max !== 'number') {
    throw new Error('Invalid response from manage-credits: expected { current, max }');
  }

  return { current: data.current, max: data.max };
}

export async function deductCredits(amount: number): Promise<{ current: number; max: number }> {
  const { data, error } = await supabase.functions.invoke('manage-credits', {
    body: { action: 'deduct', amount },
  });

  if (error) {
    throw new Error(`Failed to deduct credits: ${error.message}`);
  }

  if (typeof data?.current !== 'number' || typeof data?.max !== 'number') {
    throw new Error('Invalid response from manage-credits: expected { current, max }');
  }

  return { current: data.current, max: data.max };
}
