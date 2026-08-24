import React, { useState } from "react";
import type { ContactInfoItem, ServiceItem } from "./types";
import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";
import { Hero } from "./components/home/Hero";
import { ServicesSection } from "./components/home/ServicesSection";
import { ContactSection } from "./components/home/ContactSection";
import { EventSection } from "./components/events/EventSection";
import { JoinModal } from "./components/modals/JoinModal";
import { DetailModal } from "./components/modals/DetailModal";

export default function App() {
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [selectedContact, setSelectedContact] = useState<ContactInfoItem | null>(null);

  const closeDetailModal = () => {
    setSelectedService(null);
    setSelectedContact(null);
  };

  return (
    <div className="min-h-screen bg-[#DDE7E4] text-[#163632]">
      <Navbar onOpenJoinModal={() => setJoinModalOpen(true)} />

      <main>
        <Hero onOpenJoinModal={() => setJoinModalOpen(true)} />
        <ServicesSection onSelectService={setSelectedService} />
        <EventSection />
        <ContactSection onSelectContact={setSelectedContact} />
      </main>

      <Footer />

      <JoinModal
        isOpen={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
      />

      <DetailModal
        service={selectedService}
        contactItem={selectedContact}
        onClose={closeDetailModal}
        onOpenJoinModal={() => setJoinModalOpen(true)}
      />
    </div>
  );
}