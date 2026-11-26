import type { CSSProperties, ReactNode } from "react";

type Mark = {
  background: string;
  border: string;
  color: string;
  art: ReactNode;
};

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const SYSTEMS: Record<string, Mark> = {
  "@skbkontur/react-ui": {
    background: "#e9f6ef",
    border: "#cde8da",
    color: "#137a4d",
    art: (
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <path d="M7.5 5v14M8 12l7-7M8 12l7 7" {...stroke} />
      </svg>
    ),
  },
  antd: {
    background: "#edf3ff",
    border: "#d5e3ff",
    color: "#1668e3",
    art: (
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <path d="M12 8.5 5.5 19m6.5-10.5L18.5 19M8.5 15h7" {...stroke} />
        <circle cx="12" cy="5.3" r="1.4" fill="currentColor" />
      </svg>
    ),
  },
  "@mui/material": {
    background: "#eaf1ff",
    border: "#d2e0fb",
    color: "#0b5fd7",
    art: (
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <path d="M4.5 19V7.5l7.5 7 7.5-7V19" {...stroke} />
      </svg>
    ),
  },
  "@chakra-ui/react": {
    background: "#e8f7f5",
    border: "#c9ebe6",
    color: "#0d8582",
    art: (
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <path d="M17.8 7.7a7.2 7.2 0 1 0 .6 8.5" {...stroke} />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
      </svg>
    ),
  },
};

const FALLBACK: Mark = {
  background: "#f1f2f6",
  border: "#e1e3ea",
  color: "#636676",
  art: (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <rect x="5" y="5" width="14" height="14" rx="3" {...stroke} />
      <path d="M9 12h6M12 9v6" {...stroke} />
    </svg>
  ),
};

export function DesignSystemIcon({ system }: { system: string }) {
  const mark = SYSTEMS[system] ?? FALLBACK;
  const style = {
    "--ds-icon-bg": mark.background,
    "--ds-icon-border": mark.border,
    "--ds-icon-color": mark.color,
  } as CSSProperties;
  return (
    <span className="ds-icon" style={style} aria-hidden="true">
      {mark.art}
    </span>
  );
}
