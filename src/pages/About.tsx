import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import SectionHeading from "@/components/SectionHeading";
import { Target, Eye, Zap, Users, Award, BookOpen } from "lucide-react";

const values = [
  { icon: Zap, title: "Innovation", desc: "Pushing boundaries with cutting-edge IoT solutions" },
  { icon: Users, title: "Collaboration", desc: "Working together to achieve extraordinary results" },
  { icon: BookOpen, title: "Learning", desc: "Continuous growth through hands-on experience" },
  { icon: Award, title: "Excellence", desc: "Striving for the highest quality in everything" },
];

const About = () => {
  return (
    <Layout>
      <SEO title="About RUET IoT Club — IoT Innovation at RUET" description="Learn about RUET IoT Club's mission, vision, and research focus on Internet of Things, embedded systems, and AI at RUET." path="/about" />
      <section className="py-20">
        <div className="container">
          <SectionHeading title="About RUET IoT Club" subtitle="Pioneering IoT innovation since 2020" />

          <div className="max-w-3xl mx-auto space-y-6 text-muted-foreground leading-relaxed mb-16">
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              RUET IoT Club is a student-driven organization at Rajshahi University of Engineering & Technology dedicated to exploring and advancing the Internet of Things. Founded in 2020, we have grown from a small group of enthusiasts to a vibrant community of 120+ members.
            </motion.p>
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
              Our members work on real-world IoT projects, participate in national and international competitions, and contribute to open-source initiatives. We bridge the gap between academic knowledge and industry applications.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative p-8 chip-card border border-[#2de2c9]/25 hover:border-[#2de2c9]/70 overflow-hidden"
            >
              <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#2de2c9]/60 pointer-events-none" />
              <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#2de2c9]/60 pointer-events-none" />
              <div className="flex items-center justify-between mb-3 text-[10px] font-mono text-[#2de2c9]/80 tracking-wider">
                <span>CORE_01 // MISSION</span>
                <span className="chip-pin-1" />
              </div>
              <Target className="text-primary mb-4" size={32} />
              <h3 className="font-display text-lg font-bold tracking-wider text-primary mb-3">Mission</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Build an IoT innovation ecosystem at RUET</li>
                <li>• Promote research and hands-on learning</li>
                <li>• Encourage student-led project development</li>
                <li>• Foster industry-academia collaboration</li>
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="relative p-8 chip-card border border-[#3b9bff]/25 hover:border-[#3b9bff]/70 overflow-hidden"
            >
              <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#3b9bff]/60 pointer-events-none" />
              <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#3b9bff]/60 pointer-events-none" />
              <div className="flex items-center justify-between mb-3 text-[10px] font-mono text-[#3b9bff]/80 tracking-wider">
                <span>CORE_02 // VISION</span>
                <span className="chip-pin-1" />
              </div>
              <Eye className="text-accent mb-4" size={32} />
              <h3 className="font-display text-lg font-bold tracking-wider text-accent mb-3">Vision</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Become the leading IoT innovation hub among universities in Bangladesh, producing industry-ready engineers and contributing to groundbreaking research in smart systems, embedded computing, and connected devices.
              </p>
            </motion.div>
          </div>

          <SectionHeading title="Our Values" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative p-5 chip-card border border-[#2de2c9]/25 hover:border-[#2de2c9]/70 text-center overflow-hidden"
              >
                <span className="chip-pin-1 absolute top-2.5 left-2.5 z-20" />
                <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#2de2c9]/60 pointer-events-none" />
                <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#2de2c9]/60 pointer-events-none" />
                <span className="absolute top-2 right-2 text-[9px] font-mono text-[#2de2c9]/80 font-bold">0{i + 1}</span>
                <v.icon className="mx-auto mb-3 text-primary group-hover:scale-110 transition-transform" size={24} />
                <h4 className="font-semibold text-sm text-foreground mb-1">{v.title}</h4>
                <p className="text-xs text-muted-foreground">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;
