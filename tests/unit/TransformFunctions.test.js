// tests/unit/TransformFunctions.test.js

// This test script assumes that `TransformFunctions` is available in the global scope.
// This would typically be achieved by including <script src="../../controllers/TransformFunctions.js"></script>
// before this script in a test HTML page, or by using a test runner that handles modules.

const runTransformFunctionTests = () => {
    let testsPassed = 0;
    let testsFailed = 0;
    const testResults = [];

    const test = (description, fn) => {
        try {
            fn();
            // console.log(`[PASS] ${description}`);
            testResults.push({ description, status: 'PASS' });
            testsPassed++;
        } catch (e) {
            // console.error(`[FAIL] ${description}: ${e.message}`);
            testResults.push({ description, status: 'FAIL', message: e.message });
            testsFailed++;
        }
    };

    const assertAlmostEqual = (actual, expected, epsilon = 1e-6, message = "") => {
        if (typeof actual !== 'number' || typeof expected !== 'number') {
             throw new Error(`${message} Type mismatch. Expected numbers, got ${typeof actual} and ${typeof expected}. Actual: ${actual}, Expected: ${expected}`);
        }
        if (Math.abs(actual - expected) > epsilon) {
            throw new Error(`${message} Expected ${expected} (approx.), but got ${actual}`);
        }
    };

    const assertStrictEqual = (actual, expected, message = "") => {
        if (actual !== expected) {
            throw new Error(`${message} Expected ${expected} (strict), but got ${actual}`);
        }
    };

    const assertArrayEqual = (actual, expected, epsilon = 1e-6, message = "") => {
        if (!Array.isArray(actual) || !Array.isArray(expected)) {
             throw new Error(`${message} Type mismatch. Expected arrays. Actual: ${JSON.stringify(actual)}, Expected: ${JSON.stringify(expected)}`);
        }
        if (actual.length !== expected.length) {
            throw new Error(`${message} Expected array length ${expected.length}, but got ${actual.length}. Actual: ${JSON.stringify(actual)}, Expected: ${JSON.stringify(expected)}`);
        }
        for (let i = 0; i < actual.length; i++) {
            if (typeof actual[i] === 'number' && typeof expected[i] === 'number') {
                if (Math.abs(actual[i] - expected[i]) > epsilon) {
                    throw new Error(`${message} Expected ${expected[i]} (approx.) at index ${i}, but got ${actual[i]}. Array: ${JSON.stringify(actual)}`);
                }
            } else if (actual[i] !== expected[i]) {
                 throw new Error(`${message} Expected ${expected[i]} at index ${i}, but got ${actual[i]}. Array: ${JSON.stringify(actual)}`);
            }
        }
    };

    const assertThrows = (fn, expectedErrorMessageSubstring = "", message = "") => {
        let didThrow = false;
        try {
            fn();
        } catch (e) {
            didThrow = true;
            if (expectedErrorMessageSubstring && !e.message.includes(expectedErrorMessageSubstring)) {
                throw new Error(`${message} Threw error, but message "${e.message}" did not include "${expectedErrorMessageSubstring}"`);
            }
        }
        if (!didThrow) {
            throw new Error(`${message} Expected function to throw, but it did not.`);
        }
    };


    console.log("--- Running TransformFunctions Tests ---");

    // --- linearScale ---
    test("linearScale: basic scaling up", () => {
        assertAlmostEqual(TransformFunctions.linearScale(50, [0, 100], [0, 1]), 0.5, 1e-6, "LS1");
    });
    test("linearScale: basic scaling down", () => {
        assertAlmostEqual(TransformFunctions.linearScale(0.5, [0, 1], [0, 100]), 50, 1e-6, "LS2");
    });
    test("linearScale: value at domain min", () => {
        assertAlmostEqual(TransformFunctions.linearScale(0, [0, 100], [10, 20]), 10, 1e-6, "LS3");
    });
    test("linearScale: value at domain max", () => {
        assertAlmostEqual(TransformFunctions.linearScale(100, [0, 100], [10, 20]), 20, 1e-6, "LS4");
    });
    test("linearScale: value outside domain (extrapolation below)", () => {
        assertAlmostEqual(TransformFunctions.linearScale(-10, [0, 100], [0, 1]), -0.1, 1e-6, "LS5");
    });
    test("linearScale: value outside domain (extrapolation above)", () => {
        assertAlmostEqual(TransformFunctions.linearScale(110, [0, 100], [0, 1]), 1.1, 1e-6, "LS6");
    });
    test("linearScale: negative numbers in domain/range", () => {
        assertAlmostEqual(TransformFunctions.linearScale(-5, [-10, 0], [-1, 1]), 0, 1e-6, "LS7"); // -5 is midpoint of [-10,0], maps to midpoint of [-1,1]
    });
    test("linearScale: domain min === domain max", () => {
        assertAlmostEqual(TransformFunctions.linearScale(50, [50, 50], [0, 1]), 0, 1e-6, "LS8"); // Should return range[0]
    });
     test("linearScale: inverted range", () => {
        assertAlmostEqual(TransformFunctions.linearScale(25, [0,100], [1,0]), 0.75, 1e-6, "LS9");
    });


    // --- logScale ---
    test("logScale: basic scaling", () => {
        assertAlmostEqual(TransformFunctions.logScale(10, [1, 100], [0, 1]), (Math.log(10) - Math.log(1)) / (Math.log(100) - Math.log(1)), 1e-6, "LogS1");
    });
    test("logScale: value at domain min", () => {
        assertAlmostEqual(TransformFunctions.logScale(1, [1, 100], [5, 10]), 5, 1e-6, "LogS2");
    });
    test("logScale: value at domain max", () => {
        assertAlmostEqual(TransformFunctions.logScale(100, [1, 100], [5, 10]), 10, 1e-6, "LogS3");
    });
    test("logScale: non-positive value (value <= 0)", () => {
        assertAlmostEqual(TransformFunctions.logScale(0, [1, 100], [0, 1]), 0, 1e-6, "LogS4"); // Returns range[0]
    });
    test("logScale: non-positive domain (domain[0] <= 0)", () => {
        assertAlmostEqual(TransformFunctions.logScale(10, [0, 100], [0, 1]), 0, 1e-6, "LogS5"); // Returns range[0]
    });
    test("logScale: non-positive range (range[0] <= 0)", () => {
        // Function should still calculate but might be mathematically weird if range isn't positive for some log interpretations
        // Current implementation allows non-positive range, result depends on linear scaling of log values.
        assertAlmostEqual(TransformFunctions.logScale(10, [1, 100], [-1, 0]), -1 + (Math.log(10) - Math.log(1)) / (Math.log(100) - Math.log(1)), 1e-6, "LogS6");
    });
    test("logScale: logDomain0 === logDomain1 (domain[0] === domain[1])", () => {
        assertAlmostEqual(TransformFunctions.logScale(10, [10, 10], [0, 1]), 0, 1e-6, "LogS7"); // Returns range[0]
    });


    // --- clamp ---
    test("clamp: value below min", () => {
        assertAlmostEqual(TransformFunctions.clamp(-5, 0, 10), 0, 1e-6, "Clamp1");
    });
    test("clamp: value above max", () => {
        assertAlmostEqual(TransformFunctions.clamp(15, 0, 10), 10, 1e-6, "Clamp2");
    });
    test("clamp: value within range", () => {
        assertAlmostEqual(TransformFunctions.clamp(5, 0, 10), 5, 1e-6, "Clamp3");
    });
    test("clamp: value at min", () => {
        assertAlmostEqual(TransformFunctions.clamp(0, 0, 10), 0, 1e-6, "Clamp4");
    });
    test("clamp: value at max", () => {
        assertAlmostEqual(TransformFunctions.clamp(10, 0, 10), 10, 1e-6, "Clamp5");
    });

    // --- threshold ---
    test("threshold: value below", () => {
        assertStrictEqual(TransformFunctions.threshold(5, 10, "below", "above"), "below", "Thresh1");
    });
    test("threshold: value at threshold (should be above)", () => {
        assertStrictEqual(TransformFunctions.threshold(10, 10, "below", "above"), "above", "Thresh2");
    });
    test("threshold: value above", () => {
        assertStrictEqual(TransformFunctions.threshold(15, 10, "below", "above"), "above", "Thresh3");
    });
    test("threshold: different types for below/above (numbers)", () => {
        assertStrictEqual(TransformFunctions.threshold(1, 5, 100, 200), 100, "Thresh4");
    });
     test("threshold: different types for below/above (arrays)", () => {
        assertArrayEqual(TransformFunctions.threshold(10, 5, [1,2], [3,4]), [3,4], 1e-6,"Thresh5");
    });


    // --- stringToEnum ---
    const enumMap = {"RED": 0, "GREEN": 1, "BLUE": 2};
    test("stringToEnum: existing key", () => {
        assertStrictEqual(TransformFunctions.stringToEnum("GREEN", enumMap, -1), 1, "StrEnum1");
    });
    test("stringToEnum: non-existing key", () => {
        assertStrictEqual(TransformFunctions.stringToEnum("YELLOW", enumMap, -1), -1, "StrEnum2");
    });
    test("stringToEnum: empty map", () => {
        assertStrictEqual(TransformFunctions.stringToEnum("ANY", {}, "default"), "default", "StrEnum3");
    });
    test("stringToEnum: different type for defaultValue", () => {
        assertStrictEqual(TransformFunctions.stringToEnum("NONE", enumMap, null), null, "StrEnum4");
    });
    test("stringToEnum: case sensitive", () => {
        assertStrictEqual(TransformFunctions.stringToEnum("Red", enumMap, -1), -1, "StrEnum5");
    });

    // --- colorStringToVec ---
    const defaultColor = [0.1, 0.2, 0.3, 0.4];
    test("colorStringToVec: hex #RGB", () => {
        assertArrayEqual(TransformFunctions.colorStringToVec("#F08", defaultColor), [1, 0, 170/255, 1], 1e-6, "Color1"); // #FF0088
    });
    test("colorStringToVec: hex #RRGGBB", () => {
        assertArrayEqual(TransformFunctions.colorStringToVec("#FF0080", defaultColor), [1, 0, 128/255, 1], 1e-6, "Color2");
    });
     test("colorStringToVec: hex #RRGGBBAA", () => {
        assertArrayEqual(TransformFunctions.colorStringToVec("#00FF0080", defaultColor), [0, 1, 0, 128/255], 1e-6, "Color3");
    });
    test("colorStringToVec: rgb() format", () => {
        assertArrayEqual(TransformFunctions.colorStringToVec("rgb(255,0,0)", defaultColor), [1,0,0,1], 1e-6, "Color4");
    });
    test("colorStringToVec: rgba() format", () => {
        assertArrayEqual(TransformFunctions.colorStringToVec("rgba(0,255,0,0.5)", defaultColor), [0,1,0,0.5], 1e-6, "Color5");
    });
    test("colorStringToVec: common name 'red'", () => {
        assertArrayEqual(TransformFunctions.colorStringToVec("red", defaultColor), [1,0,0,1], 1e-6, "Color6");
    });
    test("colorStringToVec: common name 'white'", () => {
        assertArrayEqual(TransformFunctions.colorStringToVec("white", defaultColor), [1,1,1,1], 1e-6, "Color7");
    });
    test("colorStringToVec: common name 'transparent'", () => {
        assertArrayEqual(TransformFunctions.colorStringToVec("transparent", defaultColor), [0,0,0,0], 1e-6, "Color8");
    });
    test("colorStringToVec: invalid color string", () => {
        assertArrayEqual(TransformFunctions.colorStringToVec("invalidcolor", defaultColor), defaultColor, 1e-6, "Color9");
    });
    test("colorStringToVec: different defaultValue", () => {
        const newDefault = [0.5,0.5,0.5,0.8];
        assertArrayEqual(TransformFunctions.colorStringToVec("bad", newDefault), newDefault, 1e-6, "Color10");
    });
    test("colorStringToVec: case-insensitivity", () => {
        assertArrayEqual(TransformFunctions.colorStringToVec("BLUE", defaultColor), [0,0,1,1], 1e-6, "Color11");
        assertArrayEqual(TransformFunctions.colorStringToVec("rGbA(0,0,255,0.7)", defaultColor), [0,0,1,0.7], 1e-6, "Color12");
    });
    test("colorStringToVec: extra spaces", () => {
        assertArrayEqual(TransformFunctions.colorStringToVec("  #0F0  ", defaultColor), [0,1,0,1], 1e-6, "Color13");
        assertArrayEqual(TransformFunctions.colorStringToVec("  rgb( 0 , 255 , 0 )  ", defaultColor), [0,1,0,1], 1e-6, "Color14");
    });
    test("colorStringToVec: invalid input type (number)", () => {
        assertArrayEqual(TransformFunctions.colorStringToVec(123, defaultColor), defaultColor, 1e-6, "Color15");
    });
     test("colorStringToVec: hex #AARRGGBB (should parse as RRGGBBAA)", () => {
        // Standard web interpretation is RRGGBBAA for 8-digit hex.
        // If #AARRGGBB (alpha first) was intended, colorStringToVec would need specific logic.
        // Current logic (substring(6,8) for alpha) means it treats 8-digit as RRGGBBAA.
        assertArrayEqual(TransformFunctions.colorStringToVec("#8000FF00", defaultColor), [0, 255/255, 0, 128/255], 1e-6, "Color16"); // 00FF00 with alpha 80
    });


    console.log("--- Test Summary ---");
    testResults.forEach(result => {
        if (result.status === 'PASS') {
            console.log(`[PASS] ${result.description}`);
        } else {
            console.error(`[FAIL] ${result.description}: ${result.message}`);
        }
    });
    console.log(`Total Passed: ${testsPassed}, Total Failed: ${testsFailed}`);

    if (testsFailed > 0) {
        // Indicate failure to automated systems if possible
        // For example, in Node.js: process.exit(1);
        // In a browser, this might be harder without a test runner framework.
        // We can throw an error here to make the script execution fail.
        // throw new Error(`${testsFailed} test(s) failed.`);
        return false; // Indicate failure
    }
    return true; // Indicate success
};

// Expose the test runner function if in a browser environment for manual execution
if (typeof window !== 'undefined') {
    window.runTransformFunctionTests = runTransformFunctionTests;
    // Optional: autorun if a query param is set, e.g. ?autorun_tests=true
    // const params = new URLSearchParams(window.location.search);
    // if (params.get('autorun_tests') === 'true') {
    //     runTransformFunctionTests();
    // }
}
// If using in Node.js for testing (requires TransformFunctions to be require-able)
// if (typeof module !== 'undefined' && module.exports) {
//     module.exports = { runTransformFunctionTests };
//     // Optional: autorun if executed directly
//     if (require.main === module) {
//         // Need to load TransformFunctions first if it's a separate file
//         // const TransformFunctions = require('../../controllers/TransformFunctions.js');
//         // global.TransformFunctions = TransformFunctions; // Make it global for the test script
//         // runTransformFunctionTests();
//     }
// }
