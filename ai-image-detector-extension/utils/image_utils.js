// ============================================
// Image Utilities
// Role: Image processing, resize, thumbnail, canvas conversion
// ============================================

const ImageUtils = {
  // ============================================
  // Image to Canvas Conversion
  // ============================================
  imageToCanvas: function(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;

    const ctx = canvas.getContext('2d');
    try {
      ctx.drawImage(img, 0, 0);
      return canvas;
    } catch (error) {
      console.error('Failed to draw image to canvas (CORS?):', error);
      return null;
    }
  },

  // ============================================
  // Canvas to Blob
  // ============================================
  canvasToBlob: async function(canvas, format = 'image/jpeg', quality = 0.9) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        },
        format,
        quality
      );
    });
  },

  // ============================================
  // Image Resize (maintaining aspect ratio)
  // ============================================
  resizeImage: function(img, maxWidth = 512, maxHeight = 512) {
    const canvas = document.createElement('canvas');
    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;

    // Calculate new dimensions
    if (width > height) {
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
    } else {
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    return canvas;
  },

  // ============================================
  // Create Thumbnail
  // ============================================
  createThumbnail: async function(img, size = 128) {
    const canvas = this.resizeImage(img, size, size);
    return await this.canvasToBlob(canvas, 'image/jpeg', 0.8);
  },

  // ============================================
  // Get Image Dimensions
  // ============================================
  getImageDimensions: function(img) {
    return {
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
    };
  },

  // ============================================
  // Check if image is loaded
  // ============================================
  isImageLoaded: function(img) {
    if (!img.complete) return false;
    if (img.naturalWidth === 0) return false;
    return true;
  },

  // ============================================
  // Wait for image to load
  // ============================================
  waitForImageLoad: function(img) {
    return new Promise((resolve, reject) => {
      if (this.isImageLoaded(img)) {
        resolve(img);
        return;
      }

      img.addEventListener('load', () => resolve(img));
      img.addEventListener('error', () => reject(new Error('Image failed to load')));

      // Timeout after 10 seconds
      setTimeout(() => reject(new Error('Image load timeout')), 10000);
    });
  },

  // ============================================
  // Extract image URL from element
  // ============================================
  getImageUrl: function(imgElement) {
    // Try different sources
    return (
      imgElement.currentSrc ||
      imgElement.src ||
      imgElement.dataset.src ||
      imgElement.dataset.lazySrc ||
      null
    );
  },

  // ============================================
  // Check if URL is valid image
  // ============================================
  isValidImageUrl: function(url) {
    if (!url) return false;
    if (url.startsWith('data:')) return true; // base64

    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];
    const urlLower = url.toLowerCase();

    return imageExtensions.some(ext => urlLower.includes(ext));
  },

  // ============================================
  // Get image size in bytes (estimate)
  // ============================================
  estimateImageSize: function(img) {
    const dims = this.getImageDimensions(img);
    // Rough estimate: width * height * 3 bytes (RGB)
    return dims.width * dims.height * 3;
  },

  // ============================================
  // Check if image is large enough for analysis
  // ============================================
  isImageLargeEnough: function(img, minWidth = 100, minHeight = 100) {
    const dims = this.getImageDimensions(img);
    return dims.width >= minWidth && dims.height >= minHeight;
  },

  // ============================================
  // Canvas to Base64
  // ============================================
  canvasToBase64: function(canvas, format = 'image/jpeg', quality = 0.9) {
    return canvas.toDataURL(format, quality);
  },

  // ============================================
  // Image to Base64
  // ============================================
  imageToBase64: async function(img, maxSize = 512) {
    const canvas = this.resizeImage(img, maxSize, maxSize);
    return this.canvasToBase64(canvas);
  },
};

// Make available globally
if (typeof window !== 'undefined') {
  window.ImageUtils = ImageUtils;
}
