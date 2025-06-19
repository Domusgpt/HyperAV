# Component Manifest: TimestampedThoughtBuffer

## 1. Purpose and Role

`TimestampedThoughtBuffer.js` is a sub-component primarily utilized by `KerbelizedParserator` (and potentially by `PPPProjector` directly). Its main purpose is to store and manage a time-ordered sequence of contextual items or "thoughts." These items typically represent contextual information, observations, or intermediate parsing results that might be relevant for future processing or for understanding temporal patterns in data.

Each item in the buffer is associated with a timestamp, data payload, and a weight.

## 2. Key Data Structures

*   **`this.config` (Object):**
    *   Stores the configuration for the buffer instance, merged from defaults and user-provided settings (see Section 4).
*   **`this.buffer` (Array):**
    *   The core data structure, an array storing the buffered items.
    *   Each item is an object with the structure:
        ```json
        {
          "timestamp": 1678886400000, // Millisecond timestamp
          "data": { /* ... any data payload ... */ },
          "weight": 0.75 // Numeric weight indicating importance or relevance
        }
        ```
*   **`this.maxSize` (Number):**
    *   A direct property derived from `this.config.maxSize`, controlling the maximum number of items the buffer can hold.

## 3. Core Logic and Key Methods

### Initialization (`constructor(config = {})`)
*   Merges the provided `config` with `DEFAULT_TTB_CONFIG` (defined within the module).
*   Initializes `this.buffer` as an empty array.
*   Sets `this.maxSize` from the configuration.
*   Logs the initialized configuration.

### Data Injection (`inject(timestamp, data, weight)`)
*   **Purpose:** Adds a new item to the buffer.
*   **Logic:**
    *   If `weight` is not provided, it uses `this.config.defaultInjectionWeight`.
    *   Creates an item object (`{ timestamp, data, weight }`).
    *   Pushes this item onto the end of `this.buffer`.
    *   Calls `this.cleanup()` to maintain the buffer's size limit.

### Buffer Maintenance (`cleanup()`)
*   **Purpose:** Ensures the buffer does not exceed `this.maxSize`.
*   **Logic:**
    *   If `this.buffer.length` is greater than `this.maxSize`:
        *   If `this.config.retentionPolicy === "lifo"` (Last-In, First-Out for eviction, meaning keep oldest):
            *   The buffer is truncated to keep the first `this.maxSize` items (i.e., `this.buffer = this.buffer.slice(0, this.maxSize)`).
        *   Else (defaulting to `"fifo"` - First-In, First-Out for eviction, meaning keep newest):
            *   The buffer is truncated to keep the last `this.maxSize` items (i.e., `this.buffer = this.buffer.slice(this.buffer.length - this.maxSize)`).
    *   Note: The current "fifo" implementation (keeping newest) effectively behaves like a sliding window where older items are discarded. A true LIFO eviction (keeping oldest) is also implemented.

### Data Retrieval & Analysis
*   **`getActivityLevel(timestamp, window)`:**
    *   Calculates the proportion of items in the buffer that fall within a given time `window` around a specific `timestamp`.
    *   Returns a value between 0 and 1 (active items / `maxSize`).
*   **`getCurrentState()`:**
    *   Returns a slice of the most recent items in the buffer (currently up to the last 100, or fewer if the buffer is smaller). This provides a snapshot of recent activity.
*   **`getRecentContext()`:**
    *   Returns a smaller slice of the very most recent items (currently up to the last 10, or fewer). This is for quick access to the latest context.

## 4. Configuration (`this.config.thoughtBufferConfig`)

The configuration is derived from `DEFAULT_TTB_CONFIG` within the module, which can be overridden by `thoughtBufferConfig` passed from `KerbelizedParserator`.

*   **`maxSize` (Number, Default: 1000):**
    *   The maximum number of items the buffer will store.
*   **`retentionPolicy` (String, Default: "fifo"):**
    *   Determines which items are discarded when `maxSize` is exceeded.
    *   `"fifo"`: Keeps the newest `maxSize` items (First-In, First-Out eviction of oldest items).
    *   `"lifo"`: Keeps the oldest `maxSize` items (Last-In, First-Out eviction of newest items if buffer overflows, though current implementation adds then truncates, so effectively it keeps the first items added up to max size).
    *   (Conceptual: `"weighted_decay_by_focus"` is mentioned in API doc but not implemented).
*   **`defaultInjectionWeight` (Number, Default: 0.5):**
    *   The weight assigned to items injected via `inject()` if no explicit weight is provided.

## 5. Interaction with Other Components

*   **`KerbelizedParserator`:**
    *   Instantiates `TimestampedThoughtBuffer` with `this.config.thoughtBufferConfig`.
    *   Calls `this.thoughtBuffer.inject()` (typically via its `findOptimalInjectionPoints` helper after a `projectToPPP` call) when `config.enablePPPinjection` is true.
    *   May call `getCurrentState()` or `getRecentContext()` for logging or if its internal logic needs to inspect the buffer.
*   **`PPPProjector` (Potentially):**
    *   The `PPPProjector.projectToTimestampedBuffer(data, buffer)` method is designed to take a buffer instance (which would be a `TimestampedThoughtBuffer`) and call its `inject` method. This is used in the integration test with an external `PPPProjector` and `TimestampedThoughtBuffer`.

This component provides a crucial temporal context memory for the parsing engine.
