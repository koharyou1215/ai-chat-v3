'use client';

import React from 'react';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <h1 className="text-white text-3xl mb-4">🚀 Test Page - Server Working!</h1>
      <div className="text-white space-y-4">
        <p>✅ Next.js Server: Running</p>
        <p>✅ React: Loading</p>
        <p>✅ Tailwind CSS: Working</p>
        <button 
          onClick={() => alert('JavaScript Working!')}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          Test JavaScript
        </button>
      </div>
    </div>
  );
}