/**
 * @fileoverview Utility functions for data transformation.
 */

const TransformFunctions = {
  /**
   * Scales a value from a domain to a range linearly.
   * @param {number} value The value to scale.
   * @param {number[]} domain The domain [min, max].
   * @param {number[]} range The range [min, max].
   * @returns {number} The scaled value.
   */
  linearScale: (value, domain, range) => {
    if (domain[1] - domain[0] === 0) {
      return range[0]; // Avoid division by zero
    }
    const normalized = (value - domain[0]) / (domain[1] - domain[0]);
    return normalized * (range[1] - range[0]) + range[0];
  },

  /**
   * Scales a value from a domain to a range logarithmically.
   * @param {number} value The value to scale.
   * @param {number[]} domain The domain [min, max].
   * @param {number[]} range The range [min, max].
   * @returns {number} The scaled value.
   * @throws {Error} if domain or range includes non-positive values.
   */
  logScale: (value, domain, range) => {
    if (domain[0] <= 0 || domain[1] <= 0 || range[0] <= 0 || range[1] <= 0 || value <= 0) {
      console.error("Log scale requires positive domain, range, and value.");
      return range[0]; // Or handle error as appropriate
    }
    const logVal = Math.log(value);
    const logDomain0 = Math.log(domain[0]);
    const logDomain1 = Math.log(domain[1]);
    if (logDomain1 - logDomain0 === 0) {
        return range[0]; // Avoid division by zero
    }
    const normalized = (logVal - logDomain0) / (logDomain1 - logDomain0);
    return normalized * (range[1] - range[0]) + range[0];
  },

  /**
   * Clamps a value between a minimum and maximum.
   * @param {number} value The value to clamp.
   * @param {number} min The minimum value.
   * @param {number} max The maximum value.
   * @returns {number} The clamped value.
   */
  clamp: (value, min, max) => {
    return Math.min(Math.max(value, min), max);
  },

  /**
   * Returns one of two values based on a threshold.
   * @param {number} value The value to test.
   * @param {number} thresholdValue The threshold value.
   * @param {*} belowValue The value to return if value < thresholdValue.
   * @param {*} aboveValue The value to return if value >= thresholdValue.
   * @returns {*} Either belowValue or aboveValue.
   */
  threshold: (value, thresholdValue, belowValue, aboveValue) => {
    return value < thresholdValue ? belowValue : aboveValue;
  },

  /**
   * Maps a string value to a number based on an enum map.
   * @param {string} value The string value to map.
   * @param {Object.<string, number>} enumMap The map of string keys to number values.
   * @param {number} defaultValue The value to return if the string is not found in the map.
   * @returns {number} The mapped number or the default value.
   */
  stringToEnum: (value, enumMap, defaultValue) => {
    return enumMap.hasOwnProperty(value) ? enumMap[value] : defaultValue;
  },

  /**
   * Converts a color string (hex, name, rgb, rgba) to a vec3 or vec4 array.
   * @param {string} value The color string.
   * @param {number[]} defaultValue The default color array to return on error.
   * @returns {number[]} A 3 or 4-element array representing the color [r, g, b] or [r, g, b, a], normalized to 0-1.
   */
  colorStringToVec: (value, defaultValue) => {
    if (typeof value !== 'string') {
      console.warn(`colorStringToVec: Expected a string, got ${typeof value}. Returning defaultValue.`);
      return defaultValue;
    }

    value = value.trim().toLowerCase();

    // Hex format (#RGB, #RRGGBB, #AARRGGBB, #RRGGBBAA)
    if (value.startsWith('#')) {
      let hex = value.substring(1);
      let alpha = 1.0;
      if (hex.length === 3) { // #RGB
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      if (hex.length === 8) { // #AARRGGBB or #RRGGBBAA
        // Assuming #RRGGBBAA for consistency with web standards
        // If #AARRGGBB is needed, this part requires adjustment
        alpha = parseInt(hex.substring(6, 8), 16) / 255;
        hex = hex.substring(0, 6);
      }
      if (hex.length === 6) { // #RRGGBB
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;
        return [r, g, b, alpha];
      }
    }

    // rgb() or rgba() format
    if (value.startsWith('rgb')) {
      const match = value.match(/rgba?\((\s*\d+\s*),(\s*\d+\s*),(\s*\d+\s*)(?:,(\s*[\d.]+\s*))?\)/);
      if (match) {
        const r = parseInt(match[1], 10) / 255;
        const g = parseInt(match[2], 10) / 255;
        const b = parseInt(match[3], 10) / 255;
        const a = match[4] ? parseFloat(match[4]) : 1.0;
        return [r, g, b, a];
      }
    }

    // Common color names (simplified subset)
    const colorNames = {
      "red": [1, 0, 0, 1], "green": [0, 1, 0, 1], "blue": [0, 0, 1, 1],
      "white": [1, 1, 1, 1], "black": [0, 0, 0, 1], "yellow": [1, 1, 0, 1],
      "cyan": [0, 1, 1, 1], "magenta": [1, 0, 1, 1], "gray": [0.5, 0.5, 0.5, 1],
      "transparent": [0,0,0,0]
    };
    if (colorNames[value]) {
      return [...colorNames[value]]; // Return copy
    }

    console.warn(`colorStringToVec: Could not parse color string "${value}". Returning defaultValue.`);
    return defaultValue;
  }
};

// For environments that support module.exports (e.g., Node.js for testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TransformFunctions;
}
