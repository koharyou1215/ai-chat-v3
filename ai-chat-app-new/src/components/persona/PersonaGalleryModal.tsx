'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Upload, Plus } from 'lucide-react';
import { useAppStore } from '@/store';
import { Persona } from '@/types';
import { PersonaCard } from './PersonaCard';
import { PersonaDetailModal } from './PersonaDetailModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
    addPersona,
  } = useAppStore();

  const personasArray = useMemo(() => Array.from(personas.values()), [personas]);

  const filteredPersonas = useMemo(() => {
    // Filter out personas with empty or invalid IDs
    const validPersonas = personasArray.filter((persona) => persona.id && persona.id.trim() !== '');

    if (!searchTerm) {
      return validPersonas;
    }
    return validPersonas.filter((persona) =>
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
      
      // Save to API endpoint
      try {
        const response = await fetch('/api/personas', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedPersona),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Persona saved successfully:', result.message);
        } else {
          console.warn('⚠️ Persona save API failed, but store updated');
        }
      } catch (apiError) {
        console.warn('⚠️ Persona save API error:', apiError, 'but store updated');
      }
      
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

  const handleJsonUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          // Generate new ID and timestamps for imported persona
          const importedPersona: Persona = {
            ...json,
            id: `imported-${Date.now()}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          addPersona(importedPersona);
          
          // Also save to API
          try {
            const response = await fetch('/api/personas', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(importedPersona),
            });
            
            if (response.ok) {
              console.log('✅ Imported persona saved to API:', importedPersona.name);
            } else {
              console.warn('⚠️ Imported persona API save failed');
            }
          } catch (apiError) {
            console.warn('⚠️ Imported persona API error:', apiError);
          }
          
          console.log('📁 Persona imported successfully:', importedPersona.name);
        } catch (error) {
          console.error('❌ Failed to parse JSON file:', error);
          alert('JSONファイルの読み込みに失敗しました。ファイル形式を確認してください。');
        }
      };
      reader.readAsText(file);
    }
    event.target.value = '';
  };

  const handleCreatePersona = () => {
    // 新規ペルソナ作成処理 - 詳細ダイアログを開く
    setSelectedPersonaForEdit(null);
    setShowDetailModal(true);
  };

  if (!showPersonaGallery) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        key="persona-gallery-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={() => setShowPersonaGallery(false)}
      >
        <motion.div
          key="persona-gallery-modal"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-slate-800/80 border border-slate-700 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <h2 className="text-xl font-semibold text-white">Select a Persona</h2>
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" className="h-9 px-3">
                <label htmlFor="persona-json-upload" className="cursor-pointer">
                  <Upload className="w-4 h-4" aria-label="JSON読込" />
                  <input id="persona-json-upload" type="file" className="hidden" accept=".json" onChange={handleJsonUpload} />
                </label>
              </Button>
              <Button variant="ghost" onClick={handleCreatePersona} className="h-9 px-3">
                <Plus className="w-4 h-4" aria-label="新規作成" />
              </Button>
              <button
                onClick={() => setShowPersonaGallery(false)}
                className="p-2 rounded-full hover:bg-slate-700"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
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
      {showDetailModal && (
        <PersonaDetailModal
          key="persona-detail-modal"
          persona={selectedPersonaForEdit}
          isOpen={showDetailModal}
          onClose={handleCloseDetailModal}
          onSave={handleSavePersona}
        />
      )}
    </AnimatePresence>
  );
};