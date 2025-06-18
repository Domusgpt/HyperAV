// pmk-integration/optimizers/TimestampedThoughtBuffer.js
/**
 * @file TimestampedThoughtBuffer.js
 * @description Manages a buffer of timestamped machine thoughts or events.
 */

export class TimestampedThoughtBuffer {
  constructor(config = {}) {
    this.buffer = [];
    this.maxSize = config.maxSize || 1000;
    console.log("TimestampedThoughtBuffer initialized. Max size:", this.maxSize);
  }

  inject(timestamp, data, weight = 1.0) {
    if (this.buffer.length >= this.maxSize) { // Check before push to make space
        this.cleanup();
    }
    this.buffer.push({ timestamp, data, weight });
    // console.log("TimestampedThoughtBuffer: Injected data at", timestamp, data); // Can be noisy
  }

  getActivityLevel(timestamp, windowMs) {
    const start = timestamp - windowMs / 2;
    const end = timestamp + windowMs / 2;
    const active = this.buffer.filter(
      item => item.timestamp >= start && item.timestamp <= end
    );
    return active.length / this.maxSize; // Or active.length if not normalized by maxSize
  }

  getCurrentState(count = 100) {
    return this.buffer.slice(-Math.min(count, this.buffer.length)); // Ensure count doesn't exceed buffer size
  }

  getRecentContext(count = 10) {
    return this.buffer.slice(-Math.min(count, this.buffer.length)); // Ensure count doesn't exceed buffer size
  }

  cleanup() {
    // More efficient cleanup: if buffer is over maxSize, slice it down.
    // This is called before inject if buffer is full, or could be called periodically.
    if (this.buffer.length >= this.maxSize) { // Use >= in case it somehow became larger
      this.buffer = this.buffer.slice(this.buffer.length - (this.maxSize -1) ); // Make space for one new item
      // console.log("TimestampedThoughtBuffer: Cleaned up buffer. New size:", this.buffer.length);
    }
  }
}
export default TimestampedThoughtBuffer;
