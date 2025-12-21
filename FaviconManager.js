// FaviconManager.js
class FaviconManager {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.size = 32;
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.link = null;
  }

  setFavicon(backgroundColor, textColor) {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.size, this.size);

    // Draw background
    this.ctx.fillStyle = backgroundColor;
    this.ctx.fillRect(0, 0, this.size, this.size);

    // Draw a simple music note or initial
    this.ctx.fillStyle = textColor;
    this.ctx.font = 'bold 20px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('♫', this.size / 2, this.size / 2);

    // Update or create favicon link
    if (!this.link) {
      this.link = document.querySelector("link[rel~='icon']");
      if (!this.link) {
        this.link = document.createElement('link');
        this.link.rel = 'icon';
        document.head.appendChild(this.link);
      }
    }

    this.link.type = 'image/x-icon';
    this.link.href = this.canvas.toDataURL();
  }

  // If you have actual image files per theme, use this instead
  setFaviconFromImage(imageUrl) {
    const img = new Image();

    img.onload = () => {
      this.ctx.clearRect(0, 0, this.size, this.size);
      this.ctx.drawImage(img, 0, 0, this.size, this.size);

      if (!this.link) {
        this.link = document.querySelector("link[rel~='icon']");
        if (!this.link) {
          this.link = document.createElement('link');
          this.link.rel = 'icon';
          document.head.appendChild(this.link);
        }
      }

      this.link.type = 'image/x-icon';
      this.link.href = this.canvas.toDataURL();
    };

    img.onerror = () => {
      console.error('Failed to load favicon image:', imageUrl);
    };

    img.src = imageUrl;
  }

  reset() {
    // Reset to default favicon
    if (this.link) {
      this.link.href = 'images/favicon-32x32.png';
    }
  }
}

export const faviconManager = new FaviconManager();