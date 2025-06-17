/**
 * Centralized notification management system
 * Handles all UI notifications without circular dependencies
 */
export class NotificationManager {
  constructor() {
    this.notificationTimeout = null;
    this.copyStatus = null;
  }

  /**
   * Initialize with DOM element
   */
  initialize(copyStatusElement) {
    this.copyStatus = copyStatusElement;
  }

  /**
   * Show notification with various options
   */
  showNotification(message, isSuccess = true, timeoutDuration = 3000, isSticky = false) {
    if (!this.copyStatus) {
      console.warn('NotificationManager not initialized with DOM element');
      console.log(`Notification: ${message}`);
      return;
    }

    if (this.copyStatus.classList.contains('sticky') && !isSticky) return;

    const isCurrentlyVisible = this.copyStatus.classList.contains('visible');

    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
      this.notificationTimeout = null;
    }

    this.copyStatus.textContent = message;
    this.copyStatus.classList.toggle('success', isSuccess);
    this.copyStatus.classList.toggle('error', !isSuccess);
    this.copyStatus.classList.toggle('sticky', isSticky);

    if (!isCurrentlyVisible) {
      requestAnimationFrame(() => this.copyStatus.classList.add('visible'));
    }

    this.notificationTimeout = setTimeout(() => {
      this.copyStatus.classList.remove('visible', 'sticky');
    }, timeoutDuration);
  }

  /**
   * Show success notification
   */
  showSuccess(message, timeoutDuration = 3000, isSticky = false) {
    this.showNotification(message, true, timeoutDuration, isSticky);
  }

  /**
   * Show error notification
   */
  showError(message, timeoutDuration = 3000, isSticky = false) {
    this.showNotification(message, false, timeoutDuration, isSticky);
  }

  /**
   * Show inference notification (specialized for sorting)
   */
  showInferenceNotification(count) {
    if (count > 0) {
      this.showNotification(`Inferred ${count} comparisons from imported decisions`);
    }
  }
}

// Create and export singleton instance
export const notificationManager = new NotificationManager();
export default notificationManager;