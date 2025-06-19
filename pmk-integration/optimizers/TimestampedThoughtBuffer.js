export class TimestampedThoughtBuffer {
    constructor(config = {}) {
        this.buffer = [];
        this.maxSize = config.maxSize || 1000;
        console.log("TimestampedThoughtBuffer initialized with maxSize:", this.maxSize);
    }

    inject(timestamp, data, weight) {
        // console.log("TimestampedThoughtBuffer.inject:", { timestamp, data, weight });
        this.buffer.push({ timestamp, data, weight });
        this.cleanup();
    }

    getActivityLevel(timestamp, window) {
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
        if (this.buffer.length > this.maxSize) {
            this.buffer = this.buffer.slice(this.buffer.length - this.maxSize);
        }
    }
}
