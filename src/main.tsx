import React from "react";
import { createRoot } from "react-dom/client";
import { Root } from "./ui/Root";
import "./ui/styles.css";
import "@skbkontur/colors/tokens/brand-green_accent-gray.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
