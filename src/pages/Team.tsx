import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { Linkedin, Github, Mail } from "lucide-react";

const team = [
  { name: "Arif Rahman", position: "President", dept: "CSE", bio: "Final year CSE student passionate about embedded systems and IoT." },
  { name: "Fatima Akter", position: "Vice President", dept: "EEE", bio: "Research enthusiast focusing on smart grid and energy IoT." },
  { name: "Tanvir Hasan", position: "General Secretary", dept: "CSE", bio: "Full-stack developer with expertise in IoT cloud platforms." },
  { name: "Nusrat Jahan", position: "Project Lead", dept: "ECE", bio: "Embedded systems engineer with experience in industrial IoT." },
  { name: "Rafiq Islam", position: "Research Lead", dept: "CSE", bio: "ML researcher exploring AI-driven IoT analytics." },
  { name: "Sadia Khan", position: "Web Team Lead", dept: "CSE", bio: "Frontend developer building the club's digital presence." },
  { name: "Mahbub Alam", position: "Media Lead", dept: "ME", bio: "Content creator and event photographer." },
  { name: "Rima Sultana", position: "Training Lead", dept: "EEE", bio: "Workshop organizer and Arduino instructor." },
];

const Team = () => {
  return (
    <Layout>
      <section className="py-20">
        <div className="container">
          <SectionHeading title="Executive Team" subtitle="Meet the people driving RUET IoT Club" />

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {team.map((member, i) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="p-5 rounded-xl glass text-center hover:border-primary/30 transition-colors group"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mx-auto mb-3 flex items-center justify-center">
                  <span className="font-display text-lg font-bold text-primary">
                    {member.name.split(" ").map(n => n[0]).join("")}
                  </span>
                </div>
                <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{member.name}</h3>
                <p className="text-xs font-mono text-primary mt-1">{member.position}</p>
                <p className="text-xs text-muted-foreground mt-1">{member.dept}</p>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{member.bio}</p>
                <div className="flex justify-center gap-2 mt-3">
                  {[Linkedin, Github, Mail].map((Icon, j) => (
                    <a key={j} href="#" className="text-muted-foreground hover:text-primary transition-colors">
                      <Icon size={14} />
                    </a>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Team;
