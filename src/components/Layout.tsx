import { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="site-shell circuit-pattern flex min-h-screen flex-col bg-background text-foreground">
      <a href="#main-content" className="sr-only z-[100] rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to main content</a>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="relative flex-1 pt-[72px]">{children}</main>
      <Footer />
    </div>
  );
};

export default Layout;
