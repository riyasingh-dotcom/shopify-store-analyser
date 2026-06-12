import type { Product } from '@/types/shopify';

export type AuditCategory = 'title' | 'description' | 'seo' | 'media' | 'metadata';
export type AuditGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export type ProductAuditCheck = {
  id: string;
  category: AuditCategory;
  label: string;
  passed: boolean;
  score: number;
  maxScore: number;
  suggestion?: string;
};

export type ProductAuditResult = {
  productId: string;
  checks: ProductAuditCheck[];
  totalScore: number;
  grade: AuditGrade;
  categoryScores: Record<AuditCategory, { score: number; maxScore: number }>;
};

// ── private helpers ────────────────────────────────────────────────────────────

const GENERIC_PREFIXES = ['new ', 'best ', 'buy ', 'cheap ', 'top '];

const PLACEHOLDER_PHRASES = [
  'lorem ipsum',
  'add your description',
  'description here',
  'enter description',
  'product description goes here',
  'add description here',
];

// Decode common HTML entities so &nbsp; chains don't inflate character counts.
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Counts paragraph-like blocks without relying on \n\n (which stripHtml destroys).
// Handles </p>, double-<br> (common in Shopify rich-text editors), and bare text.
function countParagraphs(html: string): number {
  const closingPs = (html.match(/<\/p>/gi) ?? []).length;
  if (closingPs > 0) return closingPs;

  const doubleBrs = (html.match(/<br\s*\/?>\s*<br\s*\/?>/gi) ?? []).length;
  if (doubleBrs > 0) return doubleBrs + 1;

  return stripHtml(html).length > 0 ? 1 : 0;
}

// Unicode-aware: toUpperCase() handles accented chars (CAFÉ, ÜBER).
// The \p{L} guard prevents purely numeric/symbolic tokens from being flagged.
function hasAllCapsWord(text: string): boolean {
  return text.split(/\s+/).some(
    (word) =>
      word.length > 1 &&
      word === word.toUpperCase() &&
      /\p{L}/u.test(word),
  );
}

// Trim a nullable string field; returns null when absent or whitespace-only.
function normStr(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

function makeCheck(
  id: string,
  category: AuditCategory,
  label: string,
  passed: boolean,
  maxScore: number,
  suggestion?: string,
): ProductAuditCheck {
  return { id, category, label, passed, score: passed ? maxScore : 0, maxScore, suggestion };
}

function gradeFromScore(score: number): AuditGrade {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 45) return 'D';
  return 'F';
}

// ── public API ─────────────────────────────────────────────────────────────────

export function auditProduct(product: Product): ProductAuditResult {
  const { title, descriptionHtml, seo, images, tags, vendor, productType } = product;

  const plainDesc = stripHtml(descriptionHtml);
  const titleLower = title.toLowerCase();

  // Trim SEO fields — whitespace-only strings must not pass boolean / length checks.
  const seoTitle = normStr(seo.title);
  const seoDesc = normStr(seo.description);
  const seoTitleLen = seoTitle?.length ?? 0;
  const seoDescLen = seoDesc?.length ?? 0;

  // Filter empty-string tags so ["", ""] doesn't satisfy the 2-tag requirement.
  const realTags = tags.filter((t) => t.trim().length > 0);

  const checks: ProductAuditCheck[] = [
    // ── Title (25 pts) ─────────────────────────────────────────────────────────
    makeCheck(
      'title-length',
      'title',
      'Title length 20–70 characters',
      title.length >= 20 && title.length <= 70,
      10,
      `Title is ${title.length} characters. Aim for 20–70 for optimal search display.`,
    ),
    makeCheck(
      'title-no-generic-prefix',
      'title',
      'No generic prefix (New / Best / Buy)',
      !GENERIC_PREFIXES.some((p) => titleLower.startsWith(p)),
      5,
      'Avoid starting titles with generic words like "New", "Best", or "Buy" — they add no SEO value.',
    ),
    makeCheck(
      'title-has-descriptor',
      'title',
      'Title contains a product descriptor',
      title.trim().split(/\s+/).length >= 2,
      5,
      'Add a descriptive word (material, colour, use-case) to make the title more specific.',
    ),
    makeCheck(
      'title-no-allcaps',
      'title',
      'No ALL CAPS words',
      !hasAllCapsWord(title),
      5,
      'Avoid fully capitalised words — they reduce readability and hurt click-through rates.',
    ),

    // ── Description (25 pts) ───────────────────────────────────────────────────
    makeCheck(
      'desc-min-length',
      'description',
      'Description longer than 150 characters',
      plainDesc.length > 150,
      8,
      `Description is ${plainDesc.length} chars. Add more content to improve SEO and conversions.`,
    ),
    makeCheck(
      'desc-rich-length',
      'description',
      'Description longer than 300 characters',
      plainDesc.length > 300,
      7,
      'Descriptions over 300 characters rank significantly better and drive more conversions.',
    ),
    makeCheck(
      'desc-paragraphs',
      'description',
      '2 or more paragraphs',
      countParagraphs(descriptionHtml) >= 2,
      5,
      'Break your description into 2+ paragraphs to improve readability and SEO structure.',
    ),
    makeCheck(
      'desc-no-placeholder',
      'description',
      'No placeholder text',
      !PLACEHOLDER_PHRASES.some((p) => plainDesc.toLowerCase().includes(p)),
      5,
      'Replace placeholder text with real product information.',
    ),

    // ── SEO (25 pts) ───────────────────────────────────────────────────────────
    makeCheck(
      'seo-title-exists',
      'seo',
      'SEO title is set',
      Boolean(seoTitle),
      5,
      'Add a custom SEO title to control how your product appears in search results.',
    ),
    makeCheck(
      'seo-title-length',
      'seo',
      'SEO title 30–60 characters',
      Boolean(seoTitle) && seoTitleLen >= 30 && seoTitleLen <= 60,
      10,
      seoTitle !== null
        ? `SEO title is ${seoTitleLen} characters. Aim for 30–60 to avoid truncation in search results.`
        : 'Set an SEO title first, then ensure it is 30–60 characters.',
    ),
    makeCheck(
      'seo-desc-exists',
      'seo',
      'SEO description is set',
      Boolean(seoDesc),
      5,
      'Add a meta description to improve click-through rates from search results.',
    ),
    makeCheck(
      'seo-desc-length',
      'seo',
      'SEO description 120–160 characters',
      Boolean(seoDesc) && seoDescLen >= 120 && seoDescLen <= 160,
      5,
      seoDesc !== null
        ? `SEO description is ${seoDescLen} characters. Aim for 120–160 to avoid truncation.`
        : 'Set an SEO description first, then ensure it is 120–160 characters.',
    ),

    // ── Media (15 pts) ─────────────────────────────────────────────────────────
    makeCheck(
      'media-has-image',
      'media',
      'Has at least one product image',
      images.length > 0,
      8,
      'Add product images — listings with photos convert significantly better.',
    ),
    makeCheck(
      'media-alt-text',
      'media',
      'Featured image has alt text',
      Boolean(images[0]?.altText?.trim()),
      7,
      'Add descriptive alt text to the featured image to improve accessibility and image SEO.',
    ),

    // ── Metadata (10 pts) ──────────────────────────────────────────────────────
    makeCheck(
      'meta-tags',
      'metadata',
      'Has 2 or more tags',
      realTags.length >= 2,
      4,
      `Product has ${realTags.length} tag(s). Add 2+ tags to improve store search and filtering.`,
    ),
    makeCheck(
      'meta-vendor',
      'metadata',
      'Vendor is set',
      Boolean(vendor.trim()),
      3,
      'Set a vendor/brand name to help customers identify the product origin.',
    ),
    makeCheck(
      'meta-product-type',
      'metadata',
      'Product type is set',
      Boolean(productType.trim()),
      3,
      'Set a product type for better categorisation and filtering.',
    ),
  ];

  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);

  const categories: AuditCategory[] = ['title', 'description', 'seo', 'media', 'metadata'];
  const categoryScores = Object.fromEntries(
    categories.map((cat) => {
      const catChecks = checks.filter((c) => c.category === cat);
      return [
        cat,
        {
          score: catChecks.reduce((s, c) => s + c.score, 0),
          maxScore: catChecks.reduce((s, c) => s + c.maxScore, 0),
        },
      ];
    }),
  ) as Record<AuditCategory, { score: number; maxScore: number }>;

  return {
    productId: product.id,
    checks,
    totalScore,
    grade: gradeFromScore(totalScore),
    categoryScores,
  };
}
