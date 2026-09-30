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
  description?: string;
}

export interface CrawledKnowledgeRecord {
  id: string;
  title: string;
  content: string;
  url: string;
  material_category: string;
  has_embedding?: boolean;
  embedding_dim?: number;
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
 * Authoritative Crawler Invocation:
 * Directly sends the crawl request to the secure server-side endpoint POST /api/admin/crawl-ingest.
 * The server handles content extraction, 768-dim Gemini embedding, and persistence into Supabase public.knowledge_base.
 * No secondary client-side fallbacks or confusing 404s.
 */
export async function crawlSource(
  targetUrl: string,
  materialCategory: string = "Cement",
  customTitle?: string,
  customDescription?: string
): Promise<CrawlResult> {
  const validation = validateAndSanitizeUrl(targetUrl);
  if (!validation.isValid) {
    throw new Error(validation.error || "A valid, well-formed URL is required.");
  }

  let res: Response;
  try {
    res = await fetch("/api/admin/crawl-ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: validation.sanitizedUrl,
        material_category: materialCategory,
        title: customTitle,
        customTitle: customTitle,
        description: customDescription
      })
    });
  } catch (netErr: any) {
    throw new Error(
      netErr?.message === "Failed to fetch"
        ? "Network connection to Shurefire crawler service was interrupted. Please check your connection and retry."
        : (netErr?.message || "Failed to connect to crawler ingestion service.")
    );
  }

  const data = await res.json().catch(() => null);

  if (res.ok && data?.record) {
    return {
      success: true,
      record: data.record
    };
  }

  throw new Error(data?.error || `Crawl ingestion failed with status ${res.status}`);
}

/**
 * Aliases for backwards compatibility
 */
export const adminCrawler = crawlSource;
export const crawlAndSaveKnowledge = crawlSource;
