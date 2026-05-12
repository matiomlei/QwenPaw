import { Component, memo, useEffect, useMemo, useState } from "react";
import { Markdown } from "@agentscope-ai/chat";
import { Renderer } from "@openuidev/react-lang";
import {
  ThemeProvider as OpenUIThemeProvider,
} from "@openuidev/react-ui";
import { openuiLibrary } from "@openuidev/react-ui/genui-lib";
import openuiComponentsCss from "@openuidev/react-ui/components.css?inline";
import { Loader2, Maximize2, X } from "lucide-react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { useTheme } from "../../../../contexts/ThemeContext";
import { mermaidComponents } from "../../../../components/MermaidCodeBlock";
import { containsOpenUIFence, parseOpenUISegments } from "../../openui";
import shadowCssText from "./preview-shadow.css?inline";
import styles from "./index.module.less";

class OpenUIErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: ReactNode; children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: { children: ReactNode }) {
    if (prevProps.children !== this.props.children && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function OpenUIRendererSurface({
  content,
  isStreaming,
  className,
}: {
  content: string;
  isStreaming: boolean;
  className: string;
}) {
  return (
    <div className={className}>
      <Renderer
        response={content}
        library={openuiLibrary}
        isStreaming={isStreaming}
      />
    </div>
  );
}

function useShadowPortal(open: boolean) {
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      setMountNode(null);
      return;
    }

    const host = document.createElement("div");
    host.setAttribute("data-openui-preview-modal", "true");
    const shadowRoot = host.attachShadow({ mode: "open" });
    const mount = document.createElement("div");
    shadowRoot.appendChild(mount);
    document.body.appendChild(host);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setMountNode(mount);

    return () => {
      document.body.style.overflow = previousOverflow;
      host.remove();
      setMountNode(null);
    };
  }, [open]);

  return mountNode;
}

function OpenUIPreviewModal({
  open,
  content,
  isStreaming,
  mode,
  onClose,
}: {
  open: boolean;
  content: string;
  isStreaming: boolean;
  mode: "light" | "dark";
  onClose: () => void;
}) {
  const mountNode = useShadowPortal(open);

  useEffect(() => {
    if (!open) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open || !mountNode) return null;

  return createPortal(
    <OpenUIThemeProvider mode={mode}>
      <style>{openuiComponentsCss}</style>
      <style>{shadowCssText}</style>
      <div className="openui-preview-root" data-theme={mode}>
        <div className="modal-overlay" onClick={onClose}>
          <div
            className="modal-container"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-container-header">
              <div className="panel-title-group">
                <span className="panel-title">Preview</span>
                {isStreaming && (
                  <Loader2 size={14} className="preview-spinner" />
                )}
              </div>
              <button
                className="panel-icon-btn"
                onClick={onClose}
                title="Close"
                aria-label="Close preview"
                type="button"
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-container-body">
              <div className="preview-body">
                <div className="preview-content">
                  <OpenUIRendererSurface
                    content={content}
                    isStreaming={isStreaming}
                    className="openui-preview-surface"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </OpenUIThemeProvider>,
    mountNode,
  );
}

function OpenUIPreviewPanel({
  content,
  isStreaming,
}: {
  content: string;
  isStreaming: boolean;
}) {
  const { isDark } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const mode = isDark ? "dark" : "light";

  return (
    <>
      <div className={styles.openuiBlock} data-testid="openui-block">
        <OpenUIThemeProvider mode={mode}>
          <div className={styles.previewPanel} data-testid="openui-preview-panel">
            <div className={styles.panelHeader}>
              <div className={styles.panelTitleGroup}>
                <span className={styles.panelTitle}>Preview</span>
                {isStreaming && (
                  <Loader2 size={14} className={styles.previewSpinner} />
                )}
              </div>
              <button
                className={styles.panelIconButton}
                onClick={() => setIsModalOpen(true)}
                title="Open fullscreen preview"
                aria-label="Open fullscreen preview"
                type="button"
              >
                <Maximize2 size={14} />
              </button>
            </div>
            <div className={styles.previewBody}>
              <div className={styles.previewContent}>
                <OpenUIRendererSurface
                  content={content}
                  isStreaming={isStreaming}
                  className={styles.previewSurface}
                />
              </div>
            </div>
          </div>
        </OpenUIThemeProvider>
      </div>
      <OpenUIPreviewModal
        open={isModalOpen}
        content={content}
        isStreaming={isStreaming}
        mode={mode}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

function OpenUIBlock({
  content,
  isStreaming,
  closed,
}: {
  content: string;
  isStreaming: boolean;
  closed: boolean;
}) {
  const fallbackMarkdown = `\`\`\`openui\n${content}\n\`\`\``;

  return (
    <OpenUIErrorBoundary
      fallback={
        <div className={styles.openuiFallback}>
          <Markdown
            content={fallbackMarkdown}
            components={mermaidComponents}
          />
        </div>
      }
    >
      <OpenUIPreviewPanel
        content={content}
        isStreaming={isStreaming || !closed}
      />
    </OpenUIErrorBoundary>
  );
}

function OpenUIMessageContentInner({
  content,
  isStreaming = false,
}: {
  content: string;
  isStreaming?: boolean;
}) {
  const segments = useMemo(() => parseOpenUISegments(content), [content]);

  if (!containsOpenUIFence(content)) {
    return (
      <Markdown
        content={content}
        cursor={isStreaming}
        components={mermaidComponents}
      />
    );
  }

  return (
    <div className={styles.messageContent}>
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        if (segment.kind === "markdown") {
          return (
            <Markdown
              key={`md-${index}`}
              content={segment.content}
              cursor={isStreaming && isLast ? true : false}
              components={mermaidComponents}
            />
          );
        }
        return (
          <OpenUIBlock
            key={`openui-${index}`}
            content={segment.content}
            isStreaming={isStreaming && isLast}
            closed={segment.closed}
          />
        );
      })}
    </div>
  );
}

export const OpenUIMessageContent = memo(OpenUIMessageContentInner);
