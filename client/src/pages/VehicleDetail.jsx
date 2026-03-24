import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { formatDate, formatDateTime, formatCurrencyDollars, formatKm, daysUntil } from '../utils/format';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { SkeletonTable } from '../components/Skeleton';
import toast from 'react-hot-toast';

const TABS = ['Vehicle Info', 'Contract & Lease', 'Assignment', 'Odometer & Use', 'Charges', 'Notes & History', 'Usage Log'];

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start py-2.5 border-b border-findex-midnight-border/40 last:border-0">
      <dt className="w-44 flex-shrink-0 text-sm text-gray-500 font-semibold">{label}</dt>
      <dd className="text-sm text-white flex-1">{value ?? <span className="text-gray-600">—</span>}</dd>
    </div>
  );
}

export default function VehicleDetail() {
  const { registration } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [showOdoModal, setShowOdoModal] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(null);
  const [odoForm, setOdoForm] = useState({ readingKm: '', readingDate: '', notes: '' });
  const [flagForm, setFlagForm] = useState({ reason: '', odoAtFlag: '', severity: 'WARNING' });
  const [usageForm, setUsageForm] = useState({ driverName: '', purpose: '', pickupDatetime: '', dropoffDatetime: '', pickupOdometer: '', dropoffOdometer: '', notes: '' });
  const [returnForm, setReturnForm] = useState({ dropoffDatetime: '', dropoffOdometer: '', notes: '' });
  const [notes, setNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);

  const reg = registration?.toUpperCase();

  const { data: vehicle, isLoading } = useQuery({
    queryKey: ['vehicle', reg],
    queryFn: () => api.get(`/vehicles/${reg}`).then(r => r.data),
    onSuccess: (v) => setNotes(v.notes || ''),
  });

  const { data: odoReadings } = useQuery({
    queryKey: ['vehicle', reg, 'odometer'],
    queryFn: () => api.get(`/vehicles/${reg}/odometer`).then(r => r.data),
    enabled: activeTab === 3,
  });

  const { data: charges } = useQuery({
    queryKey: ['vehicle', reg, 'charges'],
    queryFn: () => api.get(`/vehicles/${reg}/charges`).then(r => r.data),
    enabled: activeTab === 4,
  });

  const { data: flags } = useQuery({
    queryKey: ['vehicle', reg, 'flags'],
    queryFn: () => api.get(`/vehicles/${reg}/flags`).then(r => r.data),
    enabled: activeTab === 3,
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['vehicle', reg, 'audit'],
    queryFn: () => api.get(`/vehicles/${reg}/audit`).then(r => r.data),
    enabled: activeTab === 5,
  });

  const { data: usageLogs } = useQuery({
    queryKey: ['vehicle', reg, 'usage-log'],
    queryFn: () => api.get(`/vehicles/${reg}/usage-log`).then(r => r.data),
    enabled: activeTab === 6,
  });

  const addOdo = useMutation({
    mutationFn: data => api.post(`/vehicles/${reg}/odometer`, data),
    onSuccess: () => {
      qc.invalidateQueries(['vehicle', reg, 'odometer']);
      toast.success('Odometer reading added');
      setShowOdoModal(false);
      setOdoForm({ readingKm: '', readingDate: '', notes: '' });
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to add reading'),
  });

  const addFlag = useMutation({
    mutationFn: data => api.post('/personal-use/flags', { vehicleId: vehicle?.id, ...data }),
    onSuccess: () => {
      qc.invalidateQueries(['vehicle', reg, 'flags']);
      toast.success('Flag created');
      setShowFlagModal(false);
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to create flag'),
  });

  const resolveFlag = useMutation({
    mutationFn: ({ id, notes }) => api.put(`/personal-use/flags/${id}/resolve`, { resolutionNotes: notes }),
    onSuccess: () => {
      qc.invalidateQueries(['vehicle', reg, 'flags']);
      toast.success('Flag resolved');
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to resolve'),
  });

  const saveNotes = useMutation({
    mutationFn: () => api.put(`/vehicles/${reg}`, { notes }),
    onSuccess: () => { toast.success('Notes saved'); setNotesSaved(true); setTimeout(() => setNotesSaved(false), 2000); },
    onError: () => toast.error('Failed to save notes'),
  });

  const addUsage = useMutation({
    mutationFn: data => api.post('/usage-log', { vehicleId: vehicle?.id, ...data }),
    onSuccess: () => {
      qc.invalidateQueries(['vehicle', reg, 'usage-log']);
      toast.success('Usage log entry added');
      setShowUsageModal(false);
      setUsageForm({ driverName: '', purpose: '', pickupDatetime: '', dropoffDatetime: '', pickupOdometer: '', dropoffOdometer: '', notes: '' });
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to add entry'),
  });

  const returnVehicle = useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/usage-log/${id}/return`, data),
    onSuccess: () => {
      qc.invalidateQueries(['vehicle', reg, 'usage-log']);
      toast.success('Vehicle marked as returned');
      setShowReturnModal(null);
      setReturnForm({ dropoffDatetime: '', dropoffOdometer: '', notes: '' });
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  });

  const handleExportPDF = async () => {
    try {
      toast.loading('Generating PDF...', { id: 'pdf' });
      const res = await api.post('/export/pdf/vehicle', { registration: reg }, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `findex-${reg}-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded', { id: 'pdf' });
    } catch { toast.error('Export failed', { id: 'pdf' }); }
  };

  if (isLoading) return (
    <div className="space-y-4">
      <div className="h-8 skeleton w-48 rounded" />
      <div className="h-32 skeleton rounded-xl" />
      <div className="h-64 skeleton rounded-xl" />
    </div>
  );

  if (!vehicle) return (
    <EmptyState title="Vehicle not found" description={`No vehicle with registration ${reg}`} action={
      <button className="btn-primary" onClick={() => navigate('/fleet')}>← Back to Fleet</button>
    } />
  );

  const contractDays = daysUntil(vehicle.contractExpiryDate);
  const contractColor = contractDays === null ? 'gray' : contractDays < 0 ? 'red' : contractDays <= 30 ? 'red' : contractDays <= 90 ? 'orange' : 'green';
  const contractLabel = contractDays === null ? vehicle.contractStatus || '—' : contractDays < 0 ? 'Expired' : contractDays <= 30 ? `${contractDays}d left` : contractDays <= 90 ? `${contractDays}d left` : 'Active';

  // Charge totals by type
  const chargeTotals = charges?.reduce((acc, c) => {
    acc[c.chargeType] = (acc[c.chargeType] || 0) + c.amountExGst;
    return acc;
  }, {}) || {};

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate('/fleet')} className="hover:text-white transition-colors">Fleet Register</button>
        <span>/</span>
        <span className="text-white font-semibold">{reg}</span>
      </div>

      <PageHeader
        title={`${vehicle.make} ${vehicle.model} ${vehicle.variant || ''}`}
        subtitle={`${reg} · ${vehicle.state}${vehicle.country === 'NZ' ? ' · NZ' : ''}`}
        actions={
          <div className="flex items-center gap-3">
            {vehicle.takeHome && <Badge color="orange" className="text-sm px-3 py-1">Take Home</Badge>}
            {vehicle.poolCar && <Badge color="blue" className="text-sm px-3 py-1">Pool Car</Badge>}
            <Badge color={contractColor} className="text-sm px-3 py-1">{contractLabel}</Badge>
            <button onClick={handleExportPDF} className="btn-secondary text-sm">Export PDF</button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="border-b border-findex-midnight-border">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === i
                  ? 'border-findex-orange text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 0: Vehicle Info */}
      {activeTab === 0 && (
        <div className="card">
          <dl>
            <InfoRow label="Make" value={vehicle.make} />
            <InfoRow label="Model" value={vehicle.model} />
            <InfoRow label="Variant" value={vehicle.variant} />
            <InfoRow label="Model Year" value={vehicle.modelYear} />
            <InfoRow label="Body Type" value={vehicle.bodyType} />
            <InfoRow label="Colour" value={vehicle.colour} />
            <InfoRow label="Transmission" value={vehicle.transmissionType} />
            <InfoRow label="Drive Type" value={vehicle.driveType} />
            <InfoRow label="VIN" value={<span className="font-mono text-xs">{vehicle.vin}</span>} />
            <InfoRow label="Engine Number" value={<span className="font-mono text-xs">{vehicle.engineNumber}</span>} />
            <InfoRow label="Cylinders" value={vehicle.numCylinders} />
            <InfoRow label="Engine Type" value={vehicle.engineType} />
            <InfoRow label="Fuel Type" value={vehicle.fuelType} />
            <InfoRow label="Fuel Description" value={vehicle.fuelDescription} />
            <InfoRow label="Fuel Tank" value={vehicle.fuelTankCapacity ? `${vehicle.fuelTankCapacity}L` : null} />
            <InfoRow label="Build Date" value={formatDate(vehicle.buildDate)} />
            <InfoRow label="Country of Manufacture" value={vehicle.countryOfManufacture} />
            <InfoRow label="Tare Weight" value={vehicle.tareKg ? `${vehicle.tareKg.toLocaleString()} kg` : null} />
            <InfoRow label="GVM" value={vehicle.gvmKg ? `${vehicle.gvmKg.toLocaleString()} kg` : null} />
            <InfoRow label="CO₂ Emissions" value={vehicle.co2Emissions ? `${vehicle.co2Emissions} g/km` : null} />
            <InfoRow label="Greenhouse" value={vehicle.greenhouse} />
            <InfoRow label="Air Pollution" value={vehicle.airPollution} />
            <InfoRow label="Star Rating" value={vehicle.starRating ? `${vehicle.starRating}/5` : null} />
            <InfoRow label="ANCAP Rating" value={vehicle.ancapRating ? `${vehicle.ancapRating}/5` : null} />
            <InfoRow label="Warranty" value={vehicle.vehicleWarranty} />
          </dl>
        </div>
      )}

      {/* Tab 1: Contract & Lease */}
      {activeTab === 1 && (
        <div className="card">
          <dl>
            <InfoRow label="Contract Ref" value={vehicle.contractRef} />
            <InfoRow label="Contract Status" value={<Badge color={contractColor}>{vehicle.contractStatus}</Badge>} />
            <InfoRow label="Contract Term" value={vehicle.contractTerm ? `${vehicle.contractTerm} months` : null} />
            <InfoRow label="Start Date" value={formatDate(vehicle.contractStartDate)} />
            <InfoRow label="Expiry Date" value={
              <span className={contractDays !== null && contractDays <= 90 ? 'text-orange-400 font-semibold' : ''}>
                {formatDate(vehicle.contractExpiryDate)}
                {contractDays !== null && contractDays <= 90 && contractDays > 0 && ` (${contractDays} days)`}
                {contractDays !== null && contractDays < 0 && ' (expired)'}
              </span>
            } />
            <InfoRow label="Date In Service" value={formatDate(vehicle.dateInService)} />
            <InfoRow label="Contract Distance" value={formatKm(vehicle.contractDistance)} />
            <InfoRow label="Contract End KMs" value={formatKm(vehicle.contractEndKms)} />
            <InfoRow label="Annualised KMs" value={formatKm(vehicle.annualisedKms)} />
            <InfoRow label="Excess KM Rate" value={vehicle.excessKmRate ? `$${vehicle.excessKmRate}/km` : null} />
            <InfoRow label="Monthly Rental (ex GST)" value={formatCurrencyDollars(vehicle.rentalInstallmentExGst)} />
            <InfoRow label="Product Description" value={vehicle.productDescription} />
            <InfoRow label="Financier" value={vehicle.financier} />
            <InfoRow label="FBT Base Value" value={formatCurrencyDollars(vehicle.fbtBaseValue)} />
            <InfoRow label="FBT Exempt" value={vehicle.fbtExempt ? <Badge color="green">Yes</Badge> : <Badge color="gray">No</Badge>} />
            <InfoRow label="FBT Opening Odo" value={formatKm(vehicle.fbtOpeningOdo)} />
            <InfoRow label="FBT Method" value={vehicle.selectedFbtMethod} />
            <InfoRow label="Rego Plate Renewal" value={
              <span className={daysUntil(vehicle.registrationPlateRenewalDate) !== null && daysUntil(vehicle.registrationPlateRenewalDate) <= 30 ? 'text-orange-400 font-semibold' : ''}>
                {formatDate(vehicle.registrationPlateRenewalDate)}
              </span>
            } />
            <InfoRow label="Registration Renewal" value={vehicle.registrationRenewal} />
            <InfoRow label="Motor Association" value={vehicle.motorAssociation} />
            <InfoRow label="Accident Management" value={vehicle.accidentManagementPolicy} />
            <InfoRow label="Maintenance Type" value={vehicle.maintenanceTypeDescription} />
          </dl>
        </div>
      )}

      {/* Tab 2: Assignment */}
      {activeTab === 2 && (
        <div className="card">
          <dl>
            <InfoRow label="Driver Name" value={vehicle.driverName} />
            <InfoRow label="Driver Mobile" value={vehicle.driverMobilePhone} />
            <InfoRow label="Driver Email" value={vehicle.driverEmailAddress} />
            <InfoRow label="State" value={vehicle.state} />
            <InfoRow label="Country" value={vehicle.country === 'NZ' ? 'New Zealand' : 'Australia'} />
            <InfoRow label="Location" value={vehicle.location} />
            <InfoRow label="Company" value={vehicle.company} />
            <InfoRow label="Cost Centre" value={vehicle.customerCostCentre} />
            <InfoRow label="Take Home" value={vehicle.takeHome ? <Badge color="orange" className="text-base px-3 py-1">Yes — Take Home Vehicle</Badge> : 'No'} />
            <InfoRow label="Pool Car" value={vehicle.poolCar ? <Badge color="blue">Yes</Badge> : 'No'} />
            <InfoRow label="Level 1" value={vehicle.level1} />
            <InfoRow label="Level 2" value={vehicle.level2} />
            <InfoRow label="Level 3" value={vehicle.level3} />
            <InfoRow label="Asset Class" value={vehicle.assetClass} />
            <InfoRow label="Inventory Status" value={vehicle.inventoryStatus} />
            <InfoRow label="Vehicle ID" value={vehicle.vehicleId} />
          </dl>
        </div>
      )}

      {/* Tab 3: Odometer & Personal Use */}
      {activeTab === 3 && (
        <div className="space-y-5">
          {/* Latest reading */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Odometer History</h3>
              <button onClick={() => setShowOdoModal(true)} className="btn-primary text-sm">+ Add Reading</button>
            </div>
            {odoReadings?.length === 0 ? (
              <EmptyState title="No readings yet" description="Add the first odometer reading for this vehicle" />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-findex-midnight-border">
                    <th className="pb-2 font-semibold">Date</th>
                    <th className="pb-2 font-semibold">Reading</th>
                    <th className="pb-2 font-semibold">Source</th>
                    <th className="pb-2 font-semibold">Added By</th>
                    <th className="pb-2 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {odoReadings?.map(r => (
                    <tr key={r.id} className="border-b border-findex-midnight-border/40">
                      <td className="py-2.5 text-gray-300">{formatDate(r.readingDate)}</td>
                      <td className="py-2.5 font-semibold text-white">{r.readingKm.toLocaleString()} km</td>
                      <td className="py-2.5"><Badge color={r.source === 'GPS' ? 'green' : r.source === 'IMPORT' ? 'blue' : 'gray'}>{r.source}</Badge></td>
                      <td className="py-2.5 text-gray-400">{r.createdBy?.name || '—'}</td>
                      <td className="py-2.5 text-gray-500">{r.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Personal use flags */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Personal Use Flags</h3>
              <button onClick={() => setShowFlagModal(true)} className="btn-secondary text-sm">+ Add Flag</button>
            </div>
            {flags?.length === 0 ? (
              <EmptyState title="No flags" description="No personal use flags for this vehicle" />
            ) : (
              <div className="space-y-3">
                {flags?.map(f => (
                  <div key={f.id} className={`p-4 rounded-lg border ${f.severity === 'ALERT' ? 'border-red-700/50 bg-red-900/10' : 'border-orange-700/50 bg-orange-900/10'}`}>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge color={f.severity === 'ALERT' ? 'red' : 'orange'}>{f.severity}</Badge>
                          <span className="text-sm text-gray-300">{formatDate(f.flagDate)}</span>
                        </div>
                        <p className="text-white text-sm">{f.reason || 'Odometer discrepancy detected'}</p>
                        <div className="text-xs text-gray-500 space-x-4">
                          {f.odoAtFlag && <span>Actual: <span className="text-white">{f.odoAtFlag.toLocaleString()} km</span></span>}
                          {f.expectedOdo && <span>Expected: <span className="text-white">{f.expectedOdo.toLocaleString()} km</span></span>}
                          {f.discrepancyKm && <span>Discrepancy: <span className={f.severity === 'ALERT' ? 'text-red-400' : 'text-orange-400'}>+{f.discrepancyKm.toLocaleString()} km</span></span>}
                        </div>
                        <p className="text-xs text-gray-500">Flagged by {f.flaggedBy?.name}</p>
                      </div>
                      {!f.resolved && (
                        <button
                          onClick={() => { const notes = prompt('Resolution notes (optional):'); resolveFlag.mutate({ id: f.id, notes: notes || '' }); }}
                          className="btn-ghost text-xs text-emerald-400"
                        >
                          Resolve ✓
                        </button>
                      )}
                    </div>
                    {f.resolved && (
                      <div className="mt-2 pt-2 border-t border-findex-midnight-border text-xs text-gray-500">
                        ✓ Resolved {formatDate(f.resolvedDate)} by {f.resolvedBy?.name}
                        {f.resolutionNotes && ` — ${f.resolutionNotes}`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Charges */}
      {activeTab === 4 && (
        <div className="card">
          <h3 className="text-white font-semibold mb-4">Charges & Costs</h3>
          {charges?.length === 0 ? (
            <EmptyState
              title="No charges yet"
              description="Import account statements to see charges for this vehicle"
              action={<button className="btn-primary text-sm" onClick={() => navigate('/import')}>Import Statements</button>}
            />
          ) : (
            <>
              {/* Totals by type */}
              {Object.keys(chargeTotals).length > 0 && (
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-5">
                  {Object.entries(chargeTotals).map(([type, total]) => (
                    <div key={type} className="bg-findex-midnight-lighter rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-500 mb-1">{type}</div>
                      <div className="text-sm font-semibold text-white">{formatCurrencyDollars(total / 100)}</div>
                    </div>
                  ))}
                </div>
              )}
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-findex-midnight-border">
                    <th className="pb-2 font-semibold">Date</th>
                    <th className="pb-2 font-semibold">Type</th>
                    <th className="pb-2 font-semibold">Description</th>
                    <th className="pb-2 font-semibold text-right">Ex GST</th>
                    <th className="pb-2 font-semibold text-right">Inc GST</th>
                  </tr>
                </thead>
                <tbody>
                  {charges?.map(c => (
                    <tr key={c.id} className="border-b border-findex-midnight-border/40">
                      <td className="py-2.5 text-gray-400">{formatDate(c.chargeDate)}</td>
                      <td className="py-2.5"><Badge color="blue">{c.chargeType}</Badge></td>
                      <td className="py-2.5 text-gray-300">{c.description || '—'}</td>
                      <td className="py-2.5 text-right text-white font-semibold">{formatCurrencyDollars(c.amountExGst / 100)}</td>
                      <td className="py-2.5 text-right text-gray-400">{formatCurrencyDollars(c.amountIncGst / 100)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* Tab 5: Notes & History */}
      {activeTab === 5 && (
        <div className="space-y-5">
          <div className="card">
            <h3 className="text-white font-semibold mb-3">Notes</h3>
            <textarea
              className="input h-32 resize-none"
              placeholder="Add notes about this vehicle..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-600">Notes are visible to all users</span>
              <button onClick={() => saveNotes.mutate()} disabled={saveNotes.isLoading} className="btn-primary text-sm">
                {notesSaved ? '✓ Saved' : saveNotes.isLoading ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>
          <div className="card">
            <h3 className="text-white font-semibold mb-4">Audit History</h3>
            {auditLogs?.length === 0 ? (
              <EmptyState title="No audit history" description="Changes to this vehicle will appear here" />
            ) : (
              <div className="space-y-2">
                {auditLogs?.map(log => (
                  <div key={log.id} className="flex items-start gap-3 py-3 border-b border-findex-midnight-border/40">
                    <div className="w-2 h-2 rounded-full bg-findex-orange mt-1.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-white">{log.user?.name}</span>
                        <span className="text-gray-500">{log.action}</span>
                        <span className="text-gray-600 text-xs ml-auto">{formatDateTime(log.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 6: Usage Log */}
      {activeTab === 6 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Usage Log</h3>
            <button onClick={() => setShowUsageModal(true)} className="btn-primary text-sm">+ Log Usage</button>
          </div>
          {usageLogs?.length === 0 ? (
            <EmptyState title="No usage entries" description="Log vehicle usage to track who has used this vehicle" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-findex-midnight-border">
                  <th className="pb-2 font-semibold">Driver</th>
                  <th className="pb-2 font-semibold">Purpose</th>
                  <th className="pb-2 font-semibold">Pickup</th>
                  <th className="pb-2 font-semibold">Dropoff</th>
                  <th className="pb-2 font-semibold">Trip KM</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {usageLogs?.map(log => {
                  const isStale = log.status === 'ACTIVE' && new Date() - new Date(log.pickupDatetime) > 24 * 60 * 60 * 1000;
                  return (
                    <tr key={log.id} className={`border-b border-findex-midnight-border/40 ${isStale ? 'bg-orange-900/10' : ''}`}>
                      <td className="py-2.5 text-white font-semibold">{log.driverName}</td>
                      <td className="py-2.5 text-gray-400 max-w-[140px] truncate">{log.purpose || '—'}</td>
                      <td className="py-2.5 text-gray-400">{formatDateTime(log.pickupDatetime)}</td>
                      <td className="py-2.5 text-gray-400">{log.dropoffDatetime ? formatDateTime(log.dropoffDatetime) : '—'}</td>
                      <td className="py-2.5 text-gray-400">{log.tripKm ? `${log.tripKm.toLocaleString()} km` : '—'}</td>
                      <td className="py-2.5">
                        <Badge color={log.status === 'ACTIVE' ? 'green' : log.status === 'CANCELLED' ? 'red' : 'gray'}>
                          {log.status}{isStale && ' ⚠'}
                        </Badge>
                      </td>
                      <td className="py-2.5">
                        {log.status === 'ACTIVE' && (
                          <button
                            onClick={() => setShowReturnModal(log)}
                            className="text-xs text-findex-orange hover:underline"
                          >
                            Mark Returned
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add Odometer Modal */}
      <Modal open={showOdoModal} onClose={() => setShowOdoModal(false)} title="Add Odometer Reading">
        <div className="space-y-4">
          <div>
            <label className="label">Reading (km)</label>
            <input type="number" className="input" placeholder="e.g. 45321" value={odoForm.readingKm} onChange={e => setOdoForm(f => ({ ...f, readingKm: e.target.value }))} />
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={odoForm.readingDate} onChange={e => setOdoForm(f => ({ ...f, readingDate: e.target.value }))} />
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <input type="text" className="input" placeholder="e.g. Monthly reading" value={odoForm.notes} onChange={e => setOdoForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => addOdo.mutate(odoForm)} disabled={addOdo.isLoading} className="btn-primary flex-1">
              {addOdo.isLoading ? 'Saving...' : 'Add Reading'}
            </button>
            <button onClick={() => setShowOdoModal(false)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Add Flag Modal */}
      <Modal open={showFlagModal} onClose={() => setShowFlagModal(false)} title="Add Personal Use Flag">
        <div className="space-y-4">
          <div>
            <label className="label">Severity</label>
            <select className="input" value={flagForm.severity} onChange={e => setFlagForm(f => ({ ...f, severity: e.target.value }))}>
              <option value="WARNING">WARNING (10–25% over)</option>
              <option value="ALERT">ALERT (&gt;25% over)</option>
            </select>
          </div>
          <div>
            <label className="label">Actual Odometer Reading</label>
            <input type="number" className="input" placeholder="km" value={flagForm.odoAtFlag} onChange={e => setFlagForm(f => ({ ...f, odoAtFlag: e.target.value }))} />
          </div>
          <div>
            <label className="label">Reason</label>
            <textarea className="input h-20 resize-none" placeholder="Describe the discrepancy..." value={flagForm.reason} onChange={e => setFlagForm(f => ({ ...f, reason: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => addFlag.mutate(flagForm)} disabled={addFlag.isLoading} className="btn-primary flex-1">
              {addFlag.isLoading ? 'Saving...' : 'Create Flag'}
            </button>
            <button onClick={() => setShowFlagModal(false)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Log Usage Modal */}
      <Modal open={showUsageModal} onClose={() => setShowUsageModal(false)} title="Log Vehicle Usage" size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Staff Member Name *</label>
            <input type="text" className="input" placeholder="Any employee name" value={usageForm.driverName} onChange={e => setUsageForm(f => ({ ...f, driverName: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className="label">Purpose of Use</label>
            <input type="text" className="input" placeholder="e.g. Client visit — Melbourne CBD" value={usageForm.purpose} onChange={e => setUsageForm(f => ({ ...f, purpose: e.target.value }))} />
          </div>
          <div>
            <label className="label">Pickup Date & Time *</label>
            <input type="datetime-local" className="input" value={usageForm.pickupDatetime} onChange={e => setUsageForm(f => ({ ...f, pickupDatetime: e.target.value }))} />
          </div>
          <div>
            <label className="label">Dropoff Date & Time (optional)</label>
            <input type="datetime-local" className="input" value={usageForm.dropoffDatetime} onChange={e => setUsageForm(f => ({ ...f, dropoffDatetime: e.target.value }))} />
          </div>
          <div>
            <label className="label">Pickup Odometer (optional)</label>
            <input type="number" className="input" placeholder="km" value={usageForm.pickupOdometer} onChange={e => setUsageForm(f => ({ ...f, pickupOdometer: e.target.value }))} />
          </div>
          <div>
            <label className="label">Dropoff Odometer (optional)</label>
            <input type="number" className="input" placeholder="km" value={usageForm.dropoffOdometer} onChange={e => setUsageForm(f => ({ ...f, dropoffOdometer: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className="label">Notes (optional)</label>
            <input type="text" className="input" placeholder="Any additional notes" value={usageForm.notes} onChange={e => setUsageForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="col-span-2 flex gap-3 pt-2">
            <button onClick={() => addUsage.mutate(usageForm)} disabled={addUsage.isLoading} className="btn-primary flex-1">
              {addUsage.isLoading ? 'Saving...' : 'Log Usage'}
            </button>
            <button onClick={() => setShowUsageModal(false)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Mark Returned Modal */}
      <Modal open={!!showReturnModal} onClose={() => setShowReturnModal(null)} title="Mark Vehicle Returned">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Driver: <span className="text-white font-semibold">{showReturnModal?.driverName}</span></p>
          <div>
            <label className="label">Dropoff Date & Time</label>
            <input type="datetime-local" className="input" value={returnForm.dropoffDatetime} onChange={e => setReturnForm(f => ({ ...f, dropoffDatetime: e.target.value }))} />
          </div>
          <div>
            <label className="label">Dropoff Odometer (optional)</label>
            <input type="number" className="input" placeholder="km" value={returnForm.dropoffOdometer} onChange={e => setReturnForm(f => ({ ...f, dropoffOdometer: e.target.value }))} />
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <input type="text" className="input" value={returnForm.notes} onChange={e => setReturnForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => returnVehicle.mutate({ id: showReturnModal?.id, ...returnForm })}
              disabled={returnVehicle.isLoading}
              className="btn-primary flex-1"
            >
              {returnVehicle.isLoading ? 'Saving...' : 'Mark Returned'}
            </button>
            <button onClick={() => setShowReturnModal(null)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
