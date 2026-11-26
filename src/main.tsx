import React from "react";
import { createRoot } from "react-dom/client";
import { Root } from "./ui/Root";
import { applyColorTokens } from "./ui/ui-variant";
import "./ui/styles.css";
import "./ui/kontur/kontur.css";
import "@skbkontur/colors/tokens/brand-green_accent-gray.css";

applyColorTokens();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
