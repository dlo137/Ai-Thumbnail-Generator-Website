// Forces a real file download instead of a navigation. A plain <a href download>
// only works for same-origin URLs — for cross-origin ones (like our Supabase
// Storage signed URLs, a different origin than the app itself) browsers silently
// ignore the `download` attribute and just navigate/open a new tab instead.
// Fetching the image ourselves and downloading from a blob: URL (always
// same-origin) sidesteps that restriction entirely, and doubles as a real
// "did this actually succeed" signal the fire-and-forget <a> approach never had.
export async function downloadImage(url: string, filename: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix (e.g. "data:image/png;base64,") and return raw base64
      const base64 = result.split(',')[1];
      if (!base64) reject(new Error('Failed to read file as base64'));
      else resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
