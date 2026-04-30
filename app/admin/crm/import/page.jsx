'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

export default function ImportExportPage() {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [results, setResults] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        alert('הקובץ ריק או לא תקין');
        return;
      }

      // Parse CSV
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      const data = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].match(/(".*?"|[^,]+)/g) || [];
        const row = {};
        
        headers.forEach((header, idx) => {
          row[header] = values[idx]?.replace(/"/g, '').trim() || '';
        });
        
        // Map Hebrew headers to English
        const lead = {
          name: row['שם'] || row['name'] || '',
          phone: row['טלפון'] || row['phone'] || '',
          email: row['אימייל'] || row['email'] || '',
          source: row['מקור'] || row['source'] || 'manual',
          notes: row['הערות'] || row['notes'] || '',
          segment: row['סגמנט'] || row['segment'] || 'cold',
          estimatedValue: row['ערך משוער'] || row['estimatedValue'] || 0,
        };

        if (lead.name && lead.phone) {
          data.push(lead);
        }
      }

      setCsvData(data);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleImport = async () => {
    if (csvData.length === 0) {
      alert('אין נתונים לייבוא');
      return;
    }

    setImporting(true);
    setResults(null);

    try {
      const res = await fetch('/api/crm/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: csvData }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setResults(data.results);
        setCsvData([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        alert(data.error || 'שגיאה בייבוא');
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('שגיאה בייבוא');
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const res = await fetch(`/api/crm/leads/export?format=${format}`);
      
      if (format === 'csv') {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leads-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('שגיאה בייצוא');
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white p-3 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/admin/crm" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <h1
            className="text-xl sm:text-2xl md:text-3xl font-bold"
            style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            ייבוא וייצוא לידים
          </h1>
        </div>

        {/* Import Section */}
        <div
          className="rounded-xl p-6 shadow-md"
          style={{
            border: '2px solid transparent',
            backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
          }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#1e3a8a' }}>
            ייבוא לידים מקובץ CSV/Excel
          </h2>
          
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-gray-600">לחץ לבחירת קובץ או גרור לכאן</span>
                <span className="text-sm text-gray-400">CSV או Excel</span>
              </label>
            </div>

            {csvData.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-medium">
                  נמצאו {csvData.length} לידים לייבוא
                </p>
                <div className="mt-2 max-h-40 overflow-y-auto text-sm text-green-700">
                  {csvData.slice(0, 5).map((lead, i) => (
                    <div key={i}>{lead.name} - {lead.phone}</div>
                  ))}
                  {csvData.length > 5 && <div>...ועוד {csvData.length - 5}</div>}
                </div>
              </div>
            )}

            {results && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 font-medium">תוצאות הייבוא:</p>
                <ul className="mt-2 text-sm text-blue-700">
                  <li>יובאו בהצלחה: {results.imported}</li>
                  <li>דולגו (כפילויות/שגיאות): {results.skipped}</li>
                </ul>
              </div>
            )}

            <button
              onClick={handleImport}
              disabled={importing || csvData.length === 0}
              className="w-full px-4 py-3 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              {importing ? (
                <>טוען...</>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  ייבא לידים
                </>
              )}
            </button>
          </div>

          {/* Template Download */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">פורמט הקובץ הנדרש:</p>
            <code className="text-xs bg-gray-200 px-2 py-1 rounded">
              שם, טלפון, אימייל, מקור, הערות, סגמנט, ערך משוער
            </code>
          </div>
        </div>

        {/* Export Section */}
        <div
          className="rounded-xl p-6 shadow-md"
          style={{
            border: '2px solid transparent',
            backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
          }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#1e3a8a' }}>
            ייצוא לידים
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting}
              className="px-4 py-3 border-2 border-cyan-500 text-cyan-700 rounded-lg hover:bg-cyan-50 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              ייצא ל-CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              disabled={exporting}
              className="px-4 py-3 border-2 border-blue-500 text-blue-700 rounded-lg hover:bg-blue-50 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              ייצא ל-JSON
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
