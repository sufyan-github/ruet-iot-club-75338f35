import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Facebook,
  Linkedin,
  Share2,
  Tag,
  UserRound,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { apiRequest } from "@/lib/api";

interface RelatedBlog {
  id: string;
  title: string;
  slug: string;
  category: string;
  featuredImageUrl: string | null;
}
interface BlogPostData {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featuredImageUrl: string | null;
  featuredImageAlt: string;
  contentHtml: string;
  authorName: string;
  category: string;
  tags: string[];
  publicationDate: string;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string[];
  socialImageUrl: string | null;
  views: number;
  related: RelatedBlog[];
}

export default function BlogPost() {
  const { id } = useParams();
  const [post, setPost] = useState<BlogPostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      setPost(
        await apiRequest<BlogPostData>(`/blogs/${encodeURIComponent(id)}`),
      );
    } catch (next) {
      setError(
        next instanceof Error ? next.message : "This blog post is unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  if (loading)
    return (
      <Layout>
        <main className="container max-w-4xl py-28">
          <div className="h-10 w-2/3 animate-pulse rounded bg-secondary" />
          <div className="mt-8 h-96 animate-pulse rounded-2xl bg-secondary/50" />
        </main>
      </Layout>
    );
  if (!post)
    return (
      <Layout>
        <main className="container max-w-3xl py-28 text-center">
          <h1 className="text-2xl font-semibold">Post unavailable</h1>
          <p className="mt-3 text-muted-foreground">
            {error || "This article could not be found."}
          </p>
          <Link
            to="/blog"
            className="mt-6 inline-flex items-center gap-2 text-primary"
          >
            <ArrowLeft size={15} />
            Back to Blog
          </Link>
        </main>
      </Layout>
    );
  const canonicalPath = `/blog/${post.slug}`;
  const absoluteUrl = `https://ruetiotclub.org${canonicalPath}`;
  const description = post.seoDescription || post.excerpt;
  const image = post.socialImageUrl || post.featuredImageUrl || undefined;
  const share = async () => {
    if (navigator.share)
      await navigator.share({
        title: post.title,
        text: post.excerpt,
        url: absoluteUrl,
      });
    else await navigator.clipboard.writeText(absoluteUrl);
  };

  return (
    <Layout>
      <SEO
        title={post.seoTitle || `${post.title} | RUET IoT Club Blog`}
        description={description}
        path={canonicalPath}
        type="article"
        image={image}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description,
          datePublished: post.publicationDate,
          author: { "@type": "Person", name: post.authorName },
          publisher: {
            "@type": "Organization",
            name: "RUET IoT Club",
            logo: {
              "@type": "ImageObject",
              url: "https://ruetiotclub.org/club-logo.png",
            },
          },
          articleSection: post.category,
          keywords: post.seoKeywords.length
            ? post.seoKeywords.join(", ")
            : post.tags.join(", "),
          image,
        }}
      />
      <article className="pb-24 pt-16 md:pt-20">
        <header className="container max-w-4xl">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-primary"
          >
            <ArrowLeft size={15} />
            Back to Blog
          </Link>
          <div className="mt-8 flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-semibold text-primary">
              <Tag size={11} />
              {post.category}
            </span>
            {post.tags.map((tag) => (
              <span key={tag} className="text-muted-foreground">
                #{tag}
              </span>
            ))}
          </div>
          <h1 className="mt-5 text-balance font-display text-3xl font-bold leading-tight md:text-5xl">
            {post.title}
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
            {post.excerpt}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-5 border-y border-border py-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <UserRound size={15} />
              {post.authorName}
            </span>
            <span className="inline-flex items-center gap-2">
              <Calendar size={15} />
              {new Date(post.publicationDate).toLocaleDateString("en-BD", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <span>{post.views.toLocaleString()} views</span>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => void share()}
                aria-label="Share article"
                className="rounded-lg border border-border p-2 transition hover:border-primary/30 hover:text-primary"
              >
                <Share2 size={16} />
              </button>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(absoluteUrl)}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Share on Facebook"
                className="rounded-lg border border-border p-2 transition hover:border-primary/30 hover:text-primary"
              >
                <Facebook size={16} />
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(absoluteUrl)}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Share on LinkedIn"
                className="rounded-lg border border-border p-2 transition hover:border-primary/30 hover:text-primary"
              >
                <Linkedin size={16} />
              </a>
            </div>
          </div>
        </header>
        {post.featuredImageUrl && (
          <div className="container mt-10 max-w-6xl">
            <img
              src={post.featuredImageUrl}
              alt={post.featuredImageAlt || ""}
              className="max-h-[38rem] w-full rounded-2xl border border-border object-cover"
            />
          </div>
        )}
        <div className="container mt-12 max-w-3xl">
          <div
            className="blog-content prose prose-invert prose-cyan max-w-none leading-8"
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />
        </div>
      </article>
      {post.related.length > 0 && (
        <section className="border-t border-border bg-card/30 py-16">
          <div className="container max-w-6xl">
            <h2 className="font-display text-2xl font-semibold">
              Related articles
            </h2>
            <div className="mt-7 grid gap-6 md:grid-cols-3">
              {post.related.map((item) => (
                <Link
                  key={item.id}
                  to={`/blog/${item.slug}`}
                  className="group overflow-hidden rounded-2xl border border-border bg-card/60 transition hover:border-primary/30"
                >
                  {item.featuredImageUrl && (
                    <img
                      src={item.featuredImageUrl}
                      alt=""
                      loading="lazy"
                      className="aspect-video w-full object-cover"
                    />
                  )}
                  <div className="p-5">
                    <span className="text-xs font-semibold text-primary">
                      {item.category}
                    </span>
                    <h3 className="mt-2 line-clamp-2 font-display text-lg font-semibold group-hover:text-primary">
                      {item.title}
                    </h3>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm text-primary">
                      Read article <ArrowRight size={14} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
}
