import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import WhatItIs from "@/components/WhatItIs";
import HowItWorks from "@/components/HowItWorks";
import Hardware from "@/components/Hardware";
import Protocol from "@/components/Protocol";
import Build from "@/components/Build";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <WhatItIs />
        <HowItWorks />
        <Hardware />
        <Protocol />
        <Build />
      </main>
      <Footer />
    </>
  );
}
