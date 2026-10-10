import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  PenLine,
  Search,
  Tag,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";

interface BlogSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featuredImageUrl: string | null;
  featuredImageAlt: string;
  authorName: string;
  category: string;
  tags: string[];
  publicationDate: string;
  views: number;
}
interface BlogPage {
  items: BlogSummary[];
  total: number;
  page: number;
  pageSize: number;
  categories: string[];
}

export default function Blog() {
  const { user } = useAuth();
  const [data, setData] = useState<BlogPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      q: query,
      category,
      page: String(page),
      pageSize: "10",
    });
    try {
      setData(await apiRequest<BlogPage>(`/blogs?${params}`));
    } catch (next) {
      setError(
        next instanceof Error
          ? next.message
          : "The blog is temporarily unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, [category, page, query]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 220);
    return () => window.clearTimeout(timer);
  }, [load]);
  const featured = data?.items[0];
  const rest = data?.items.slice(1) ?? [];
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / 10));

  return (
    <Layout>
      <SEO
        title="Blog — Articles & Tutorials | RUET IoT Club"
        description="Read articles, tutorials, and project showcases on IoT, embedded systems, robotics, and machine learning by RUET IoT Club."
        path="/blog"
      />
      <section className="py-20 md:py-24">
        <div className="container max-w-6xl">
          <div className="mb-10 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-display text-4xl font-bold tracking-tight md:text-5xl"
              >
                Blog
              </motion.h1>
              <p className="mt-3 max-w-xl text-lg text-muted-foreground">
                Ideas, practical guides, project stories, and club updates from
                the RUET IoT community.
              </p>
            </div>
            {user && (
              <Link
                to="/blog/write"
                className="glow-border inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                <PenLine size={16} />
                Write a Post
              </Link>
            )}
          </div>
          <div className="mb-8 grid gap-4 rounded-2xl border border-border bg-card/55 p-4 md:grid-cols-[minmax(0,1fr)_auto]">
            <label className="relative">
              <span className="sr-only">Search blog posts</span>
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={17}
              />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Search articles…"
                className="w-full rounded-xl border border-border bg-background/70 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <FilterButton
                active={!category}
                onClick={() => {
                  setCategory("");
                  setPage(1);
                }}
              >
                All
              </FilterButton>
              {(data?.categories ?? []).map((item) => (
                <FilterButton
                  key={item}
                  active={category === item}
                  onClick={() => {
                    setCategory(item);
                    setPage(1);
                  }}
                >
                  {item}
                </FilterButton>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="space-y-6">
              <div className="h-80 animate-pulse rounded-2xl bg-secondary/50" />
              <div className="grid gap-6 md:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-72 animate-pulse rounded-2xl bg-secondary/50"
                  />
                ))}
              </div>
            </div>
          ) : error ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-400/20 bg-red-500/5 p-10 text-center"
            >
              <p className="text-red-200">{error}</p>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-4 text-sm font-semibold text-primary"
              >
                Try again
              </button>
            </div>
          ) : !featured ? (
            <div className="rounded-2xl border border-border bg-card/55 py-24 text-center">
              <BookOpen
                className="mx-auto text-muted-foreground/40"
                size={48}
              />
              <p className="mt-4 text-lg text-muted-foreground">
                No published articles match these filters.
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              <motion.article
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                className={`group overflow-hidden rounded-2xl border border-border bg-card/70 transition hover:border-primary/30 ${featured.featuredImageUrl ? "md:grid md:grid-cols-[1.05fr_1fr]" : ""}`}
              >
                {featured.featuredImageUrl && (
                  <Link
                    to={`/blog/${featured.slug}`}
                    className="block min-h-72 overflow-hidden bg-secondary"
                  >
                    <img
                      src={featured.featuredImageUrl}
                      alt={featured.featuredImageAlt || ""}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  </Link>
                )}
                <div className="flex flex-col justify-center p-7 md:p-10">
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-semibold text-primary">
                      Latest
                    </span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Tag size={12} />
                      {featured.category}
                    </span>
                  </div>
                  <Link to={`/blog/${featured.slug}`}>
                    <h2 className="mt-4 font-display text-2xl font-bold leading-tight transition group-hover:text-primary md:text-3xl">
                      {featured.title}
                    </h2>
                  </Link>
                  <p className="mt-4 line-clamp-3 leading-7 text-muted-foreground">
                    {featured.excerpt}
                  </p>
                  <BlogMeta post={featured} />
                  <Link
                    to={`/blog/${featured.slug}`}
                    className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary"
                  >
                    Read article <ArrowRight size={15} />
                  </Link>
                </div>
              </motion.article>
              {rest.length > 0 && (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((post, index) => (
                    <motion.article
                      key={post.id}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="group flex overflow-hidden rounded-2xl border border-border bg-card/60 transition hover:-translate-y-1 hover:border-primary/30"
                    >
                      <Link
                        to={`/blog/${post.slug}`}
                        className="flex w-full flex-col"
                      >
                        {post.featuredImageUrl && (
                          <div className="aspect-[16/9] overflow-hidden bg-secondary">
                            <img
                              src={post.featuredImageUrl}
                              alt={post.featuredImageAlt || ""}
                              loading="lazy"
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                            />
                          </div>
                        )}
                        <div className="flex flex-1 flex-col p-6">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                            <Tag size={11} />
                            {post.category}
                          </span>
                          <h2 className="mt-3 line-clamp-2 font-display text-xl font-semibold leading-snug transition group-hover:text-primary">
                            {post.title}
                          </h2>
                          <p className="mt-3 line-clamp-3 flex-1 text-sm leading-6 text-muted-foreground">
                            {post.excerpt}
                          </p>
                          <BlogMeta post={post} />
                          <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                            Read more <ArrowRight size={14} />
                          </span>
                        </div>
                      </Link>
                    </motion.article>
                  ))}
                </div>
              )}
              {pages > 1 && (
                <nav
                  aria-label="Blog pagination"
                  className="flex items-center justify-between border-t border-border pt-6"
                >
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((value) => value - 1)}
                    className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {pages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= pages}
                    onClick={() => setPage((value) => value + 1)}
                    className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                </nav>
              )}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${active ? "border-primary/35 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}
function BlogMeta({ post }: { post: BlogSummary }) {
  return (
    <div className="mt-5 flex flex-wrap gap-4 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <UserRound size={12} />
        {post.authorName}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Calendar size={12} />
        {new Date(post.publicationDate).toLocaleDateString("en-BD", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </span>
    </div>
  );
}
