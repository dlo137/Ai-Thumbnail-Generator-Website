import { supabase } from '../lib/supabase';

export async function generateThumbnails(prompt: string, imageBase64?: string, count = 3): Promise<string[]> {
  const { data, error } = await supabase.functions.invoke('generate-thumbnail', {
    body: {
      prompt,
      imageBase64,
      count,
      mode: imageBase64 ? 'style_transfer' : 'new',
    },
  });

  if (error) {
    throw new Error(`Failed to generate thumbnails: ${error.message}`);
  }

  // Edge function returns variation1/variation2/variation3 objects with imageUrl fields
  const urls = [data?.variation1?.imageUrl, data?.variation2?.imageUrl, data?.variation3?.imageUrl]
    .filter((u): u is string => typeof u === 'string' && u.length > 0);

  if (urls.length === 0) {
    throw new Error('Invalid response from generate-thumbnail: no image URLs returned');
  }

  return urls;
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
