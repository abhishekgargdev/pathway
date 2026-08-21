import { getJsWorkerTemplate, getPyWorkerTemplate } from "./templates";
import type { CodeExecutionRequest, CodeExecutionResult, ExecutionStatus } from "./types";

const DEFAULT_TIMEOUT_MS = 6000;
const DEFAULT_OUTPUT_LIMIT_BYTES = 50000;

export async function runCodeBrowser(
  request: CodeExecutionRequest,
): Promise<CodeExecutionResult> {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return {
      stdout: "",
      stderr: "Code execution environment is only available in the browser client.",
      exitCode: null,
      executionTimeMs: 0,
      status: "unsupported",
    };
  }

  const { language, code, stdin = "", timeLimitMs = DEFAULT_TIMEOUT_MS, outputLimitBytes = DEFAULT_OUTPUT_LIMIT_BYTES } = request;
  const langLower = language.toLowerCase().trim();

  let workerContent = "";

  if (langLower === "javascript" || langLower === "js") {
    workerContent = getJsWorkerTemplate(code, stdin, outputLimitBytes);
  } else if (langLower === "typescript" || langLower === "ts") {
    // TypeScript: Load TS compiler dynamically inside worker and transpile
    workerContent = `
      (function() {
        try {
          importScripts("https://cdnjs.cloudflare.com/ajax/libs/typescript/5.0.4/typescript.min.js");
        } catch (err) {
          postMessage({ type: "error", message: "Failed to load TypeScript compiler CDN: " + err.message });
          return;
        }
        
        let compiledJs = "";
        try {
          compiledJs = ts.transpile(${JSON.stringify(code)}, {
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.CommonJS
          });
        } catch (err) {
          postMessage({ type: "compile-error", message: "TypeScript transpile error: " + err.message });
          return;
        }
        
        const stdinData = ${JSON.stringify(stdin)};
        const outputLimit = ${outputLimitBytes};
        let outputBytes = 0;
        
        function appendOutput(type, data) {
          const text = String(data) + "\\n";
          outputBytes += text.length;
          if (outputBytes > outputLimit) {
            postMessage({ type: "output-limit" });
            throw new Error("Output limit exceeded");
          }
          postMessage({ type, data: text });
        }
        
        console.log = function(...args) {
          appendOutput("stdout", args.join(" "));
        };
        
        console.error = function(...args) {
          appendOutput("stderr", args.join(" "));
        };
        
        const process = {
          stdin: {},
          stdout: {
            write: function(data) {
              appendOutput("stdout", String(data));
            }
          },
          stderr: {
            write: function(data) {
              appendOutput("stderr", String(data));
            }
          },
          exit: function(code) {
            postMessage({ type: "exit", code });
          }
        };
        
        let readlineRequired = false;
        const require = function(moduleName) {
          if (moduleName === "readline") {
            readlineRequired = true;
            return {
              createInterface: function() {
                const listeners = {};
                setTimeout(() => {
                  const lines = stdinData.split("\\n");
                  if (lines.length > 1 && lines[lines.length - 1] === "") {
                    lines.pop();
                  }
                  for (const line of lines) {
                    if (listeners["line"]) {
                      listeners["line"](line);
                    }
                  }
                  if (listeners["close"]) {
                    listeners["close"]();
                  }
                  postMessage({ type: "exit", code: 0 });
                }, 0);
                return {
                  on: function(event, cb) {
                    listeners[event] = cb;
                    return this;
                  }
                };
              }
            };
          }
          throw new Error("Cannot find module '" + moduleName + "'");
        };

        try {
          eval(compiledJs);
          if (!readlineRequired) {
            postMessage({ type: "exit", code: 0 });
          }
        } catch (err) {
          if (err.message !== "Output limit exceeded") {
            postMessage({ type: "error", message: err.message, stack: err.stack });
          }
        }
      })();
    `;
  } else if (langLower === "python" || langLower === "py") {
    // Python: Load Pyodide WASM runtime inside worker
    workerContent = `
      (async function() {
        try {
          importScripts("https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js");
        } catch (err) {
          postMessage({ type: "error", message: "Failed to load Pyodide CDN scripts: " + err.message });
          return;
        }
        
        try {
          const pyodide = await loadPyodide();
          
          const pythonCode = ${JSON.stringify(getPyWorkerTemplate(code, stdin, outputLimitBytes))};
          await pyodide.runPythonAsync(pythonCode);
          
          postMessage({ type: "exit", code: 0 });
        } catch (err) {
          if (err.message && err.message.includes("OutputLimitExceeded")) {
            postMessage({ type: "output-limit" });
          } else {
            postMessage({ type: "error", message: err.message });
          }
        }
      })();
    `;
  } else {
    return {
      stdout: "",
      stderr: `Language "${language}" is not supported in browser sandboxes.`,
      exitCode: null,
      executionTimeMs: 0,
      status: "unsupported",
    };
  }

  const blob = new Blob([workerContent], { type: "application/javascript" });
  const workerUrl = URL.createObjectURL(blob);
  const worker = new Worker(workerUrl);

  let stdout = "";
  let stderr = "";
  let status: ExecutionStatus = "accepted";
  const startTime = performance.now();

  return new Promise<CodeExecutionResult>((resolve) => {
    const timer = setTimeout(() => {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      resolve({
        stdout,
        stderr: stderr + "\n[Execution timed out]",
        exitCode: null,
        executionTimeMs: timeLimitMs,
        status: "timeout",
      });
    }, timeLimitMs);

    worker.onmessage = (event) => {
      const msg = event.data;
      if (!msg || typeof msg !== "object") return;

      switch (msg.type) {
        case "stdout":
          stdout += msg.data;
          break;
        case "stderr":
          stderr += msg.data;
          break;
        case "output-limit":
          status = "output-limit";
          stderr += "\n[Output limit exceeded]";
          worker.terminate();
          clearTimeout(timer);
          URL.revokeObjectURL(workerUrl);
          resolve({
            stdout,
            stderr,
            exitCode: null,
            executionTimeMs: Math.round(performance.now() - startTime),
            status,
          });
          break;
        case "compile-error":
          status = "compile-error";
          stderr += msg.message;
          worker.terminate();
          clearTimeout(timer);
          URL.revokeObjectURL(workerUrl);
          resolve({
            stdout,
            stderr,
            exitCode: null,
            executionTimeMs: Math.round(performance.now() - startTime),
            status,
          });
          break;
        case "error":
          status = "runtime-error";
          stderr += msg.message;
          worker.terminate();
          clearTimeout(timer);
          URL.revokeObjectURL(workerUrl);
          resolve({
            stdout,
            stderr,
            exitCode: 1,
            executionTimeMs: Math.round(performance.now() - startTime),
            status,
          });
          break;
        case "exit":
          clearTimeout(timer);
          worker.terminate();
          URL.revokeObjectURL(workerUrl);
          resolve({
            stdout,
            stderr,
            exitCode: msg.code ?? 0,
            executionTimeMs: Math.round(performance.now() - startTime),
            status: status === "accepted" && (msg.code !== 0 && msg.code != null) ? "runtime-error" : status,
          });
          break;
      }
    };

    worker.onerror = (err) => {
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      resolve({
        stdout,
        stderr: stderr + `\nWorker Error: ${err.message}`,
        exitCode: 1,
        executionTimeMs: Math.round(performance.now() - startTime),
        status: "runtime-error",
      });
    };
  });
}
