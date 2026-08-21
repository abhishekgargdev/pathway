"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import { useCallback } from "react";

import { cn } from "@/lib/utils";

const PATHWAY_THEME = "pathway-dark";

type MonacoEditorProps = {
  language: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  height?: string | number;
};

export function MonacoCodeEditor({
  language,
  value,
  onChange,
  className,
  height = "100%",
}: MonacoEditorProps) {
  const handleMount: OnMount = useCallback((editor, monaco) => {
    monaco.editor.defineTheme(PATHWAY_THEME, {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "8B93B0", fontStyle: "italic" },
        { token: "string", foreground: "5EEAD4" },
        { token: "number", foreground: "FBBF24" },
        { token: "keyword", foreground: "8B7CF6" },
      ],
      colors: {
        "editor.background": "#0A0D1A",
        "editor.foreground": "#EDEFF7",
        "editorLineNumber.foreground": "#4A5268",
        "editorLineNumber.activeForeground": "#8B93B0",
        "editor.selectionBackground": "#5EEAD433",
        "editor.inactiveSelectionBackground": "#5EEAD422",
        "editorCursor.foreground": "#5EEAD4",
        "editor.lineHighlightBackground": "#1F244066",
        "editorIndentGuide.background": "#1A1F35",
        "editorIndentGuide.activeBackground": "#2A2F4A",
        "scrollbarSlider.background": "#2A2F4A88",
        "scrollbarSlider.hoverBackground": "#8B93B066",
        "editorWidget.background": "#171B2E",
        "editorWidget.border": "#2A2F4A",
      },
    });
    monaco.editor.setTheme(PATHWAY_THEME);
    editor.focus();
  }, []);

  return (
    <div
      className={cn(
        "min-h-[220px] overflow-hidden rounded-b-2xl bg-[#0A0D1A]",
        className,
      )}
    >
      <Editor
        height={height}
        language={language}
        value={value}
        theme={PATHWAY_THEME}
        onMount={handleMount}
        onChange={(v) => onChange(v ?? "")}
        loading={
          <div className="flex h-full min-h-[220px] items-center justify-center bg-[#0A0D1A] text-sm text-[#8B93B0]">
            Loading editor…
          </div>
        }
        options={{
          fontFamily: "JetBrains Mono, ui-monospace, monospace",
          fontSize: 13,
          lineHeight: 21,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          padding: { top: 14, bottom: 14 },
          renderLineHighlight: "line",
          tabSize: 2,
          automaticLayout: true,
          wordWrap: "on",
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
        }}
      />
    </div>
  );
}
