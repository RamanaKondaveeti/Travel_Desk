import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Eraser,
  Italic,
  Link2,
  List,
  ListOrdered,
  Redo2,
  Unlink2,
  Underline,
  Undo2,
} from "lucide-react";
import "./BusVocherSettings.css";

const VOUCHER_STORAGE_KEY = "admin_voucher_setting_html";
const FALLBACK_TEMPLATE = "";
const LEGACY_TEMPLATE =
  "<p><strong>Voucher Terms & Conditions</strong></p><p>Write your voucher content here.</p>";

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isLegacyOrPlaceholderContent(value) {
  const normalized = stripHtml(value);
  if (!normalized) {
    return true;
  }

  return (
    normalized.includes("voucher terms & conditions") ||
    normalized.includes("write your voucher content here")
  );
}

const FONT_OPTIONS = [
  "Arial",
  "Georgia",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
];

const SIZE_OPTIONS = [
  { label: "Small", value: "2" },
  { label: "Normal", value: "3" },
  { label: "Large", value: "4" },
  { label: "XL", value: "5" },
];

function readVoucherTemplate() {
  if (typeof window === "undefined") {
    return FALLBACK_TEMPLATE;
  }

  const savedValue = String(window.localStorage.getItem(VOUCHER_STORAGE_KEY) || "").trim();
  if (
    !savedValue ||
    savedValue === LEGACY_TEMPLATE ||
    isLegacyOrPlaceholderContent(savedValue)
  ) {
    window.localStorage.removeItem(VOUCHER_STORAGE_KEY);
    return FALLBACK_TEMPLATE;
  }
  return savedValue || FALLBACK_TEMPLATE;
}

function buildSelectionPath(editorElement) {
  if (typeof window === "undefined" || !editorElement) {
    return "body";
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return "body";
  }

  const anchorNode = selection.anchorNode;
  if (!anchorNode || !editorElement.contains(anchorNode)) {
    return "body";
  }

  const path = ["body"];
  let currentNode =
    anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode;

  while (currentNode && currentNode !== editorElement) {
    path.push(String(currentNode.nodeName || "").toLowerCase());
    currentNode = currentNode.parentElement;
  }

  return path.filter(Boolean).join(" ");
}

export default function AdminVoucherSettingPage() {
  const editorRef = useRef(null);
  const [editorHtml, setEditorHtml] = useState(() => readVoucherTemplate());
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [selectionPath, setSelectionPath] = useState("body");
  const [savedMessage, setSavedMessage] = useState("");
  const [fontName, setFontName] = useState("Arial");
  const [fontSize, setFontSize] = useState("3");
  const [fontColor, setFontColor] = useState("#2c0b0b");
  const [highlightColor, setHighlightColor] = useState("#fff5f5");

  useEffect(() => {
    if (isSourceMode || !editorRef.current) {
      return;
    }

    if (editorRef.current.innerHTML !== editorHtml) {
      editorRef.current.innerHTML = editorHtml;
    }
  }, [editorHtml, isSourceMode]);

  const updateSelection = () => {
    setSelectionPath(buildSelectionPath(editorRef.current));
  };

  const syncHtmlFromEditor = () => {
    if (!editorRef.current) {
      return "";
    }

    const nextHtml = editorRef.current.innerHTML || "";
    setEditorHtml(nextHtml);
    return nextHtml;
  };

  const toggleSourceMode = () => {
    if (!isSourceMode) {
      syncHtmlFromEditor();
    }

    setIsSourceMode((current) => !current);
  };

  const applyCommand = (command, value = null) => {
    if (isSourceMode) {
      return;
    }

    if (!editorRef.current) {
      return;
    }

    editorRef.current.focus();
    if (command === "foreColor" || command === "hiliteColor") {
      document.execCommand("styleWithCSS", false, true);
    }
    document.execCommand(command, false, value);
    syncHtmlFromEditor();
    updateSelection();
    setSavedMessage("");
  };

  const applyLink = () => {
    const urlInput = window.prompt("Enter link URL", "https://");
    if (!urlInput) {
      return;
    }
    applyCommand("createLink", urlInput.trim());
  };

  const handleFontNameChange = (nextFontName) => {
    setFontName(nextFontName);
    applyCommand("fontName", nextFontName);
  };

  const handleFontSizeChange = (nextFontSize) => {
    setFontSize(nextFontSize);
    applyCommand("fontSize", nextFontSize);
  };

  const handleFontColorChange = (nextColor) => {
    setFontColor(nextColor);
    applyCommand("foreColor", nextColor);
  };

  const handleHighlightChange = (nextColor) => {
    setHighlightColor(nextColor);
    applyCommand("hiliteColor", nextColor);
  };

  const handleFormatChange = (nextFormat) => {
    if (!nextFormat) {
      return;
    }
    applyCommand("formatBlock", nextFormat);
  };

  const handleEditorInput = () => {
    syncHtmlFromEditor();
    updateSelection();
    setSavedMessage("");
  };

  const handleClearContent = () => {
    if (isSourceMode) {
      setEditorHtml("");
      setSavedMessage("");
      return;
    }

    if (!editorRef.current) {
      return;
    }

    editorRef.current.innerHTML = "";
    setEditorHtml("");
    setSelectionPath("body");
    setSavedMessage("");
  };

  const handleSave = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(VOUCHER_STORAGE_KEY, editorHtml);
    }

    const timeLabel = new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    setSavedMessage(`Voucher setting updated on ${timeLabel}`);
  };

  const toolbarButtons = useMemo(
    () => [
      { key: "bold", label: "Bold", icon: Bold, command: "bold" },
      { key: "italic", label: "Italic", icon: Italic, command: "italic" },
      { key: "underline", label: "Underline", icon: Underline, command: "underline" },
      { key: "ordered", label: "Number List", icon: ListOrdered, command: "insertOrderedList" },
      { key: "unordered", label: "Bullet List", icon: List, command: "insertUnorderedList" },
      { key: "left", label: "Align Left", icon: AlignLeft, command: "justifyLeft" },
      { key: "center", label: "Align Center", icon: AlignCenter, command: "justifyCenter" },
      { key: "right", label: "Align Right", icon: AlignRight, command: "justifyRight" },
      { key: "undo", label: "Undo", icon: Undo2, command: "undo" },
      { key: "redo", label: "Redo", icon: Redo2, command: "redo" },
    ],
    []
  );

  return (
    <section className="admin-b2c-page admin-voucher-page">
      <header className="admin-b2c-header admin-voucher-header">
        <h1>Update Voucher Setting</h1>
      </header>

      <section className="admin-voucher-editor-shell">
        <div className="admin-voucher-toolbar">
          <button
            type="button"
            className={`admin-voucher-tool-btn source ${isSourceMode ? "active" : ""}`}
            onClick={toggleSourceMode}
            title="Toggle source"
          >
            <Code2 size={16} />
            Source
          </button>

          <button
            type="button"
            className="admin-voucher-tool-btn"
            onClick={applyLink}
            title="Insert link"
          >
            <Link2 size={16} />
          </button>
          <button
            type="button"
            className="admin-voucher-tool-btn"
            onClick={() => applyCommand("unlink")}
            title="Remove link"
          >
            <Unlink2 size={16} />
          </button>

          {toolbarButtons.map((button) => {
            const Icon = button.icon;
            return (
              <button
                key={button.key}
                type="button"
                className="admin-voucher-tool-btn"
                onClick={() => applyCommand(button.command)}
                title={button.label}
              >
                <Icon size={16} />
              </button>
            );
          })}

          <button
            type="button"
            className="admin-voucher-tool-btn"
            onClick={handleClearContent}
            title="Clear content"
          >
            <Eraser size={16} />
          </button>
        </div>

        <div className="admin-voucher-toolbar admin-voucher-toolbar-secondary">
          <select
            value=""
            onChange={(event) => {
              handleFormatChange(event.target.value);
              event.target.value = "";
            }}
            className="admin-voucher-select"
            title="Paragraph style"
          >
            <option value="">Styles</option>
            <option value="p">Normal</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="blockquote">Quote</option>
          </select>

          <select
            value={fontName}
            onChange={(event) => handleFontNameChange(event.target.value)}
            className="admin-voucher-select"
            title="Font"
          >
            {FONT_OPTIONS.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>

          <select
            value={fontSize}
            onChange={(event) => handleFontSizeChange(event.target.value)}
            className="admin-voucher-select"
            title="Size"
          >
            {SIZE_OPTIONS.map((size) => (
              <option key={size.value} value={size.value}>
                {size.label}
              </option>
            ))}
          </select>

          <label className="admin-voucher-color-wrap">
            <span>Text</span>
            <input
              type="color"
              value={fontColor}
              onChange={(event) => handleFontColorChange(event.target.value)}
              title="Text color"
            />
          </label>

          <label className="admin-voucher-color-wrap">
            <span>Highlight</span>
            <input
              type="color"
              value={highlightColor}
              onChange={(event) => handleHighlightChange(event.target.value)}
              title="Highlight color"
            />
          </label>
        </div>

        <div className="admin-voucher-editor-wrap">
          {isSourceMode ? (
            <textarea
              className="admin-voucher-source"
              value={editorHtml}
              placeholder="Write voucher content here..."
              onChange={(event) => {
                setEditorHtml(event.target.value);
                setSavedMessage("");
              }}
            />
          ) : (
            <div
              ref={editorRef}
              className="admin-voucher-editor"
              data-placeholder="Write voucher content here..."
              contentEditable
              suppressContentEditableWarning
              onInput={handleEditorInput}
              onKeyUp={updateSelection}
              onMouseUp={updateSelection}
              onFocus={updateSelection}
            />
          )}
        </div>

        <footer className="admin-voucher-footer">
          <span>{selectionPath}</span>
        </footer>
      </section>

      {savedMessage ? <p className="admin-voucher-success">{savedMessage}</p> : null}

      <div className="admin-voucher-actions">
        <button type="button" className="admin-voucher-update-btn" onClick={handleSave}>
          Update
        </button>
      </div>
    </section>
  );
}

