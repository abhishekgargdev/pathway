/* eslint-disable @typescript-eslint/no-explicit-any */
import { Worker as NodeWorker } from "worker_threads";
import { runCodeBrowser } from "../lib/code-runner/provider";
import { compareOutputs, tokenCompare } from "../lib/code-runner/compare";
import { runAgainstTestCasesBrowser } from "../lib/code-runner/index";

// 1. Setup Mock Browser API inside Node.js
const objectUrls = new Map<string, string>();

(global as any).objectUrls = objectUrls;
(global as any).window = {};
(global as any).Blob = class MockBlob {
  public content: string;
  constructor(parts: string[]) {
    this.content = parts.join("");
  }
};

(global as any).URL = {
  createObjectURL: (blob: any) => {
    const id = "mock-url-" + Math.random();
    objectUrls.set(id, blob.content);
    return id;
  },
  revokeObjectURL: (id: string) => {
    objectUrls.delete(id);
  },
};

(global as any).performance = performance;

(global as any).Worker = class MockWorker {
  private worker: NodeWorker;
  public onmessage: ((event: any) => void) | null = null;
  public onerror: ((event: any) => void) | null = null;

  constructor(url: string) {
    const jsCode = objectUrls.get(url) || "";

    // Adapt parentPort.postMessage to look like browser's global postMessage
    // Mock importScripts for CDN scripts to local requires where possible, or mock them
    const adaptedCode = `
      const { parentPort } = require("worker_threads");
      const postMessage = (msg) => parentPort.postMessage(msg);
      
      const importScripts = (url) => {
        if (url.includes("typescript")) {
          // Inject mock typescript transpiler
          global.ts = {
            ScriptTarget: { ES2020: 1 },
            ModuleKind: { CommonJS: 1 },
            transpile: (tsCode) => {
              // Simple transpile: strip types using regexes for basic test usage
              return tsCode
                .replace(/:\\s*number/g, "")
                .replace(/:\\s*string/g, "")
                .replace(/:\\s*void/g, "")
                .replace(/:\\s*boolean/g, "");
            }
          };
        } else if (url.includes("pyodide")) {
          // Python worker mocks: inside Node testing, we will fallback or run Python
          // For Python mock tests we can mock loadPyodide
          global.loadPyodide = async () => {
            return {
              runPythonAsync: async (pyCode) => {
                // If it runs pyCode, mock output postMessage
                postMessage({ type: "stdout", data: "Hello from Python!\\n" });
                return 0;
              }
            };
          };
        }
      };
      
      ${jsCode}
    `;

    this.worker = new NodeWorker(adaptedCode, { eval: true });
    this.worker.on("message", (data) => {
      if (this.onmessage) this.onmessage({ data });
    });
    this.worker.on("error", (err) => {
      if (this.onerror) this.onerror(err);
    });
  }

  terminate() {
    this.worker.terminate();
  }
};

// 2. Test Suite Execution
async function runTests() {
  console.log("=== Running Code Execution Test Suite ===\n");
  let passed = true;

  const assert = (condition: boolean, msg: string) => {
    if (condition) {
      console.log(`[PASS] ${msg}`);
    } else {
      console.error(`[FAIL] ${msg}`);
      passed = false;
    }
  };

  try {
    // Test 1: Successful JavaScript execution
    const t1 = await runCodeBrowser({
      language: "javascript",
      code: 'console.log("Hello 123");',
    });
    assert(
      t1.status === "accepted" && t1.stdout.trim() === "Hello 123",
      `Successful JS execution (Status: ${t1.status}, stdout: "${t1.stdout.trim()}")`
    );

    // Test 2: Runtime error
    const t2 = await runCodeBrowser({
      language: "javascript",
      code: "throw new Error('Fatal error');",
    });
    assert(
      t2.status === "runtime-error" && t2.stderr.includes("Fatal error"),
      `JS Runtime error detection (Status: ${t2.status}, stderr: "${t2.stderr.trim()}")`
    );

    // Test 3: Output Limit
    const t3 = await runCodeBrowser({
      language: "javascript",
      code: "for(let i=0; i<1000; i++) { console.log('a'.repeat(100)); }",
      outputLimitBytes: 500,
    });
    assert(
      t3.status === "output-limit",
      `Output limit detection (Status: ${t3.status})`
    );

    // Test 4: Timeout
    const t4 = await runCodeBrowser({
      language: "javascript",
      code: "while(true) {}",
      timeLimitMs: 500,
    });
    assert(
      t4.status === "timeout",
      `Timeout detection (Status: ${t4.status})`
    );

    // Test 5: Comparison Logic
    assert(
      compareOutputs("Line1\r\nLine2  \n\n", "Line1\nLine2"),
      "Comparison logic trims CRLF, trailing spaces, and final newlines"
    );
    assert(
      !compareOutputs("Line1", "Line2"),
      "Comparison detects mismatched tokens"
    );
    assert(
      tokenCompare("1 2 3", " 1   2   3 "),
      "Token comparison matches loose spacing"
    );

    // Test 6: TypeScript execution
    const t6 = await runCodeBrowser({
      language: "typescript",
      code: "const x: number = 42; console.log(x);",
    });
    assert(
      t6.status === "accepted" && t6.stdout.trim() === "42",
      `TypeScript execution with mock transpiler (Status: ${t6.status}, stdout: "${t6.stdout.trim()}")`
    );

    // Test 7: Multiple Test Cases
    const summary = await runAgainstTestCasesBrowser(
      "const readline = require('readline'); const rl = readline.createInterface({input: process.stdin}); rl.on('line', (line) => { console.log(parseInt(line) * 2); });",
      "javascript",
      [
        { input: "5", expectedOutput: "10" },
        { input: "20", expectedOutput: "40" },
      ]
    );
    assert(
      summary.status === "accepted" && summary.passedCount === 2,
      `Multiple test cases runner matching inputs (Passed: ${summary.passedCount}/${summary.totalCount}, Status: ${summary.status})`
    );

  } catch (err) {
    console.error("Test execution threw error:", err);
    passed = false;
  }

  console.log("\n=== Test Suite Finished ===");
  if (!passed) {
    process.exit(1);
  } else {
    console.log("All tests passed successfully!");
  }
}

runTests();
