import "@fontsource-variable/inter";
import "./index.css";
import { createRoot } from "react-dom/client";
import { ScreenshotEditor } from "@/components/editor/screenshot-editor";

createRoot(document.getElementById("root")!).render(<ScreenshotEditor />);
