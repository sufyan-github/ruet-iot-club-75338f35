import { describe, expect, it } from "vitest";
import { meaningfulBlogText, validateBlog } from "./blogValidation";

const complete = {
  title: "Building the future",
  slug: "building-the-future",
  excerpt: "RUET IoT Club",
  featuredImageUrl: "/api/v1/media/files/website/example.png",
  contentHtml: "<h2>Technology</h2><p>Technology is changing.</p>",
  authorName: "RUET IoT Club",
  category: "IoT",
  publicationDate: "2026-08-22T06:10:00.000Z",
  seoTitle: "IoT",
  seoDescription: "Leading the future via IoT",
};

describe("blog validation", () => {
  it("allows an incomplete draft when title and slug are present", () => {
    expect(
      validateBlog(
        {
          ...complete,
          excerpt: "",
          featuredImageUrl: null,
          contentHtml: "<p><br></p>",
          authorName: "",
          category: "",
          publicationDate: null,
          seoTitle: null,
          seoDescription: null,
        },
        "DRAFT",
      ),
    ).toEqual({});
  });

  it("reports every publication-only requirement by field", () => {
    const errors = validateBlog(
      {
        ...complete,
        excerpt: "",
        featuredImageUrl: null,
        contentHtml: "<p><br></p>",
        authorName: "",
        category: "",
        publicationDate: null,
      },
      "PUBLISHED",
    );
    expect(Object.keys(errors)).toEqual([
      "excerpt",
      "contentHtml",
      "featuredImageUrl",
      "authorName",
      "category",
      "publicationDate",
    ]);
  });

  it("accepts formatted content and short optional SEO values", () => {
    expect(meaningfulBlogText("<p><br></p>")).toBe("");
    expect(meaningfulBlogText(complete.contentHtml)).toContain("Technology");
    expect(validateBlog(complete, "PUBLISHED")).toEqual({});
  });
});
