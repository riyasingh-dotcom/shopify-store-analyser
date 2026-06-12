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

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function countParagraphs(html: string): number {
  const closingPs = (html.match(/<\/p>/gi) ?? []).length;
  if (closingPs > 0) return closingPs;
  const text = stripHtml(html);
  if (!text) return 0;
  return text.split(/\n\n+/).filter(Boolean).length;
}

function hasAllCapsWord(text: string): boolean {
  return text.split(/\s+/).some(
    (word) => word.length > 1 && /^[A-Z]+$/.test(word),
  );
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
  const seoTitleLen = seo.title?.length ?? 0;
  const seoDescLen = seo.description?.length ?? 0;

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
      Boolean(seo.title),
      5,
      'Add a custom SEO title to control how your product appears in search results.',
    ),
    makeCheck(
      'seo-title-length',
      'seo',
      'SEO title 30–60 characters',
      Boolean(seo.title) && seoTitleLen >= 30 && seoTitleLen <= 60,
      10,
      `SEO title is ${seoTitleLen} characters. Aim for 30–60 to avoid truncation in search results.`,
    ),
    makeCheck(
      'seo-desc-exists',
      'seo',
      'SEO description is set',
      Boolean(seo.description),
      5,
      'Add a meta description to improve click-through rates from search results.',
    ),
    makeCheck(
      'seo-desc-length',
      'seo',
      'SEO description 120–160 characters',
      Boolean(seo.description) && seoDescLen >= 120 && seoDescLen <= 160,
      5,
      `SEO description is ${seoDescLen} characters. Aim for 120–160 to avoid truncation.`,
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
      Boolean(images[0]?.altText),
      7,
      'Add descriptive alt text to the featured image to improve accessibility and image SEO.',
    ),

    // ── Metadata (10 pts) ──────────────────────────────────────────────────────
    makeCheck(
      'meta-tags',
      'metadata',
      'Has 2 or more tags',
      tags.length >= 2,
      4,
      `Product has ${tags.length} tag(s). Add 2+ tags to improve store search and filtering.`,
    ),
    makeCheck(
      'meta-vendor',
      'metadata',
      'Vendor is set',
      Boolean(vendor),
      3,
      'Set a vendor/brand name to help customers identify the product origin.',
    ),
    makeCheck(
      'meta-product-type',
      'metadata',
      'Product type is set',
      Boolean(productType),
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
