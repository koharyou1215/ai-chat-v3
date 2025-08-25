'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search } from 'lucide-react';
import { useAppStore } from '@/store';
import { Persona } from '@/types';
import { PersonaCard } from './PersonaCard';
import { PersonaDetailModal } from './PersonaDetailModal';
import { Input } from '@/components/ui/input';

export const PersonaGalleryModal: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPersonaForEdit, setSelectedPersonaForEdit] = useState<Persona | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const {
    showPersonaGallery,
    setShowPersonaGallery,
    personas,
    activatePersona,
    activePersonaId,
    updatePersona,
  } = useAppStore();

  const personasArray = useMemo(() => Array.from(personas.values()), [personas]);

  const filteredPersonas = useMemo(() => {
    if (!searchTerm) {
      return personasArray;
    }
    return personasArray.filter((persona) =>
      persona.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [personasArray, searchTerm]);

  const handleSelectPersona = (persona: Persona) => {
    activatePersona(persona.id);
    setShowPersonaGallery(false);
  };

  const handleEditPersona = (persona: Persona) => {
    setSelectedPersonaForEdit(persona);
    setShowDetailModal(true);
  };

  const handleSavePersona = async (updatedPersona: Persona) => {
    try {
      // Update persona in store
      updatePersona(updatedPersona);
      
      // Save to file system if needed (this would require an API endpoint)
      console.log('📝 Persona updated:', updatedPersona);
      
      setShowDetailModal(false);
      setSelectedPersonaForEdit(null);
    } catch (error) {
      console.error('❌ Failed to save persona:', error);
      throw error;
    }
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedPersonaForEdit(null);
  };

  if (!showPersonaGallery) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={() => setShowPersonaGallery(false)}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-slate-800/80 border border-slate-700 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <h2 className="text-xl font-semibold text-white">Select a Persona</h2>
            <button
              onClick={() => setShowPersonaGallery(false)}
              className="p-2 rounded-full hover:bg-slate-700"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          <div className="p-4 border-b border-slate-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <Input
                type="text"
                placeholder="Search personas..."
                className="w-full pl-10 bg-slate-900/50 border-slate-600 focus:border-cyan-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredPersonas.map((persona) => (
                <PersonaCard
                  key={persona.id}
                  persona={persona}
                  onSelect={handleSelectPersona}
                  onEdit={handleEditPersona}
                  isSelected={persona.id === activePersonaId}
                />
              ))}
            </div>
            {filteredPersonas.length === 0 && (
              <div className="text-center py-10 text-slate-500">
                <p>No personas found.</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Persona Detail Modal */}
      <PersonaDetailModal
        persona={selectedPersonaForEdit}
        isOpen={showDetailModal}
        onClose={handleCloseDetailModal}
        onSave={handleSavePersona}
      />
    </AnimatePresence>
  );
};