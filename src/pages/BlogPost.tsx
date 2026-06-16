import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar, Tag } from "lucide-react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";

const BlogPost = () => {
  const { id } = useParams();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("blog_posts")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setPost(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <Layout><div className="py-20 text-center text-muted-foreground">Loading...</div></Layout>;
  if (!post) return <Layout><div className="py-20 text-center text-muted-foreground">Post not found.</div></Layout>;

  return (
    <Layout>
      <SEO
        title={`${post.title} | RUET IoT Club Blog`}
        description={(post.excerpt || (post.content || "").slice(0, 155)).replace(/\s+/g, " ").trim()}
        path={`/blog/${post.id}`}
        type="article"
        image={post.cover_image || undefined}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          datePublished: post.created_at,
          author: { "@type": "Person", name: post.author_name || "RUET IoT Club" },
          articleSection: post.category || undefined,
          image: post.cover_image || undefined,
        }}
      />
      <section className="py-20">
        <div className="container max-w-3xl">
          <Link to="/blog" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-6">
            <ArrowLeft size={14} /> Back to Blog
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4">{post.title}</h1>
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-8 flex-wrap">
            {post.category && (
              <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-accent/15 text-accent border border-accent/20">
                <Tag size={10} /> {post.category}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {new Date(post.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>
          <div className="prose prose-invert max-w-none text-foreground/90 whitespace-pre-wrap leading-relaxed text-sm">
            {post.content}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default BlogPost;
