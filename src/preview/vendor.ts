import * as React from "react";
import * as ReactDOM from "react-dom";
import * as ReactDOMClient from "react-dom/client";
import * as JSX from "react/jsx-runtime";
import * as Kontur from "@skbkontur/react-ui";
import * as AntDesign from "antd";
import "@skbkontur/colors/tokens/brand-green_accent-gray.css";

Object.assign(globalThis, {
  playuiModules: {
    react: React,
    "react-dom": ReactDOM,
    "react-dom/client": ReactDOMClient,
    "react/jsx-runtime": JSX,
    "@skbkontur/react-ui": Kontur,
    antd: AntDesign,
  },
});
