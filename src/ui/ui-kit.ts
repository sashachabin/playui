import { ChatPanel } from "./components/ChatPanel";
import { CommandPalette } from "./components/CommandPalette";
import { EditorPane } from "./components/EditorPane";
import { FileManagerDialog } from "./components/FileManagerDialog";
import { FileSettingsDialog } from "./components/FileSettingsDialog";
import { Header } from "./components/Header";
import { HomeScreen } from "./components/HomeScreen";
import { NewFileDialog } from "./components/NewFileDialog";
import { NewPrototypeDialog } from "./components/NewPrototypeDialog";
import { PreviewCanvas } from "./components/PreviewCanvas";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { ShareToast } from "./components/ShareToast";
import { ShortcutsDialog } from "./components/ShortcutsDialog";
import { SharedView } from "./SharedView";
import { KonturChatPanel } from "./kontur/KonturChatPanel";
import { KonturCommandPalette } from "./kontur/KonturCommandPalette";
import { KonturEditorPane } from "./kontur/KonturEditorPane";
import { KonturFileManagerDialog } from "./kontur/KonturFileManagerDialog";
import { KonturFileSettingsDialog } from "./kontur/KonturFileSettingsDialog";
import { KonturHeader } from "./kontur/KonturHeader";
import { KonturHomeScreen } from "./kontur/KonturHomeScreen";
import { KonturNewFileDialog } from "./kontur/KonturNewFileDialog";
import { KonturNewPrototypeDialog } from "./kontur/KonturNewPrototypeDialog";
import { KonturPreviewCanvas } from "./kontur/KonturPreviewCanvas";
import { KonturProjectSidebar } from "./kontur/KonturProjectSidebar";
import { KonturSharedView } from "./kontur/KonturSharedView";
import { KonturShareToast } from "./kontur/KonturShareToast";
import { KonturShortcutsDialog } from "./kontur/KonturShortcutsDialog";
import { isKonturUi } from "./ui-variant";

export { isKonturUi } from "./ui-variant";

export const classicKit = {
  Header,
  HomeScreen,
  ProjectSidebar,
  ChatPanel,
  PreviewCanvas,
  EditorPane,
  CommandPalette,
  NewPrototypeDialog,
  FileManagerDialog,
  NewFileDialog,
  FileSettingsDialog,
  ShortcutsDialog,
  ShareToast,
  SharedView,
};

export type UiKit = typeof classicKit;

export const konturKit: UiKit = {
  Header: KonturHeader,
  HomeScreen: KonturHomeScreen,
  ProjectSidebar: KonturProjectSidebar,
  ChatPanel: KonturChatPanel,
  PreviewCanvas: KonturPreviewCanvas,
  EditorPane: KonturEditorPane,
  CommandPalette: KonturCommandPalette,
  NewPrototypeDialog: KonturNewPrototypeDialog,
  FileManagerDialog: KonturFileManagerDialog,
  NewFileDialog: KonturNewFileDialog,
  FileSettingsDialog: KonturFileSettingsDialog,
  ShortcutsDialog: KonturShortcutsDialog,
  ShareToast: KonturShareToast,
  SharedView: KonturSharedView,
};

export function getUiKit(): UiKit {
  return isKonturUi() ? konturKit : classicKit;
}
