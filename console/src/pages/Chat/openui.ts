export interface MarkdownSegment {
  kind: "markdown";
  content: string;
}

export interface OpenUISegment {
  kind: "openui";
  content: string;
  closed: boolean;
}

export type RichTextSegment = MarkdownSegment | OpenUISegment;

const OPENUI_FENCE = "```openui";
const CLOSING_FENCE = "```";

function pushMarkdown(
  segments: RichTextSegment[],
  content: string,
): void {
  if (!content) return;
  segments.push({ kind: "markdown", content });
}

function normalizeOpenUIContent(content: string): string {
  return content.replace(/^\r?\n/, "").replace(/\r?\n$/, "");
}

export function containsOpenUIFence(content: string): boolean {
  return content.includes(OPENUI_FENCE);
}

export function parseOpenUISegments(content: string): RichTextSegment[] {
  if (!content) return [];

  const segments: RichTextSegment[] = [];
  let cursor = 0;

  while (cursor < content.length) {
    const openIdx = content.indexOf(OPENUI_FENCE, cursor);
    if (openIdx < 0) {
      pushMarkdown(segments, content.slice(cursor));
      break;
    }

    pushMarkdown(segments, content.slice(cursor, openIdx));

    let blockStart = openIdx + OPENUI_FENCE.length;
    while (
      blockStart < content.length &&
      content[blockStart] !== "\n" &&
      content[blockStart] !== "\r"
    ) {
      blockStart += 1;
    }
    if (blockStart < content.length) {
      if (
        content[blockStart] === "\r" &&
        content[blockStart + 1] === "\n"
      ) {
        blockStart += 2;
      } else {
        blockStart += 1;
      }
    }

    const closeIdx = content.indexOf(CLOSING_FENCE, blockStart);
    if (closeIdx < 0) {
      segments.push({
        kind: "openui",
        content: normalizeOpenUIContent(content.slice(blockStart)),
        closed: false,
      });
      break;
    }

    segments.push({
      kind: "openui",
      content: normalizeOpenUIContent(content.slice(blockStart, closeIdx)),
      closed: true,
    });
    cursor = closeIdx + CLOSING_FENCE.length;
  }

  return segments;
}
