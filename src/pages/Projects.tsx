import { motion } from "framer-motion";
import { useState } from "react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { ExternalLink, Github } from "lucide-react";

const allProjects = [
  { title: "Smart Campus System", category: "IoT", status: "Ongoing", tech: ["ESP32", "MQTT", "React"], desc: "Automated lighting and climate control across campus buildings." },
  { title: "Air Quality Monitor", category: "Environmental", status: "Completed", tech: ["Arduino", "Sensors", "Cloud"], desc: "Real-time air quality monitoring with predictive alerts." },
  { title: "Automated Greenhouse", category: "Agriculture", status: "Ongoing", tech: ["Raspberry Pi", "AI", "IoT"], desc: "Smart greenhouse with automated irrigation and monitoring." },
  { title: "Smart Parking System", category: "IoT", status: "Completed", tech: ["ESP32", "Ultrasonic", "App"], desc: "IoT-enabled parking detection with mobile app." },
  { title: "Health Monitor Wearable", category: "Healthcare", status: "Idea", tech: ["BLE", "Sensors", "ML"], desc: "Wearable device for continuous health monitoring." },
  { title: "Flood Alert System", category: "Environmental", status: "Ongoing", tech: ["LoRa", "Sensors", "Cloud"], desc: "Early warning system for flood-prone areas of Rajshahi." },
];

const categories = ["All", "IoT", "Environmental", "Agriculture", "Healthcare"];

const Projects = () => {
  const [filter, setFilter] = useState("All");
  const filtered = filter === "All" ? allProjects : allProjects.filter((p) => p.category === filter);

  return (
    <Layout>
      <section className="py-20">
        <div className="container">
          <SectionHeading title="Projects" subtitle="Explore our innovations and ongoing research" />

          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {filtered.map((project, i) => (
              <motion.div
                key={project.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-6 rounded-xl glass hover:border-primary/30 transition-colors group"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-mono px-2 py-1 rounded bg-primary/10 text-primary">{project.category}</span>
                  <span className={`text-xs font-mono px-2 py-1 rounded ${
                    project.status === "Completed" ? "bg-green-500/10 text-green-400" :
                    project.status === "Ongoing" ? "bg-yellow-500/10 text-yellow-400" :
                    "bg-blue-500/10 text-blue-400"
                  }`}>
                    {project.status}
                  </span>
                </div>
                <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">{project.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{project.desc}</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {project.tech.map((t) => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">{t}</span>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                    <Github size={12} /> Code
                  </button>
                  <button className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                    <ExternalLink size={12} /> Details
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Projects;
