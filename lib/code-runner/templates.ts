export function getJsWorkerTemplate(code: string, stdin: string, outputLimit: number): string {
  return `
    (function() {
      const stdinData = ${JSON.stringify(stdin)};
      const outputLimit = ${outputLimit};
      let outputBytes = 0;
      let outputBuffer = "";
      
      const originalLog = console.log;
      const originalError = console.error;
      
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
                // If last line is empty and stdin ends with newline, ignore it to prevent extra empty loop
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
        // Execute student code
        ${code}
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
}

export function getPyWorkerTemplate(code: string, stdin: string, outputLimit: number): string {
  // Python execution template wrapper
  return `
import sys
import io
import builtins

stdin_data = ${JSON.stringify(stdin)}
output_limit = ${outputLimit}
output_bytes = 0

# Override stdin
sys.stdin = io.StringIO(stdin_data)

stdin_lines = stdin_data.split('\\n')
if len(stdin_lines) > 1 and stdin_lines[-1] == '':
    stdin_lines.pop()

stdin_idx = 0

def mock_input(prompt=""):
    global stdin_idx
    if stdin_idx < len(stdin_lines):
        val = stdin_lines[stdin_idx]
        stdin_idx += 1
        return val
    raise EOFError("EOF when reading a line")

builtins.input = mock_input

class LimitOutputWriter:
    def __init__(self, original_stream, type_name):
        self.original = original_stream
        self.type_name = type_name
        
    def write(self, data):
        global output_bytes
        if not data:
            return
        output_bytes += len(data)
        if output_bytes > output_limit:
            # We raise custom exception to terminate Pyodide
            raise Exception("OutputLimitExceeded")
        # Send message back to JS worker
        import js
        js.postMessage(js.Object.fromEntries([("type", self.type_name), ("data", data)]))
        
    def flush(self):
        pass

sys.stdout = LimitOutputWriter(sys.stdout, "stdout")
sys.stderr = LimitOutputWriter(sys.stderr, "stderr")

# Run actual code
try:
    exec(${JSON.stringify(code)}, {})
except Exception as e:
    if str(e) == "OutputLimitExceeded":
        pass
    else:
        raise e
`;
}
