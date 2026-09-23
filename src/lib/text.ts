// Strip markdown so model output is always clean plain text (WhatsApp, paste-ready updates).
export function stripMarkdown(s: string, opts: { keepEmDash?: boolean } = {}): string {
  const out = s
    .replace(/\*\*(.+?)\*\*/g, "$1")                // **bold**
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1$2")    // *italic* (not bullet stars)
    .replace(/`{1,3}([^`]+)`{1,3}/g, "$1")          // `code`
    .replace(/^#{1,6}\s+/gm, "")                    // # headers
    .replace(/^\s*[-*]{3,}\s*$/gm, "")              // --- / *** horizontal rules
    .replace(/\n{3,}/g, "\n\n")                     // collapse extra blank lines
    .trim();
  return opts.keepEmDash ? out : out.replace(/—/g, ","); // em dash → comma (house style)
}
