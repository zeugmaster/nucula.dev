import Stage from "@/components/Stage";
import Intro from "@/components/Intro";
import Hardware from "@/components/Hardware";
import Firmware from "@/components/Firmware";
import Build from "@/components/Build";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Stage />
      <main>
        <Intro />
        <Hardware />
        <Firmware />
        <Build />
      </main>
      <Footer />
    </>
  );
}
