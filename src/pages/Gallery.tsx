import { motion } from "framer-motion";
import { useState } from "react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";

const galleryItems = [
  { title: "IoT Workshop 2025", category: "Workshop", color: "from-primary/20 to-accent/20" },
  { title: "Hackathon Finals", category: "Hackathon", color: "from-accent/20 to-primary/20" },
  { title: "Project Exhibition", category: "Exhibition", color: "from-primary/30 to-green-500/20" },
  { title: "Arduino Training", category: "Training", color: "from-yellow-500/20 to-primary/20" },
  { title: "Team Building", category: "Event", color: "from-primary/20 to-blue-500/20" },
  { title: "Smart Campus Demo", category: "Project", color: "from-accent/30 to-primary/20" },
  { title: "School Outreach", category: "Outreach", color: "from-green-500/20 to-accent/20" },
  { title: "Annual Meetup", category: "Event", color: "from-primary/20 to-accent/30" },
];

const categories = ["All", "Workshop", "Hackathon", "Exhibition", "Training", "Event", "Project", "Outreach"];

const Gallery = () => {
  const [filter, setFilter] = useState("All");
  const filtered = filter === "All" ? galleryItems : galleryItems.filter((g) => g.category === filter);

  return (
    <Layout>
      <section className="py-20">
        <div className="container">
          <SectionHeading title="Gallery" subtitle="Moments from our journey" />

          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {filtered.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="aspect-square rounded-xl glass overflow-hidden relative group cursor-pointer"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${item.color}`} />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center opacity-80 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs font-mono text-primary mb-2">{item.category}</span>
                  <h4 className="font-semibold text-sm text-foreground">{item.title}</h4>
                </div>
              </motion.div>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-10">
            More photos coming soon. Follow us on social media for the latest updates!
          </p>
        </div>
      </section>
    </Layout>
  );
};

export default Gallery;
