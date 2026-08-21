import { useState } from "react";
import PathwayLogo from "../components/PathwayLogo";

export default function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSuccess();
    }, 900);
  };

  const inputStyle = (field: string) => ({
    background: "#1F2440",
    border: `1px solid ${focused === field ? "#5EEAD4" : "#2A2F4A"}`,
    borderRadius: "12px",
    color: "#EDEFF7",
    fontFamily: "Inter, sans-serif",
    fontSize: "15px",
    padding: "14px 16px",
    width: "100%",
    outline: "none",
    boxShadow: focused === field ? "0 0 0 3px rgba(94,234,212,0.15)" : "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  });

  return (
    <div
      className="h-full flex flex-col items-center justify-center px-6"
      style={{ background: "#0E1220" }}
    >
      <div className="w-full max-w-sm animate-slide-up">
        <div className="flex flex-col items-center mb-10">
          <PathwayLogo size={44} />
          <h1
            className="mt-3"
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: "26px",
              fontWeight: 700,
              color: "#EDEFF7",
            }}
          >
            Welcome back
          </h1>
          <p style={{ color: "#8B93B0", fontSize: "14px", marginTop: "4px" }}>
            Sign in to continue your path
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              style={{
                color: "#8B93B0",
                fontSize: "12px",
                fontWeight: 500,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                display: "block",
                marginBottom: "8px",
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused(null)}
              placeholder="alex@example.com"
              style={inputStyle("email")}
              required
            />
          </div>

          <div>
            <label
              style={{
                color: "#8B93B0",
                fontSize: "12px",
                fontWeight: 500,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                display: "block",
                marginBottom: "8px",
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocused("password")}
              onBlur={() => setFocused(null)}
              placeholder="••••••••"
              style={inputStyle("password")}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95"
            style={{
              background: loading ? "#2A2F4A" : "#5EEAD4",
              color: loading ? "#8B93B0" : "#0E1220",
              fontFamily: "Inter, sans-serif",
              fontSize: "15px",
              border: "none",
              cursor: loading ? "default" : "pointer",
              boxShadow: loading ? "none" : "0 0 24px rgba(94,234,212,0.25)",
              transition: "all 0.2s",
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
