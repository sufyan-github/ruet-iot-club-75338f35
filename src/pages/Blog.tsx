import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Calendar, ArrowRight, PenLine, BookOpen, Tag } from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const CATEGORIES = [
  "All",
  "IoT",
  "Embedded Systems",
  "Machine Learning",
  "Web Development",
  "Robotics",
  "Tutorial",
  "Project Showcase",
  "General",
];

const Blog = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });
      setPosts(data || []);
      setLoading(false);
    };
    fetchPosts();
  }, []);

  const filtered = activeCategory === "All"
    ? posts
    : posts.filter((p) => p.category === activeCategory);

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <Layout>
      <SEO title="Blog — Articles & Tutorials | RUET IoT Club" description="Read articles, tutorials, and project showcases on IoT, embedded systems, robotics, and machine learning by RUET IoT Club members." path="/blog" />
      <section className="py-24">
        <div className="container max-w-6xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-10">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-5xl font-display font-bold tracking-tight text-foreground mb-3"
              >
                Blog
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-muted-foreground text-lg max-w-md"
              >
                Insights, tutorials, and updates from our members
              </motion.p>
            </div>
            {user && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                <Link
                  to="/blog/write"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all glow-border"
                >
                  <PenLine size={16} /> Write a Post
                </Link>
              </motion.div>
            )}
          </div>

          {/* Category Filter */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex flex-wrap gap-2 mb-10"
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 chip-shape text-sm font-medium transition-all ${
                  activeCategory === cat
                    ? "bg-gradient-to-r from-[#2de2c9] to-[#00d2ff] text-[#050b14] font-bold shadow-[0_2px_12px_rgba(45,226,201,0.4)]"
                    : "bg-[#071322]/80 text-muted-foreground border border-[#2de2c9]/20 hover:text-foreground hover:border-[#2de2c9]/50"
                }`}
              >
                {cat}
              </button>
            ))}
          </motion.div>

          {loading ? (
            <div className="space-y-6">
              <div className="h-72 chip-shape bg-secondary/30 border border-border/20 animate-pulse" />
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-56 chip-shape bg-secondary/30 border border-border/20 animate-pulse" />
                ))}
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-28 chip-card border border-[#2de2c9]/25"
            >
              <BookOpen size={48} className="mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground text-lg mb-2">
                {activeCategory === "All"
                  ? "No blog posts yet."
                  : `No posts in "${activeCategory}" yet.`}
              </p>
              {user && activeCategory === "All" && (
                <Link to="/blog/write" className="text-primary hover:underline text-sm inline-block">
                  Be the first to write one →
                </Link>
              )}
            </motion.div>
          ) : (
            <div className="space-y-10">
              {/* Featured Post */}
              {featured && (
                <motion.article
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="group relative chip-card border border-[#2de2c9]/30 hover:border-[#2de2c9]/70 overflow-hidden transition-all duration-300"
                >
                  {/* Pin-1 Dot */}
                  <span className="absolute top-3 left-3 w-2 h-2 rounded-full bg-[#2de2c9] shadow-[0_0_8px_#2de2c9] z-20" />

                  <Link to={`/blog/${featured.id}`} className="block p-8 md:p-10">
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                      <span className="px-3 py-1 text-xs font-semibold chip-shape bg-primary/15 text-primary border border-primary/20">
                        Latest
                      </span>
                      {featured.category && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium chip-shape bg-accent/15 text-accent border border-accent/20">
                          <Tag size={10} /> {featured.category}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar size={12} />
                        {new Date(featured.created_at).toLocaleDateString("en-US", {
                          year: "numeric", month: "long", day: "numeric",
                        })}
                      </span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground group-hover:text-primary transition-colors mb-4 leading-tight">
                      {featured.title}
                    </h2>
                    <p className="text-muted-foreground leading-relaxed line-clamp-3 max-w-3xl mb-6">
                      {featured.content?.substring(0, 400)}
                      {(featured.content?.length || 0) > 400 && "..."}
                    </p>
                    <span className="inline-flex items-center gap-2 text-primary text-sm font-semibold group-hover:gap-3 transition-all">
                      Read article <ArrowRight size={14} />
                    </span>
                  </Link>
                  <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
                </motion.article>
              )}

              {/* Post Grid */}
              {rest.length > 0 && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rest.map((post, i) => (
                    <motion.article
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      className="group relative flex flex-col chip-card border border-[#2de2c9]/25 hover:border-[#2de2c9]/70 transition-all duration-300 overflow-hidden"
                    >
                      {/* Pin-1 Dot */}
                      <span className="absolute top-2.5 left-2.5 w-1.5 h-1.5 rounded-full bg-[#2de2c9]/70" />

                      <Link to={`/blog/${post.id}`} className="flex flex-col flex-1 p-6">
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          {post.category && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium chip-shape bg-accent/10 text-accent border border-accent/15">
                              <Tag size={9} /> {post.category}
                            </span>
                          )}
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar size={12} />
                            {new Date(post.created_at).toLocaleDateString("en-US", {
                              year: "numeric", month: "short", day: "numeric",
                            })}
                          </span>
                        </div>
                        <h3 className="text-lg font-display font-semibold text-foreground group-hover:text-primary transition-colors mb-3 leading-snug line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 flex-1 mb-4">
                          {post.content?.substring(0, 200)}
                          {(post.content?.length || 0) > 200 && "..."}
                        </p>
                        <span className="inline-flex items-center gap-1.5 text-primary text-sm font-medium group-hover:gap-2.5 transition-all mt-auto">
                          Read more <ArrowRight size={13} />
                        </span>
                      </Link>
                    </motion.article>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Blog;
