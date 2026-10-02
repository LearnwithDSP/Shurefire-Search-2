/**
 * Canonical substantive content cleaner.
 * Strips images, social sharing infrastructure, navigation boilerplate,
 * breadcrumbs, cookie notices, and tracking URLs while strictly preserving
 * substantive text, prices, measurements, specifications, tables, and provenance.
 */
export function cleanSubstantiveContent(raw?: string | null): string {
  if (!raw || typeof raw !== "string") return "";
  let text = raw;

  // 1. Strip HTML tags (including script, style, img, noscript, svg)
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
  text = text.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "");
  text = text.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "");
  text = text.replace(/<img\b[^>]*\/?>/gi, "");
  text = text.replace(/<[^>]+>/g, " ");

  // 2. Strip nested markdown image links [![...](...)](...) and multi-image links
  text = text.replace(/\[\s*(?:!\[.*?\]\(.*?\)\s*)+[^\]]*\]\([^)]*\)/g, "");
  // Standalone images: ![alt](url) and ![alt]
  text = text.replace(/!\[.*?\]\(.*?\)/g, "");
  text = text.replace(/!\[.*?\]/g, "");

  // 3. Remove social sharing links, buttons, and endpoints
  const socialPattern = /\[.*?\]\((?:https?:)?\/\/[^)]*(?:facebook\.com\/(?:sharer|share)|twitter\.com\/(?:intent|share)|x\.com\/(?:intent|post)|pinterest\.com\/pin|linkedin\.com\/shareArticle|api\.whatsapp\.com|wa\.me|t\.me\/share|tumblr\.com\/share|share\.flipboard\.com|reddit\.com\/submit|threads\.net\/intent|mailto:)[^)]*\)/gi;
  text = text.replace(socialPattern, "");

  // Remove bare social share URLs if any survive
  text = text.replace(/https?:\/\/(?:www\.)?(?:facebook\.com\/(?:sharer|share)|twitter\.com\/(?:intent|share)|x\.com\/(?:intent|post)|pinterest\.com\/pin|linkedin\.com\/shareArticle|api\.whatsapp\.com|wa\.me|t\.me\/share|tumblr\.com\/share|share\.flipboard\.com)[^\s)\"]*/gi, "");
  text = text.replace(/mailto:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, "");

  // 4. Remove empty markdown links/images: [](), [], ()
  text = text.replace(/\[\s*\]\([^)]*\)/g, "");
  text = text.replace(/\[\s*\]\(\s*\)/g, "");

  // 5. Remove clusters of tool/navigation links (e.g. 3 or more consecutive markdown links)
  text = text.replace(/(?:\[[^\]]{1,80}\]\(https?:\/\/[^\)]+\)\s*){3,}/gi, " ");

  // 6. Handle author link right before heading or title: [Author Name](.../author/...) -> **Author Name**
  text = text.replace(/\[([^\]]+)\]\([^)]*\/author\/[^)]*\)/gi, "\n\n**$1**\n\n");

  // 7. Handle pre-heading boilerplate: if there is a main heading (# Title or ## Title)
  // in the first 2500 chars preceded by navigation links or breadcrumbs, slice to the heading
  // but preserve author provenance
  let authorTag = "";
  const authorMatch = text.match(/\*\*([A-Za-z0-9\s'._-]+)\*\*/);
  if (authorMatch && text.indexOf(authorMatch[0]) < 2500) {
    authorTag = authorMatch[0];
  }

  const headingMatch = text.search(/(?:^|\n)#+\s+[^\n]+/);
  if (headingMatch >= 0 && headingMatch < 2500) {
    const preText = text.slice(0, headingMatch);
    if (preText.includes("http") || preText.includes("[Home]") || preText.includes("Home /") || preText.length < 500) {
      text = text.slice(headingMatch).trimStart();
      if (authorTag && !text.includes(authorTag)) {
        const firstLineEnd = text.indexOf("\n");
        if (firstLineEnd > 0) {
          text = text.slice(0, firstLineEnd) + "\n\n" + authorTag + "\n\n" + text.slice(firstLineEnd + 1);
        }
      }
    }
  }

  // 8. Remove author UI artifacts like "Updated 6 months Ago 6.3k", "Share", "Read more"
  text = text.replace(/\bUpdated\s+\d+\s+(?:days?|weeks?|months?|years?)\s+ago\b/gi, "");
  text = text.replace(/\b\d+(?:\.\d+)?k\b(?=\s*(?:Share|\n|$))/gi, "");
  text = text.replace(/^\s*Share\s*$/gim, "");
  text = text.replace(/\bShare\b(?=\s*\n|$)/g, "");

  // 9. Remove breadcrumbs like "Home / Blog / Article" or "[Home] > [Category] > Article"
  text = text.replace(/^(?:Home|Blog|News|Categories)\s*[\/>»]\s*[^\n]+/gim, "");
  text = text.replace(/\[(?:Home|Blog|News|Categories)\]\([^)]*\)\s*[\/>»]\s*[^\n]+/gim, "");

  // 10. Remove navigation labels appearing as standalone lines
  text = text.replace(/^(?:Menu|Navigation|Search|Categories|Recent Posts|Leave a Comment|Cancel reply|Comments|Previous|Next)\s*$/gim, "");

  // 11. Remove cookie banners and consent notices
  text = text.replace(/(?:we use cookies|cookie policy|privacy policy|allow cookies|accept all cookies|decline)[^\n]*/gi, "");

  // 12. Convert all remaining normal markdown links [Text](url) -> Text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // 13. Remove tracking parameters from any remaining URLs
  text = text.replace(/([?&])(?:utm_[a-z]+|fbclid|gclid|ref|source)=[^&\s)]+/gi, "");

  // 14. Remove orphaned brackets or parentheses
  text = text.replace(/\[\s*\]/g, "");
  text = text.replace(/\(\s*\)/g, "");

  // 15. Normalize whitespace
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n\s*\n\s*\n+/g, "\n\n").trim();

  return text;
}

export default cleanSubstantiveContent;
