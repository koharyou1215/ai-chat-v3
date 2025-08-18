'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Type,
  Save,
  Edit3,
  Check,
  X,
  Calendar,
  Clock,
  User,
  MessageSquare,
  FileText,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TextEntry {
  id: string;
  content: string;
  timestamp: Date;
  character?: string;
  messageId?: string;
  tags: string[];
  category: string;
}

interface TextTrackerProps {
  entries: TextEntry[];
  onAddEntry: (content: string, category: string, tags: string[]) => void;
  onUpdateEntry: (entryId: string, content: string, tags: string[]) => void;
  onDeleteEntry: (entryId: string) => void;
  categories: string[];
  currentCharacter?: string;
  className?: string;
}

const TextTracker: React.FC<TextTrackerProps> = ({
  entries,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  categories,
  currentCharacter,
  className
}) => {
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [newEntryContent, setNewEntryContent] = useState('');
  const [newEntryCategory, setNewEntryCategory] = useState(categories[0] || 'general');
  const [newEntryTags, setNewEntryTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isExpanded, setIsExpanded] = useState(true);
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Filter entries based on search and category
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = !searchQuery || 
      entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || entry.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Sort entries by timestamp (newest first)
  const sortedEntries = [...filteredEntries].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const handleAddEntry = () => {
    if (!newEntryContent.trim()) return;
    
    onAddEntry(newEntryContent.trim(), newEntryCategory, newEntryTags);
    setNewEntryContent('');
    setNewEntryTags([]);
    setTagInput('');
    setIsAddingEntry(false);
  };

  const handleEditEntry = (entryId: string) => {
    const entry = entries.find(e => e.id === entryId);
    if (entry) {
      setEditingEntry(entryId);
      setEditContent(entry.content);
      setEditTags([...entry.tags]);
    }
  };

  const handleSaveEdit = () => {
    if (editingEntry && editContent.trim()) {
      onUpdateEntry(editingEntry, editContent.trim(), editTags);
      setEditingEntry(null);
      setEditContent('');
      setEditTags([]);
    }
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setEditContent('');
    setEditTags([]);
  };

  const handleAddTag = (tags: string[], setTags: (tags: string[]) => void, input: string) => {
    if (input.trim() && !tags.includes(input.trim())) {
      setTags([...tags, input.trim()]);
    }
  };

  const handleRemoveTag = (tags: string[], setTags: (tags: string[]) => void, tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      action();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [newEntryContent, editContent]);

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className={cn("bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Type size={18} className="text-blue-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Text Tracker
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({entries.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddingEntry(true)}
            className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="Add new entry"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {/* Filters */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
              {/* Search */}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search entries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    "w-full pl-9 pr-4 py-2 rounded-lg border text-sm",
                    "border-gray-300 dark:border-gray-600",
                    "bg-white dark:bg-gray-700",
                    "text-gray-900 dark:text-white",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500"
                  )}
                />
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-gray-500 dark:text-gray-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className={cn(
                    "px-3 py-1 rounded border text-sm",
                    "border-gray-300 dark:border-gray-600",
                    "bg-white dark:bg-gray-700",
                    "text-gray-900 dark:text-white",
                    "focus:outline-none focus:ring-1 focus:ring-blue-500"
                  )}
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Add New Entry */}
            {isAddingEntry && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Edit3 size={16} className="text-blue-500" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      New Entry
                    </span>
                  </div>

                  <textarea
                    ref={textareaRef}
                    value={newEntryContent}
                    onChange={(e) => setNewEntryContent(e.target.value)}
                    onKeyDown={(e) => handleKeyPress(e, handleAddEntry)}
                    placeholder="Write your entry here... (Ctrl+Enter to save)"
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border resize-none",
                      "border-gray-300 dark:border-gray-600",
                      "bg-white dark:bg-gray-700",
                      "text-gray-900 dark:text-white",
                      "focus:outline-none focus:ring-2 focus:ring-blue-500",
                      "min-h-[80px]"
                    )}
                    autoFocus
                  />

                  <div className="flex items-center gap-4">
                    <select
                      value={newEntryCategory}
                      onChange={(e) => setNewEntryCategory(e.target.value)}
                      className={cn(
                        "px-3 py-1 rounded border text-sm",
                        "border-gray-300 dark:border-gray-600",
                        "bg-white dark:bg-gray-700",
                        "text-gray-900 dark:text-white",
                        "focus:outline-none focus:ring-1 focus:ring-blue-500"
                      )}
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>

                    <div className="flex-1">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            handleAddTag(newEntryTags, setNewEntryTags, tagInput);
                            setTagInput('');
                          }
                        }}
                        placeholder="Add tags (press Enter)"
                        className={cn(
                          "w-full px-3 py-1 rounded border text-sm",
                          "border-gray-300 dark:border-gray-600",
                          "bg-white dark:bg-gray-700",
                          "text-gray-900 dark:text-white",
                          "focus:outline-none focus:ring-1 focus:ring-blue-500"
                        )}
                      />
                    </div>
                  </div>

                  {newEntryTags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {newEntryTags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs"
                        >
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(newEntryTags, setNewEntryTags, tag)}
                            className="hover:text-blue-900 dark:hover:text-blue-100"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setIsAddingEntry(false);
                        setNewEntryContent('');
                        setNewEntryTags([]);
                        setTagInput('');
                      }}
                      className="px-3 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddEntry}
                      disabled={!newEntryContent.trim()}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1 rounded text-sm transition-colors",
                        "bg-blue-500 hover:bg-blue-600 text-white",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                    >
                      <Save size={14} />
                      Save
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Entries List */}
            <div className="max-h-96 overflow-y-auto">
              {sortedEntries.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText size={32} className="text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {searchQuery || selectedCategory !== 'all' 
                      ? 'No entries match your filters' 
                      : 'No entries yet'
                    }
                  </p>
                  {!searchQuery && selectedCategory === 'all' && !isAddingEntry && (
                    <button
                      onClick={() => setIsAddingEntry(true)}
                      className="mt-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors"
                    >
                      Add Your First Entry
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {sortedEntries.map((entry) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 group"
                    >
                      {editingEntry === entry.id ? (
                        <div className="space-y-3">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onKeyDown={(e) => handleKeyPress(e, handleSaveEdit)}
                            className={cn(
                              "w-full px-3 py-2 rounded-lg border resize-none",
                              "border-gray-300 dark:border-gray-600",
                              "bg-white dark:bg-gray-700",
                              "text-gray-900 dark:text-white",
                              "focus:outline-none focus:ring-2 focus:ring-blue-500",
                              "min-h-[60px]"
                            )}
                            autoFocus
                          />
                          
                          {editTags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {editTags.map(tag => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                                >
                                  {tag}
                                  <button
                                    onClick={() => handleRemoveTag(editTags, setEditTags, tag)}
                                    className="hover:text-gray-900 dark:hover:text-gray-100"
                                  >
                                    <X size={12} />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={handleCancelEdit}
                              className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                            >
                              <X size={16} />
                            </button>
                            <button
                              onClick={handleSaveEdit}
                              className="p-1 text-green-500 hover:text-green-700 dark:hover:text-green-300 transition-colors"
                            >
                              <Check size={16} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <Clock size={12} />
                              <span>{formatTimestamp(entry.timestamp)}</span>
                              {entry.character && (
                                <>
                                  <span>•</span>
                                  <User size={12} />
                                  <span>{entry.character}</span>
                                </>
                              )}
                              <span>•</span>
                              <span className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                                {entry.category}
                              </span>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEditEntry(entry.id)}
                                className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                                title="Edit entry"
                              >
                                <Edit3 size={14} />
                              </button>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap mb-2">
                            {entry.content}
                          </p>
                          
                          {entry.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {entry.tags.map(tag => (
                                <span
                                  key={tag}
                                  className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TextTracker;