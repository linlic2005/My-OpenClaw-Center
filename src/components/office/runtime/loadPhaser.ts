let phaserPromise: Promise<void> | null = null;

async function loadPixelFont(): Promise<void> {
  if (!('fonts' in document)) {
    return;
  }

  try {
    await document.fonts.load('12px ArkPixel');
  } catch (error) {
    console.warn('Failed to pre-load ArkPixel font:', error);
  }
}

export async function ensurePhaserRuntime(): Promise<void> {
  if (window.Phaser) {
    await loadPixelFont();
    return;
  }

  if (!phaserPromise) {
    phaserPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-office-phaser="true"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Failed to load Phaser runtime.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = '/vendor/phaser-3.80.1.min.js';
      script.async = true;
      script.dataset.officePhaser = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Phaser runtime.'));
      document.body.appendChild(script);
    }).finally(async () => {
      await loadPixelFont();
    });
  }

  await phaserPromise;
}
