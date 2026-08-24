import React, { useState } from "react";
import { Check, Heart, Sparkles, X } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [name, setName] = useState("");
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [interest, setInterest] = useState("visitar");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setName("");
      setEmailOrPhone("");
      setInterest("visitar");
      setMessage("");
      onClose();
    }, 2400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
      <div className="fixed inset-0 bg-[#163632]/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 my-8 w-full max-w-lg overflow-hidden rounded-2xl border border-[#BDD0CB] bg-[#F4F8F7] shadow-2xl">
        <div className="relative bg-[#132C28] p-6 text-white sm:p-8">
          <button onClick={onClose} className="absolute right-5 top-5 rounded-full bg-white/10 p-2" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-[#A7D7D0]">
            <Heart className="h-3.5 w-3.5" /> Bienvenido a la Familia
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl">Únete a Church Connect</h2>
          <p className="mt-1 text-xs text-[#A7D7D0] sm:text-sm">
            Queremos conocerte y acompañarte en tu camino de fe.
          </p>
        </div>

        <div className="p-6 sm:p-8">
          {submitted ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#4D8F87]/20 text-[#2B665F]">
                <Check className="h-8 w-8" />
              </div>
              <h3 className="mb-2 font-serif text-xl font-bold text-[#163632]">
                ¡Gracias por contactarnos, {name || "amigo/a"}!
              </h3>
              <p className="text-sm text-[#4F6E6A]">Nos pondremos en contacto contigo muy pronto.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#254A45]">
                Nombre Completo
                <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Juan Pérez" className="mt-1.5 w-full rounded-lg border border-[#CBDCD7] bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#4D8F87]" />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#254A45]">
                Teléfono o Correo Electrónico
                <input required value={emailOrPhone} onChange={(e) => setEmailOrPhone(e.target.value)} placeholder="correo@ejemplo.com" className="mt-1.5 w-full rounded-lg border border-[#CBDCD7] bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#4D8F87]" />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#254A45]">
                Me gustaría...
                <select value={interest} onChange={(e) => setInterest(e.target.value)} className="mt-1.5 w-full rounded-lg border border-[#CBDCD7] bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#4D8F87]">
                  <option value="visitar">Visitar por primera vez este domingo</option>
                  <option value="oracion">Pedir una oración especial</option>
                  <option value="estudio">Unirme al estudio bíblico</option>
                  <option value="jovenes">Participar en el grupo de jóvenes</option>
                </select>
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#254A45]">
                Mensaje o Petición de Oración (Opcional)
                <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="¿Cómo podemos ayudarte?" className="mt-1.5 w-full rounded-lg border border-[#CBDCD7] bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#4D8F87]" />
              </label>
              <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#4D8F87] py-3 text-sm font-medium text-white hover:bg-[#3C7B73]">
                <Sparkles className="h-4 w-4" /> Enviar Información
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};