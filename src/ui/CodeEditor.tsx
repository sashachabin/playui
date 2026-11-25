import libraryTypes from "virtual:library-types";
import { useEffect } from "react";
import Editor, { loader, type EditorProps } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/editor/editor.worker.js?worker";
import TypeScriptWorker from "monaco-editor/language/typescript/ts.worker.js?worker";
import JsonWorker from "monaco-editor/language/json/json.worker.js?worker";
import CssWorker from "monaco-editor/language/css/css.worker.js?worker";
import reactTypes from "../../node_modules/@types/react/index.d.ts?raw";
import reactGlobal from "../../node_modules/@types/react/global.d.ts?raw";
import jsxRuntime from "../../node_modules/@types/react/jsx-runtime.d.ts?raw";
import jsxDevRuntime from "../../node_modules/@types/react/jsx-dev-runtime.d.ts?raw";
import cssTypes from "../../node_modules/csstype/index.d.ts?raw";
import designSystemTypes from "../preview/design-system-types.d.ts?raw";

self.MonacoEnvironment = {
  getWorker(_moduleId, label) {
    if (label === "typescript" || label === "javascript") return new TypeScriptWorker();
    if (label === "json") return new JsonWorker();
    if (label === "css") return new CssWorker();
    return new EditorWorker();
  },
};

const { typescriptDefaults, JsxEmit, ModuleKind, ModuleResolutionKind, ScriptTarget } =
  monaco.typescript;

typescriptDefaults.setCompilerOptions({
  ...typescriptDefaults.getCompilerOptions(),
  jsx: JsxEmit.ReactJSX,
  module: ModuleKind.ESNext,
  moduleResolution: ModuleResolutionKind.NodeJs,
  target: ScriptTarget.ESNext,
  allowNonTsExtensions: true,
  strict: true,
  skipLibCheck: true,
  esModuleInterop: true,
  allowSyntheticDefaultImports: true,
});

typescriptDefaults.setExtraLibs([
  ...libraryTypes,
  {
    content: 'export * from "./es/index";',
    filePath: "file:///prototype/node_modules/antd/index.d.ts",
  },
  { content: reactTypes, filePath: "file:///prototype/node_modules/@types/react/index.d.ts" },
  { content: reactGlobal, filePath: "file:///prototype/node_modules/@types/react/global.d.ts" },
  { content: jsxRuntime, filePath: "file:///prototype/node_modules/@types/react/jsx-runtime.d.ts" },
  {
    content: jsxDevRuntime,
    filePath: "file:///prototype/node_modules/@types/react/jsx-dev-runtime.d.ts",
  },
  { content: cssTypes, filePath: "file:///prototype/node_modules/csstype/index.d.ts" },
  {
    content: designSystemTypes,
    filePath: "file:///prototype/design-system-types.d.ts",
  },
]);

loader.config({ monaco });
export default function CodeEditor({
  declarations,
  projectPath,
  ...props
}: EditorProps & {
  declarations: { name: string; value: string }[];
  projectPath: string;
}) {
  useEffect(() => {
    const subscriptions = declarations.map(({ name, value }) =>
      typescriptDefaults.addExtraLib(value, projectPath + "/" + name),
    );
    return () => subscriptions.forEach((subscription) => subscription.dispose());
  }, [declarations, projectPath]);

  return <Editor {...props} />;
}
