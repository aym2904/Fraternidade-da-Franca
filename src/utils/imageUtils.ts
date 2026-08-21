/**
 * Utility for client-side image optimization.
 * Resizes large camera photos to lightweight avatars (< 30KB) before saving.
 */
export async function compressImageFile(file: File, maxDimension = 256, quality = 0.75): Promise<string> {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            let { width, height } = img;
            if (width > height) {
              if (width > maxDimension) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              }
            } else {
              if (height > maxDimension) {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(e.target?.result as string || '');
              return;
            }

            // Fill background white/neutral to prevent transparent PNG issues when converting to JPEG
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedDataUrl);
          } catch (err) {
            console.warn('Failed to compress image canvas, using raw data url:', err);
            resolve(e.target?.result as string || '');
          }
        };

        img.onerror = () => {
          resolve(e.target?.result as string || '');
        };

        img.src = e.target?.result as string;
      };

      reader.onerror = () => {
        resolve('');
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.warn('Error reading image file:', err);
      resolve('');
    }
  });
}
