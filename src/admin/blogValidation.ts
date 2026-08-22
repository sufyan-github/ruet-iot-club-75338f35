export type BlogValidationStatus = "DRAFT" | "PUBLISHED";

export interface BlogValidationValue {
  title: string;
  slug: string;
  excerpt: string;
  featuredImageUrl: string | null;
  contentHtml: string;
  authorName: string;
  category: string;
  publicationDate: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

export type BlogFieldErrors = Record<string, string[]>;

export function meaningfulBlogText(value: string) {
  if (typeof document !== "undefined") {
    const container = document.createElement("div");
    container.innerHTML = value;
    return (container.textContent ?? "").replace(/\u00a0/gu, " ").trim();
  }
  return value
    .replace(/<[^>]*>/gu, " ")
    .replace(/&(?:nbsp|#160|#xA0);/giu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

export function validateBlog(
  value: BlogValidationValue,
  status: BlogValidationStatus,
): BlogFieldErrors {
  const errors: BlogFieldErrors = {};
  if (!value.title.trim()) errors.title = ["Enter a title before saving."];
  if (!value.slug.trim()) errors.slug = ["Enter a slug before saving."];
  else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value.slug))
    errors.slug = ["Use lowercase letters, numbers, and single hyphens only."];

  if ((value.seoTitle ?? "").trim().length > 70)
    errors.seoTitle = ["SEO title must be 70 characters or fewer."];
  if ((value.seoDescription ?? "").trim().length > 180)
    errors.seoDescription = [
      "Meta description must be 180 characters or fewer.",
    ];

  if (status === "DRAFT") return errors;
  if (!value.excerpt.trim())
    errors.excerpt = ["Excerpt is required before publishing."];
  if (!meaningfulBlogText(value.contentHtml))
    errors.contentHtml = ["Article content is required before publishing."];
  if (!value.featuredImageUrl)
    errors.featuredImageUrl = [
      "Hero image is required before publishing.",
    ];
  if (!value.authorName.trim())
    errors.authorName = ["Author is required before publishing."];
  if (!value.category.trim())
    errors.category = ["Category is required before publishing."];
  if (!value.publicationDate)
    errors.publicationDate = [
      "Publication date is required before publishing.",
    ];
  return errors;
}

