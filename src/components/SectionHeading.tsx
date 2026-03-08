import { motion } from "framer-motion";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  align?: "left" | "center";
}

const SectionHeading = ({ title, subtitle, align = "center" }: SectionHeadingProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={`mb-12 ${align === "center" ? "text-center" : ""}`}
    >
      <h2 className="font-display text-2xl md:text-3xl font-bold tracking-wide">
        <span className="text-gradient">{title}</span>
      </h2>
      {subtitle && (
        <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
      )}
    </motion.div>
  );
};

export default SectionHeading;
