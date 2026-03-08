import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const BlogWrite = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myPosts, setMyPosts] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      supabase
        .from("blog_posts")
        .select("*")
        .eq("author_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => setMyPosts(data || []));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim() || !content.trim()) { toast.error("Title and content are required"); return; }
    setSubmitting(true);

    const { error } = await supabase.from("blog_posts").insert({
      title: title.trim(),
      content: content.trim(),
      author_id: user.id,
      published: false,
      category: category || null,
    } as any);

    if (error) {
      toast.error("Failed to submit blog post");
    } else {
      toast.success("Blog post submitted for review! An admin will review and publish it.");
      setTitle("");
      setContent("");
      setCategory("");
      // Refresh my posts
      const { data } = await supabase.from("blog_posts").select("*").eq("author_id", user.id).order("created_at", { ascending: false });
      setMyPosts(data || []);
    }
    setSubmitting(false);
  };

  if (loading || !user) return null;

  return (
    <Layout>
      <section className="py-20">
        <div className="container max-w-3xl">
          <SectionHeading title="Write a Blog Post" subtitle="Share your knowledge with the community. Posts will be reviewed by an admin before publishing." />

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="p-6 rounded-xl glass space-y-4 mb-8"
          >
            <input
              placeholder="Blog Title *"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <textarea
              placeholder="Write your blog content here... *"
              required
              rows={12}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Send size={16} /> {submitting ? "Submitting..." : "Submit for Review"}
            </button>
          </motion.form>

          {myPosts.length > 0 && (
            <div>
              <h3 className="font-display text-sm font-bold tracking-wider text-primary mb-4">My Posts</h3>
              <div className="space-y-3">
                {myPosts.map((post) => (
                  <div key={post.id} className="p-4 rounded-xl glass flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-foreground truncate">{post.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-xs font-mono px-2 py-1 rounded shrink-0 ${
                      post.published ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"
                    }`}>
                      {post.published ? "Published" : "Pending Review"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default BlogWrite;
