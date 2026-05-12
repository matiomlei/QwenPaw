import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { parseOpenUISegments } from "./openui";
import { OpenUIMessageContent } from "./components/OpenUIMessageContent";

vi.mock("@agentscope-ai/chat", () => ({
  Markdown: ({
    content,
    cursor,
  }: {
    content?: string;
    cursor?: boolean;
  }) => (
    <div data-testid={cursor ? "markdown-cursor" : "markdown"}>
      {content}
    </div>
  ),
}));

vi.mock("@openuidev/react-lang", () => ({
  Renderer: ({
    response,
    isStreaming,
  }: {
    response: string;
    isStreaming?: boolean;
  }) => (
    <div data-testid="openui-renderer">
      {response}
      {isStreaming ? " [streaming]" : ""}
    </div>
  ),
}));

vi.mock("@openuidev/react-ui", () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@openuidev/react-ui/genui-lib", () => ({
  openuiLibrary: {},
}));

vi.mock("@openuidev/react-ui/components.css?inline", () => ({
  default: "",
}));

vi.mock("./components/OpenUIMessageContent/preview-shadow.css?inline", () => ({
  default: "",
}));

vi.mock("../../contexts/ThemeContext", () => ({
  useTheme: () => ({ isDark: false }),
}));

describe("parseOpenUISegments", () => {
  it("keeps plain markdown as a single segment", () => {
    expect(parseOpenUISegments("hello world")).toEqual([
      { kind: "markdown", content: "hello world" },
    ]);
  });

  it("splits markdown and openui blocks in order", () => {
    expect(
      parseOpenUISegments(
        "before\n```openui\nroot = Card([title])\n```\nafter",
      ),
    ).toEqual([
      { kind: "markdown", content: "before\n" },
      {
        kind: "openui",
        content: "root = Card([title])",
        closed: true,
      },
      { kind: "markdown", content: "\nafter" },
    ]);
  });

  it("marks unfinished openui fences as open segments", () => {
    expect(
      parseOpenUISegments("prefix\n```openui\nroot = Card([step])"),
    ).toEqual([
      { kind: "markdown", content: "prefix\n" },
      {
        kind: "openui",
        content: "root = Card([step])",
        closed: false,
      },
    ]);
  });
});

describe("OpenUIMessageContent", () => {
  it("renders mixed markdown and openui content", () => {
    render(
      <OpenUIMessageContent
        content={"intro\n```openui\nroot = Card([chart])\n```\noutro"}
      />,
    );

    expect(screen.getByText((text) => text.includes("intro"))).toBeInTheDocument();
    expect(screen.getByTestId("openui-renderer")).toHaveTextContent(
      "root = Card([chart])",
    );
    expect(screen.getByText((text) => text.includes("outro"))).toBeInTheDocument();
  });

  it("passes streaming state through unfinished openui blocks", () => {
    render(
      <OpenUIMessageContent
        content={"```openui\nroot = Card([steps])"}
        isStreaming
      />,
    );

    expect(screen.getByTestId("openui-renderer")).toHaveTextContent(
      "[streaming]",
    );
  });

  it("renders a preview panel and opens a modal preview", () => {
    render(
      <OpenUIMessageContent
        content={"```openui\nroot = Card([chart])\n```"}
      />,
    );

    expect(screen.getByTestId("openui-preview-panel")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Open fullscreen preview"));

    const modalHost = document.body.querySelector(
      "[data-openui-preview-modal='true']",
    ) as HTMLDivElement | null;

    expect(modalHost?.shadowRoot).toBeTruthy();
    expect(
      modalHost?.shadowRoot?.querySelector('[aria-label="Close preview"]'),
    ).toBeTruthy();
  });

  it("closes the modal preview on escape", () => {
    render(
      <OpenUIMessageContent
        content={"```openui\nroot = Card([chart])\n```"}
      />,
    );

    fireEvent.click(screen.getByLabelText("Open fullscreen preview"));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(
      document.body.querySelector("[data-openui-preview-modal='true']"),
    ).toBeNull();
  });
});
