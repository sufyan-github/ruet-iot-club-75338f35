import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar, Tag } from "lucide-react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";

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
      <section className="py-20">
        <div className="container max-w-3xl">
          <Link to="/blog" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-6">
            <ArrowLeft size={14} /> Back to Blog
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4">{post.title}</h1>
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-8">
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
