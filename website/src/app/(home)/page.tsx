import { Hero } from "@/components/landing/hero";
import { Install } from "@/components/landing/install";
import { Screenshots } from "@/components/landing/screenshots";
import { Features } from "@/components/landing/features";
import { Community } from "@/components/landing/community";
import { Contact } from "@/components/landing/contact";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Install />
      <Screenshots />
      <Features />
      <Community />
      <Contact />
    </>
  );
}
