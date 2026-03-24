import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import toast from 'react-hot-toast';

function UploadZone({ accept, label, description, onChange, file, loading }) {
  const ref = useRef();
  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) onChange(f);
  };

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${file ? 'border-findex-orange bg-findex-orange/5' : 'border-findex-midnight-border hover:border-findex-orange/50 bg-findex-midnight-lighter'}`}
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
      onClick={() => ref.current?.click()}
    >
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={e => onChange(e.target.files[0])} />
      <div className="text-4xl mb-3">{file ? '📄' : '☁️'}</div>
      {file ? (
        <>
          <p className="text-white font-semibold">{file.name}</p>
          <p className="text-gray-500 text-sm mt-1">{(file.size / 1024).toFixed(0)} KB · Click to change</p>
        </>
      ) : (
        <>
          <p className="text-white font-semibold">{label}</p>
          <p className="text-gray-500 text-sm mt-1">{description}</p>
          <p className="text-gray-600 text-xs mt-2">Click to browse or drag & drop</p>
        </>
      )}
      {loading && (
        <div className="mt-3 flex items-center justify-center gap-2 text-findex-orange text-sm">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          Processing...
        </div>
      )}
    </div>
  );
}

export default function ImportData() {
  const qc = useQueryClient();
  const [fleetFile, setFleetFile] = useState(null);
  const [statementFile, setStatementFile] = useState(null);
  const [fyPeriod, setFyPeriod] = useState('FY26');
  const [fleetResult, setFleetResult] = useState(null);
  const [statementResult, setStatementResult] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const importFleet = useMutation({
    mutationFn: async (file) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post('/import/fleet', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
    },
    onSuccess: (data) => {
      setFleetResult(data);
      qc.invalidateQueries(['vehicles']);
      toast.success(`Import complete: ${data.added} added, ${data.updated} updated`);
    },
    onError: e => toast.error(e.response?.data?.message || 'Import failed'),
  });

  const previewFleet = useMutation({
    mutationFn: async (file) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post('/import/fleet?preview=true', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
    },
    onSuccess: (data) => { setPreviewData(data); setShowPreview(true); },
    onError: e => toast.error(e.response?.data?.message || 'Preview failed'),
  });

  const importStatement = useMutation({
    mutationFn: async ({ file, fyPeriod }) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('fyPeriod', fyPeriod);
      return api.post('/import/statements', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
    },
    onSuccess: (data) => {
      setStatementResult(data);
      qc.invalidateQueries(['vehicles']);
      if (data.requiresManualReview) {
        toast('PDF requires manual review', { icon: '⚠️' });
      } else {
        toast.success(`Import complete: ${data.matched} charges matched`);
      }
    },
    onError: e => toast.error(e.response?.data?.message || 'Import failed'),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Import Data" subtitle="Upload SG Fleet CSV exports and account statements" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fleet CSV Import */}
        <div className="card space-y-4">
          <div>
            <h3 className="text-white font-semibold">Fleet Register Import</h3>
            <p className="text-gray-500 text-sm mt-1">Upload SG Fleet CSV or Excel export. Vehicles are matched on registration number — existing records are updated, new ones are created.</p>
          </div>

          <UploadZone
            accept=".csv,.xlsx,.xls"
            label="Upload SG Fleet CSV / Excel"
            description="Accepts .csv, .xlsx, .xls — up to 50MB"
            onChange={setFleetFile}
            file={fleetFile}
            loading={importFleet.isLoading || previewFleet.isLoading}
          />

          {fleetFile && (
            <div className="flex gap-2">
              <button
                onClick={() => previewFleet.mutate(fleetFile)}
                disabled={previewFleet.isLoading}
                className="btn-secondary text-sm flex-1"
              >
                {previewFleet.isLoading ? 'Loading preview...' : 'Preview (first 5 rows)'}
              </button>
              <button
                onClick={() => importFleet.mutate(fleetFile)}
                disabled={importFleet.isLoading}
                className="btn-primary text-sm flex-1"
              >
                {importFleet.isLoading ? 'Importing...' : 'Import Now'}
              </button>
            </div>
          )}

          {fleetResult && !importFleet.isLoading && (
            <div className="rounded-lg border border-findex-midnight-border bg-findex-midnight-lighter p-4 space-y-2">
              <p className="text-white font-semibold text-sm">Import Complete</p>
              <div className="flex gap-4 text-sm">
                <span className="text-emerald-400">+{fleetResult.added} added</span>
                <span className="text-blue-400">↑{fleetResult.updated} updated</span>
                {fleetResult.errors?.length > 0 && <span className="text-red-400">✗{fleetResult.errors.length} errors</span>}
              </div>
              {fleetResult.errors?.length > 0 && (
                <div className="text-xs text-red-400 space-y-1 mt-2">
                  {fleetResult.errors.slice(0, 5).map((e, i) => <div key={i}>{e.registration}: {e.error}</div>)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Account Statement Import */}
        <div className="card space-y-4">
          <div>
            <h3 className="text-white font-semibold">Account Statement Import</h3>
            <p className="text-gray-500 text-sm mt-1">Upload SG Fleet account statements (Excel or PDF). Charges are matched to vehicles by registration number.</p>
          </div>

          <div>
            <label className="label">Financial Year Period</label>
            <select className="input" value={fyPeriod} onChange={e => setFyPeriod(e.target.value)}>
              <option value="FY26">FY26 (2025–2026)</option>
              <option value="FY25">FY25 (2024–2025)</option>
              <option value="FY24">FY24 (2023–2024)</option>
            </select>
          </div>

          <UploadZone
            accept=".xlsx,.xls,.pdf"
            label="Upload Account Statement"
            description="Accepts .xlsx, .xls, .pdf — up to 50MB"
            onChange={setStatementFile}
            file={statementFile}
            loading={importStatement.isLoading}
          />

          {statementFile && (
            <button
              onClick={() => importStatement.mutate({ file: statementFile, fyPeriod })}
              disabled={importStatement.isLoading}
              className="btn-primary w-full text-sm"
            >
              {importStatement.isLoading ? 'Importing...' : `Import ${fyPeriod} Statement`}
            </button>
          )}

          {statementResult && !importStatement.isLoading && (
            <div className="rounded-lg border border-findex-midnight-border bg-findex-midnight-lighter p-4 space-y-2">
              {statementResult.requiresManualReview ? (
                <>
                  <div className="flex items-center gap-2">
                    <Badge color="orange">Manual Review Required</Badge>
                  </div>
                  <p className="text-sm text-gray-400">The PDF could not be automatically parsed. Review the raw text below:</p>
                  <pre className="text-xs text-gray-500 bg-findex-midnight rounded p-3 overflow-auto max-h-40 whitespace-pre-wrap">{statementResult.rawText?.slice(0, 1000)}</pre>
                </>
              ) : (
                <>
                  <p className="text-white font-semibold text-sm">Import Complete</p>
                  <div className="flex gap-4 text-sm">
                    <span className="text-emerald-400">✓{statementResult.matched} charges matched</span>
                    {statementResult.unmatched?.length > 0 && <span className="text-orange-400">⚠ {statementResult.unmatched.length} unmatched</span>}
                  </div>
                  {statementResult.unmatched?.length > 0 && (
                    <div className="text-xs text-orange-400 mt-1">
                      Unmatched registrations: {statementResult.unmatched.join(', ')}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="card border border-dashed border-findex-midnight-border">
        <h3 className="text-white font-semibold mb-3">Import Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
          <div className="space-y-2">
            <p className="font-semibold text-gray-400">Fleet CSV</p>
            <ul className="space-y-1 list-disc list-inside text-xs">
              <li>Export directly from SG Fleet portal</li>
              <li>Column headers are auto-mapped (case insensitive)</li>
              <li>Registration number is the primary key for upserts</li>
              <li>AU vs NZ country is derived from the State field automatically</li>
              <li>Preview imports before confirming to catch mapping issues</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-gray-400">Account Statements</p>
            <ul className="space-y-1 list-disc list-inside text-xs">
              <li>Excel files are preferred over PDF for reliability</li>
              <li>Expected columns: Registration, Charge Type, Amount (ex/inc GST), Date</li>
              <li>PDFs are auto-parsed using pattern matching — flag for manual review if confidence is low</li>
              <li>Registrations not found in the system are listed as unmatched</li>
              <li>Select the correct FY period before importing</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <Modal open={showPreview} onClose={() => setShowPreview(false)} title="Import Preview" size="xl">
        <div className="space-y-3">
          <p className="text-sm text-gray-400">First 5 rows of <span className="text-white font-semibold">{fleetFile?.name}</span> ({previewData?.total} total rows)</p>
          {previewData?.preview && previewData.preview.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-findex-midnight-border">
                    {Object.keys(previewData.preview[0]).slice(0, 8).map(k => (
                      <th key={k} className="px-3 py-2 text-left font-semibold text-gray-400 uppercase">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.preview.map((row, i) => (
                    <tr key={i} className="border-b border-findex-midnight-border/40">
                      {Object.values(row).slice(0, 8).map((val, j) => (
                        <td key={j} className="px-3 py-2 text-gray-300 max-w-[100px] truncate">
                          {val !== null && val !== undefined ? String(val) : <span className="text-gray-600">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-gray-500 text-sm">No data found in file</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={() => { setShowPreview(false); importFleet.mutate(fleetFile); }} className="btn-primary flex-1">
              Confirm Import ({previewData?.total} rows)
            </button>
            <button onClick={() => setShowPreview(false)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
