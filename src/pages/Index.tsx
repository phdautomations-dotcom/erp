import { SiteNav } from "@/components/site/SiteNav";
import { Hero } from "@/components/site/Hero";
import { Services } from "@/components/site/Services";
import { SpareParts } from "@/components/site/SpareParts";
import { About } from "@/components/site/About";
import { WhyUs } from "@/components/site/WhyUs";
import { Contact } from "@/components/site/Contact";
import { Footer } from "@/components/site/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main>
        <Hero />
        <Services />
        <SpareParts />
        <About />
        <WhyUs />
        <Contact />
      </main>
      <Footer />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: "PHD Automations",
            description:
              "Repair, maintenance and OEM-grade spare parts for CNC, VMC and HMC machines.",
            areaServed: "IN",
            telephone: "+91-9999502399",
            email: "contact@phdautomations.in",
          }),
        }}
      />
    </div>
  );
};

export default Index;
