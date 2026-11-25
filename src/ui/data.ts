import antdPackage from "antd/package.json";
import starterAntd from "../preview/antd.tsx?raw";
import starterKontur from "../preview/starter.tsx?raw";
import starterMui from "../preview/mui.tsx?raw";
import starterChakra from "../preview/chakra.tsx?raw";
import type { FileEntry, Page } from "./types";

export const initialFiles: FileEntry[] = [
  {
    name: "App.tsx",
    language: "typescript",
    value: starterKontur,
  },
  {
    name: "styles.css",
    language: "css",
    value: `:root { font-family: system-ui, sans-serif; color: #292929; background: #f0f0f0; }\n* { box-sizing: border-box; }\nbody { margin: 0; }\n.page { min-height: 100vh; display: grid; place-items: center; padding: 20px; background: radial-gradient(ellipse at 52% 42%, #fff 0%, #f7f7f7 54%, #ececec 100%); }\n.card { width: min(420px, 100%); padding: clamp(22px, 6vw, 40px); background: #fff; border: 1px solid #e8e8e8; box-shadow: 0 20px 80px #35353512; }\n.eyebrow { color: #666666; font: 600 10px monospace; letter-spacing: .12em; }\nh1 { margin: 18px 0 8px; font: 600 28px system-ui, sans-serif; letter-spacing: -.04em; }\np { color: #666666; font-size: 15px; margin: 0 0 30px; }\nlabel { display: block; color: #555555; font-size: 14px; margin: 16px 0 7px; }\n.card button { width: 100%; margin-top: 24px; }\nfooter { margin-top: 24px; padding-top: 18px; border-top: 1px solid #efefef; text-align: center; color: #666666; font-size: 14px; }\na { color: #4f4f4f; text-decoration: none; font-weight: 600; }\nfooter { display: flex; justify-content: center; gap: 14px; }\nform > button { margin-top: 18px; }\n[data-theme="dark"] .page { background: #1e2024; color: #efeff4; }\n[data-theme="dark"] .card { background: #282a30; border-color: #454751; }\n[data-theme="dark"] :is(label, a) { color: #dedee8; }`,
  },
  {
    name: "playui.config.json",
    language: "json",
    value: `{
  "name": "Northstar access flow",
  "designSystem": "@skbkontur/react-ui",
  "packages": {
    "@skbkontur/react-ui": "6.5.7",
    "@skbkontur/colors": "3.0.0"
  },
  "theme": "light",
  "locale": "en-US"
}`,
  },
];

export const DEFAULT_PAGES: Page[] = [
  { path: "/", label: "Home" },
  { path: "/login", label: "Sign in" },
  { path: "/forgot-password", label: "Reset password" },
  { path: "/done", label: "Success" },
];

export type ProjectTemplate = {
  name: string;
  route: string;
  system: string;
  systemLabel: string;
  description: string;
  packages: Record<string, string>;
  appSource: string;
};

const konturPackages = {
  "@skbkontur/react-ui": "6.5.7",
  "@skbkontur/colors": "3.0.0",
};

export const templates: ProjectTemplate[] = [
  {
    name: "Sign-up flow",
    route: "/",
    system: "@skbkontur/react-ui",
    systemLabel: "Kontur UI",
    description: "Account creation with email, password and a sign-in link.",
    packages: konturPackages,
    appSource: starterKontur,
  },
  {
    name: "Password reset",
    route: "/forgot-password",
    system: "@skbkontur/react-ui",
    systemLabel: "Kontur UI",
    description: "Request a reset link and continue the flow.",
    packages: konturPackages,
    appSource: starterKontur,
  },
  {
    name: "Ant Design sign-up",
    route: "/",
    system: "antd",
    systemLabel: "Ant Design",
    description: "The same sign-up flow built with Ant Design components.",
    packages: { antd: antdPackage.version },
    appSource: starterAntd,
  },
  {
    name: "MUI sign-up",
    route: "/",
    system: "@mui/material",
    systemLabel: "MUI",
    description: "Material UI form with stacked fields and contained buttons.",
    packages: { "@mui/material": "9.6.0" },
    appSource: starterMui,
  },
  {
    name: "Chakra sign-up",
    route: "/",
    system: "@chakra-ui/react",
    systemLabel: "Chakra UI",
    description: "Chakra form controls with an accessible VStack layout.",
    packages: { "@chakra-ui/react": "2.10.4" },
    appSource: starterChakra,
  },
];
