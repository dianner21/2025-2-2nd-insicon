// ============================================
// Hash Utilities
// Role: Perceptual hashing for duplicate detection & cost reduction
// ============================================

const HashUtils = {
  // ============================================
  // Average Hash (aHash) - Simple & Fast
  // ============================================
  averageHash: function(canvas, hashSize = 8) {
    // Resize to hashSize x hashSize
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = hashSize;
    tempCanvas.height = hashSize;

    const ctx = tempCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, 0, hashSize, hashSize);

    // Get grayscale pixel data
    const imageData = ctx.getImageData(0, 0, hashSize, hashSize);
    const pixels = imageData.data;

    // Convert to grayscale and calculate average
    const grayscale = [];
    let sum = 0;

    for (let i = 0; i < pixels.length; i += 4) {
      const gray = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      grayscale.push(gray);
      sum += gray;
    }

    const average = sum / grayscale.length;

    // Create hash: 1 if above average, 0 if below
    let hash = '';
    for (let i = 0; i < grayscale.length; i++) {
      hash += grayscale[i] >= average ? '1' : '0';
    }

    return hash;
  },

  // ============================================
  // Difference Hash (dHash) - Better for similar images
  // ============================================
  differenceHash: function(canvas, hashSize = 8) {
    // Resize to (hashSize+1) x hashSize
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = hashSize + 1;
    tempCanvas.height = hashSize;

    const ctx = tempCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, 0, hashSize + 1, hashSize);

    // Get grayscale pixel data
    const imageData = ctx.getImageData(0, 0, hashSize + 1, hashSize);
    const pixels = imageData.data;

    // Convert to grayscale
    const grayscale = [];
    for (let i = 0; i < pixels.length; i += 4) {
      const gray = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      grayscale.push(gray);
    }

    // Create hash by comparing adjacent pixels
    let hash = '';
    for (let row = 0; row < hashSize; row++) {
      for (let col = 0; col < hashSize; col++) {
        const idx = row * (hashSize + 1) + col;
        const left = grayscale[idx];
        const right = grayscale[idx + 1];
        hash += left < right ? '1' : '0';
      }
    }

    return hash;
  },

  // ============================================
  // Convert binary hash to hex (for storage efficiency)
  // ============================================
  binaryToHex: function(binaryString) {
    let hex = '';
    for (let i = 0; i < binaryString.length; i += 4) {
      const chunk = binaryString.substring(i, i + 4);
      const decimal = parseInt(chunk, 2);
      hex += decimal.toString(16);
    }
    return hex;
  },

  // ============================================
  // Convert hex back to binary
  // ============================================
  hexToBinary: function(hexString) {
    let binary = '';
    for (let i = 0; i < hexString.length; i++) {
      const decimal = parseInt(hexString[i], 16);
      binary += decimal.toString(2).padStart(4, '0');
    }
    return binary;
  },

  // ============================================
  // Calculate Hamming Distance (similarity metric)
  // ============================================
  hammingDistance: function(hash1, hash2) {
    if (hash1.length !== hash2.length) {
      throw new Error('Hashes must be same length');
    }

    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] !== hash2[i]) {
        distance++;
      }
    }

    return distance;
  },

  // ============================================
  // Check if two images are similar
  // ============================================
  areSimilar: function(hash1, hash2, threshold = 10) {
    const distance = this.hammingDistance(hash1, hash2);
    return distance <= threshold;
  },

  // ============================================
  // Calculate similarity percentage
  // ============================================
  similarity: function(hash1, hash2) {
    const distance = this.hammingDistance(hash1, hash2);
    const maxDistance = hash1.length;
    return ((maxDistance - distance) / maxDistance) * 100;
  },

  // ============================================
  // Generate image hash from image element
  // ============================================
  hashImage: function(img, method = 'difference') {
    // Convert image to canvas
    const canvas = window.ImageUtils.imageToCanvas(img);
    if (!canvas) {
      return null;
    }

    // Generate hash based on method
    let binaryHash;
    if (method === 'average') {
      binaryHash = this.averageHash(canvas);
    } else {
      binaryHash = this.differenceHash(canvas);
    }

    // Convert to hex for efficiency
    return this.binaryToHex(binaryHash);
  },

  // ============================================
  // Simple URL-based hash (fallback)
  // ============================================
  urlHash: function(url) {
    // Simple hash function for URLs
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  },

  // ============================================
  // Get unique identifier for image
  // ============================================
  getImageIdentifier: function(img) {
    // Priority 1: URL-based hash (most reliable)
    try {
      const url = window.ImageUtils?.getImageUrl(img) || img.src || img.currentSrc;
      if (url && url.length > 0 && !url.startsWith('data:')) {
        return `url_${this.urlHash(url)}`;
      }
    } catch (e) {
      console.log('URL hash failed:', e);
    }

    // Priority 2: Try perceptual hash (may fail due to CORS)
    try {
      const perceptualHash = this.hashImage(img);
      if (perceptualHash) {
        return `ph_${perceptualHash}`;
      }
    } catch (e) {
      console.log('Perceptual hash failed (CORS?):', e);
    }

    // Priority 3: Generate from image attributes
    try {
      const attrs = `${img.width}x${img.height}_${img.src?.length || 0}`;
      return `attr_${this.urlHash(attrs)}`;
    } catch (e) {
      console.log('Attribute hash failed:', e);
    }

    // Last resort: random ID
    return `rand_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  },

  // ============================================
  // Find duplicate images in a set
  // ============================================
  findDuplicates: function(images, threshold = 10) {
    const hashes = new Map();
    const duplicates = [];

    images.forEach((img, index) => {
      const hash = this.hashImage(img);
      if (!hash) return;

      // Check against existing hashes
      for (const [existingHash, existingIndex] of hashes.entries()) {
        if (this.areSimilar(hash, existingHash, threshold)) {
          duplicates.push({
            original: existingIndex,
            duplicate: index,
            similarity: this.similarity(hash, existingHash),
          });
          return;
        }
      }

      // No duplicate found, add to set
      hashes.set(hash, index);
    });

    return duplicates;
  },
};

// Make available globally
if (typeof window !== 'undefined') {
  window.HashUtils = HashUtils;
}
