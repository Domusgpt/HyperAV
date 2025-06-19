const DEFAULT_TTB_CONFIG = {
  maxSize: 1000,
  retentionPolicy: "fifo", // fifo, lifo, weighted_decay_by_focus
  defaultInjectionWeight: 0.5
};

export class TimestampedThoughtBuffer {
    constructor(config = {}) {
        this.config = { ...DEFAULT_TTB_CONFIG, ...config };
        this.buffer = [];
        this.maxSize = this.config.maxSize; // Ensure this.maxSize is used from config
        console.log("TimestampedThoughtBuffer initialized with config:", this.config);
    }

    inject(timestamp, data, weight) {
        const injectionWeight = (weight === undefined) ? this.config.defaultInjectionWeight : weight;
        // console.log("TimestampedThoughtBuffer.inject:", { timestamp, data, weight: injectionWeight });
        this.buffer.push({ timestamp, data, weight: injectionWeight });
        this.cleanup();
    }

    getActivityLevel(timestamp, window) {
        // ... (no changes, but could use config if relevant)
        const start = timestamp - window / 2;
        const end = timestamp + window / 2;
        const active = this.buffer.filter(
            item => item.timestamp >= start && item.timestamp <= end
        );
        return this.maxSize > 0 ? active.length / this.maxSize : 0;
    }

    getCurrentState() {
        return this.buffer.slice(-Math.min(100, this.buffer.length));
    }

    getRecentContext() {
        return this.buffer.slice(-Math.min(10, this.buffer.length));
    }

    cleanup() {
        // console.log("Buffer cleanup. Policy:", this.config.retentionPolicy);
        if (this.buffer.length > this.maxSize) {
            if (this.config.retentionPolicy === "lifo") { // Keep oldest
                this.buffer = this.buffer.slice(0, this.maxSize);
            } else { // Default to FIFO-like (keep newest)
                this.buffer = this.buffer.slice(this.buffer.length - this.maxSize);
            }
        }
    }
}
