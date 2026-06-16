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
              className="p-8 rounded-xl glass"
            >
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
              className="p-8 rounded-xl glass"
            >
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
                className="p-5 rounded-xl glass text-center"
              >
                <v.icon className="mx-auto mb-3 text-primary" size={24} />
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
