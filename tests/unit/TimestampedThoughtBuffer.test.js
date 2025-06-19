import { TimestampedThoughtBuffer } from '../../pmk-integration/optimizers/TimestampedThoughtBuffer.js';

const assert = console.assert || ((condition, message) => { if (!condition) throw new Error(message || "Assertion failed"); });
let currentSuiteTTB = ""; let beforeEachCallbackTTB;
function describeTTB(d, s) { currentSuiteTTB = d; console.log(\`\nSuite: \${d}\`); try { s(); } catch (e) { console.error(\`Error in suite \${d}:\`, e); } currentSuiteTTB = ""; }
function itTTB(d, fn) { console.log(\`  Test: \${currentSuiteTTB} - \${d}\`); try { beforeEachCallbackTTB && beforeEachCallbackTTB(); fn(); console.log(\`    Passed: \${currentSuiteTTB} - \${d}\`); } catch (e) { console.error(\`    Failed: \${currentSuiteTTB} - \${d}\`, e.message, e.stack ? e.stack.split('\n')[1].trim() : ''); } }
function beforeEachTTB(cb) { beforeEachCallbackTTB = cb; }
const expectTTB = (actual) => ({
    toBeDefined: () => assert(actual !== undefined, \`Expected \${actual} to be defined\`),
    toBe: (expected) => assert(actual === expected, \`Expected \${actual} to be \${expected}\`),
    toHaveLength: (expected) => assert(actual && actual.length === expected, \`Expected length \${expected}, got \${actual && actual.length}\`),
    toEqual: (expected) => assert(JSON.stringify(actual) === JSON.stringify(expected), \`Expected \${JSON.stringify(actual)} to equal \${JSON.stringify(expected)}\`),
});

describeTTB('TimestampedThoughtBuffer', () => {
    let buffer;

    itTTB('should instantiate with default config', () => {
        buffer = new TimestampedThoughtBuffer();
        expectTTB(buffer.config).toBeDefined();
        expectTTB(buffer.config.maxSize).toBe(1000);
        expectTTB(buffer.config.retentionPolicy).toBe('fifo');
        expectTTB(buffer.config.defaultInjectionWeight).toBe(0.5);
        expectTTB(buffer.maxSize).toBe(1000); // Direct property also set
    });

    itTTB('should instantiate with custom config', () => {
        const customConfig = { maxSize: 5, retentionPolicy: "lifo", defaultInjectionWeight: 0.8 };
        buffer = new TimestampedThoughtBuffer(customConfig);
        expectTTB(buffer.config.maxSize).toBe(5);
        expectTTB(buffer.maxSize).toBe(5);
        expectTTB(buffer.config.retentionPolicy).toBe('lifo');
        expectTTB(buffer.config.defaultInjectionWeight).toBe(0.8);
    });

    itTTB('inject should use defaultInjectionWeight from config if weight not provided', () => {
        buffer = new TimestampedThoughtBuffer({ defaultInjectionWeight: 0.9 });
        buffer.inject(Date.now(), { data: "test" }); // No weight provided
        expectTTB(buffer.buffer[0].weight).toBe(0.9);
    });

    itTTB('cleanup should respect retentionPolicy (fifo - keeps newest)', () => {
        buffer = new TimestampedThoughtBuffer({ maxSize: 2, retentionPolicy: "fifo" });
        buffer.inject(1, "item1");
        buffer.inject(2, "item2");
        buffer.inject(3, "item3"); // Exceeds maxSize
        expectTTB(buffer.buffer).toHaveLength(2);
        expectTTB(buffer.buffer[0].data).toBe("item2"); // item1 evicted
        expectTTB(buffer.buffer[1].data).toBe("item3");
    });

    itTTB('cleanup should respect retentionPolicy (lifo - keeps oldest)', () => {
        buffer = new TimestampedThoughtBuffer({ maxSize: 2, retentionPolicy: "lifo" });
        buffer.inject(1, "item1");
        buffer.inject(2, "item2");
        buffer.inject(3, "item3"); // Exceeds maxSize
        expectTTB(buffer.buffer).toHaveLength(2);
        expectTTB(buffer.buffer[0].data).toBe("item1"); // item3 evicted (or rather, not added effectively)
        expectTTB(buffer.buffer[1].data).toBe("item2");
    });
});
