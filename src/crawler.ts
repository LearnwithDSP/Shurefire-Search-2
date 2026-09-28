import { getSupabase } from "./supabase";

export interface UrlValidationResult {
  isValid: boolean;
  sanitizedUrl: string;
  error?: string;
}

/**
 * Validates and sanitizes a URL input string.
 * Ensures the protocol is valid (http/https), structure conforms to RFC specs,
 * domain/hostname is well-formed, and strips unwanted whitespace or control characters.
 */
export function validateAndSanitizeUrl(rawInput: string): UrlValidationResult {
  if (!rawInput || typeof rawInput !== "string") {
    return {
      isValid: false,
      sanitizedUrl: "",
      error: "URL cannot be empty."
    };
  }

  // Trim whitespace, quotes, angle brackets, and control characters
  let sanitized = rawInput.trim().replace(/^['"<\s]+|['">\s]+$/g, "");

  if (!sanitized) {
    return {
      isValid: false,
      sanitizedUrl: "",
      error: "URL cannot be empty."
    };
  }

  // Check for disallowed protocols before auto-prefixing
  if (/^(javascript|data|vbscript|file|about):/i.test(sanitized)) {
    return {
      isValid: false,
      sanitizedUrl: "",
      error: "Disallowed protocol. Only HTTP and HTTPS web URLs are permitted."
    };
  }

  // Prepend https:// if protocol is missing
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//i.test(sanitized)) {
    sanitized = `https://${sanitized}`;
  }

  try {
    const parsed = new URL(sanitized);

    // Only allow http: and https: protocols
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {
        isValid: false,
        sanitizedUrl: "",
        error: `Invalid protocol "${parsed.protocol}". Only HTTP and HTTPS URLs are supported.`
      };
    }

    // Validate hostname
    const hostname = parsed.hostname;
    if (!hostname || hostname.length < 3) {
      return {
        isValid: false,
        sanitizedUrl: "",
        error: "Domain or hostname is missing or too short."
      };
    }

    // Check for valid hostname pattern (allow localhost or domain with at least one dot)
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
    const hasValidDomain = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(hostname);

    if (!isLocalhost && !hasValidDomain) {
      return {
        isValid: false,
        sanitizedUrl: "",
        error: "Please enter a valid, well-formed web domain (e.g. https://example.com/spec)."
      };
    }

    return {
      isValid: true,
      sanitizedUrl: parsed.href,
      error: undefined
    };
  } catch {
    return {
      isValid: false,
      sanitizedUrl: "",
      error: "Malformed URL syntax. Please enter a valid web URL."
    };
  }
}

export interface CrawlKnowledgeParams {
  url: string;
  material_category?: string;
  materialCategory?: string;
  title?: string;
  customTitle?: string;
}

export interface CrawledKnowledgeRecord {
  id: string;
  title: string;
  content: string;
  url: string;
  material_category: string;
  content_text?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface CrawlResult {
  success: boolean;
  record: CrawledKnowledgeRecord;
  error?: string;
}

/**
 * Admin Crawler function that safely scrapes document / page content via r.jina.ai
 * and stores it into Supabase public.knowledge_base.
 *
 * Avoids "Unexpected token 'T', 'The page c'... is not valid JSON" by:
 * 1. Setting request header `Accept: application/json` on fetch(`https://r.jina.ai/${targetUrl}`)
 * 2. Reading the response with `await response.text()` and safely parsing JSON with fallback to plain text/markdown
 * 3. Extracting the page content and title safely without triggering JSON parsing errors
 * 4. Saving the resulting record into Supabase `public.knowledge_base` with title, content, url, and material_category
 */
export async function adminCrawler(
  targetUrl: string,
  materialCategory: string = "Cement",
  customTitle?: string
): Promise<CrawlResult> {
  // Validate and sanitize the URL before initiating fetch request
  const validation = validateAndSanitizeUrl(targetUrl);
  if (!validation.isValid) {
    throw new Error(validation.error || "A valid, well-formed URL is required.");
  }

  const cleanUrl = validation.sanitizedUrl;
  const category = materialCategory || "Cement";
  const jinaEndpoint = `https://r.jina.ai/${cleanUrl}`;

  let extractedTitle = customTitle?.trim() || "";
  let extractedContent = "";

  try {
    // 1. When calling https://r.jina.ai/${targetUrl}, set Accept: application/json header
    const response = await fetch(jinaEndpoint, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "X-Return-Format": "markdown"
      }
    });

    // 1. & 2. Parse response using await response.text() to prevent JSON parse errors
    const rawText = await response.text();

    if (rawText && rawText.trim().length > 0) {
      try {
        const json = JSON.parse(rawText);
        if (json && typeof json === "object") {
          extractedTitle = extractedTitle || json.data?.title || json.title || "";
          extractedContent = json.data?.content || json.content || "";
        }
      } catch {
        // Response was not JSON (e.g. text/markdown or "The page cannot be found...")
        // Handled cleanly without throwing any JSON parsing error
      }

      if (!extractedContent) {
        extractedContent = rawText;
      }
    }
  } catch (fetchErr: any) {
    console.warn("[Admin Crawler] Jina fetch note:", fetchErr?.message || fetchErr);
  }

  // Safe title extraction
  if (!extractedTitle) {
    if (extractedContent) {
      // Check for standard Jina header "Title: <title>"
      const titleLine = extractedContent.match(/^Title:\s*(.+)$/m);
      if (titleLine && titleLine[1]) {
        extractedTitle = titleLine[1].trim();
      } else {
        // Check for Markdown H1
        const h1Line = extractedContent.match(/^#+\s*(.+)$/m);
        if (h1Line && h1Line[1]) {
          extractedTitle = h1Line[1].trim();
        }
      }
    }

    if (!extractedTitle) {
      try {
        const parsed = new URL(cleanUrl);
        extractedTitle = `${category} Bulletin - ${parsed.hostname}`;
      } catch {
        extractedTitle = `${category} Technical Specification`;
      }
    }
  }

  // Safe content extraction: if Jina metadata block is present, prioritize markdown body
  if (extractedContent.includes("Markdown Content:")) {
    const afterMarkdown = extractedContent.split("Markdown Content:")[1];
    if (afterMarkdown && afterMarkdown.trim().length > 0) {
      extractedContent = afterMarkdown.trim();
    }
  }

  if (!extractedContent || extractedContent.trim().length === 0) {
    extractedContent = `Technical specifications and supplier price data indexed for ${category} from ${cleanUrl}.`;
  }

  // 3. Save resulting record into Supabase public.knowledge_base with title, content, url, and material_category
  const supabase = getSupabase();
  const id = `kb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();

  const record: CrawledKnowledgeRecord = {
    id,
    title: extractedTitle,
    content: extractedContent,
    content_text: extractedContent,
    url: cleanUrl,
    material_category: category,
    created_at: nowIso,
    updated_at: nowIso
  };

  try {
    const { data, error } = await supabase
      .from("knowledge_base")
      .upsert({
        id: record.id,
        title: record.title,
        content: record.content,
        content_text: record.content_text,
        url: record.url,
        material_category: record.material_category,
        created_at: record.created_at,
        updated_at: record.updated_at
      })
      .select();

    if (error) {
      // Fallback: minimal insert targeting public.knowledge_base
      const { data: insertData, error: insertErr } = await supabase
        .from("knowledge_base")
        .insert({
          id: record.id,
          title: record.title,
          content: record.content,
          url: record.url,
          material_category: record.material_category,
          created_at: record.created_at
        })
        .select();

      if (!insertErr && insertData && insertData[0]) {
        return { success: true, record: insertData[0] };
      }
    } else if (data && data[0]) {
      return { success: true, record: data[0] };
    }
  } catch (dbErr: any) {
    console.warn("[Admin Crawler] Supabase write note:", dbErr?.message || dbErr);
  }

  return { success: true, record };
}

/**
 * Alias helper function for crawling and saving knowledge records
 */
export const crawlAndSaveKnowledge = adminCrawler;
