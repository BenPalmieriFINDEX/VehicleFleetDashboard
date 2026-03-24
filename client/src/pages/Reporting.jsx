import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../utils/api';
import { formatCurrencyDollars } from '../utils/format';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { SkeletonCard } from '../components/Skeleton';
import toast from 'react-hot-toast';

const ORANGE = '#D43D27';
const COLORS = ['#D43D27', '#F4693A', '#1d9bf0', '#22c55e', '#a855f7', '#f59e0b'];

export default function Reporting() {
  const { data: costCentre, isLoading: ccLoading } = useQuery({
    queryKey: ['reporting', 'by-costcentre'],
    queryFn: () => api.get('/reporting/by-costcentre').then(r => r.data),
  });

  const { data: chargeTypes } = useQuery({
    queryKey: ['reporting', 'by-chargetype'],
    queryFn: () => api.get('/reporting/by-chargetype').then(r => r.data),
  });

  const { data: byState } = useQuery({
    queryKey: ['reporting', 'fleet-by-state'],
    queryFn: () => api.get('/reporting/fleet-by-state').then(r => r.data),
  });

  const handleExportPDF = async () => {
    try {
      toast.loading('Generating PDF...', { id: 'pdf' });
      const res = await api.post('/export/pdf/cost-centre', {}, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `findex-cost-centre-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded', { id: 'pdf' });
    } catch { toast.error('Export failed', { id: 'pdf' }); }
  };

  const totalMonthlyLease = costCentre?.reduce((sum, cc) => sum + (cc.monthlyLeaseCost || 0), 0) || 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cost Centre & Reporting"
        subtitle="Fleet costs grouped by cost centre, state and charge type"
        actions={<button onClick={handleExportPDF} className="btn-secondary text-sm">Export PDF</button>}
      />

      {/* Summary totals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-gray-500 font-semibold">Total Monthly Lease (est.)</p>
          <p className="text-3xl font-bold text-white mt-1">{formatCurrencyDollars(totalMonthlyLease)}</p>
          <p className="text-xs text-gray-500 mt-1">ex GST · based on rental installments</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 font-semibold">Annual Lease (est.)</p>
          <p className="text-3xl font-bold text-white mt-1">{formatCurrencyDollars(totalMonthlyLease * 12)}</p>
          <p className="text-xs text-gray-500 mt-1">ex GST · projected annual</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 font-semibold">Cost Centres</p>
          <p className="text-3xl font-bold text-white mt-1">{costCentre?.length || 0}</p>
          <p className="text-xs text-gray-500 mt-1">unique cost centres with fleet vehicles</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* By State Chart */}
        <div className="card">
          <h3 className="text-white font-semibold mb-4">Fleet Distribution by State</h3>
          {byState?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byState} margin={{ left: -20 }}>
                <XAxis dataKey="state" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#252C30', border: '1px solid #3A444A', borderRadius: 8, color: '#fff' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {byState?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No data" description="Import fleet data to see distribution" />}
        </div>

        {/* Charge types */}
        <div className="card">
          <h3 className="text-white font-semibold mb-4">Charges by Type</h3>
          {chargeTypes?.length === 0 || !chargeTypes ? (
            <EmptyState title="No charge data" description="Import account statements to see charges by type" />
          ) : (
            <div className="space-y-2">
              {chargeTypes.map((ct, i) => (
                <div key={`${ct.chargeType}-${ct.fyPeriod}`} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-gray-300 text-sm flex-1">{ct.chargeType}</span>
                  <span className="text-xs text-gray-500">{ct.fyPeriod}</span>
                  <span className="text-white font-semibold text-sm">{formatCurrencyDollars((ct._sum?.amountExGst || 0) / 100)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FY Comparison placeholder */}
      <div className="card border border-dashed border-findex-midnight-border">
        <div className="text-center py-6">
          <div className="text-gray-600 text-4xl mb-3">📊</div>
          <h3 className="text-white font-semibold">FY25 vs FY26 YTD Comparison</h3>
          <p className="text-gray-500 text-sm mt-1">Import FY25 and FY26 account statements to unlock year-over-year cost comparison charts</p>
          <button className="btn-primary text-sm mt-4" onClick={() => window.location.href = '/import'}>Import Statements →</button>
        </div>
      </div>

      {/* Cost Centre Table */}
      <div className="card">
        <h3 className="text-white font-semibold mb-4">By Cost Centre</h3>
        {ccLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        ) : costCentre?.length === 0 ? (
          <EmptyState title="No cost centre data" description="Vehicles will appear here once imported with cost centre assignments" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-findex-midnight-border">
                  <th className="pb-2 font-semibold">Cost Centre</th>
                  <th className="pb-2 font-semibold">Level 1</th>
                  <th className="pb-2 font-semibold">Level 2</th>
                  <th className="pb-2 font-semibold text-right">Vehicles</th>
                  <th className="pb-2 font-semibold text-right">Monthly Lease (ex GST)</th>
                  <th className="pb-2 font-semibold text-right">Annual (est.)</th>
                </tr>
              </thead>
              <tbody>
                {costCentre?.sort((a, b) => b.monthlyLeaseCost - a.monthlyLeaseCost).map(cc => (
                  <tr key={cc.costCentre} className="border-b border-findex-midnight-border/40">
                    <td className="py-2.5 text-white font-semibold">{cc.costCentre}</td>
                    <td className="py-2.5 text-gray-400">{cc.level1 || '—'}</td>
                    <td className="py-2.5 text-gray-400">{cc.level2 || '—'}</td>
                    <td className="py-2.5 text-right text-gray-300">{cc.vehicleCount}</td>
                    <td className="py-2.5 text-right text-white font-semibold">{formatCurrencyDollars(cc.monthlyLeaseCost)}</td>
                    <td className="py-2.5 text-right text-gray-400">{formatCurrencyDollars(cc.monthlyLeaseCost * 12)}</td>
                  </tr>
                ))}
                <tr className="border-t border-findex-midnight-border">
                  <td className="pt-3 text-white font-bold" colSpan={4}>Total</td>
                  <td className="pt-3 text-right text-findex-orange font-bold">{formatCurrencyDollars(totalMonthlyLease)}</td>
                  <td className="pt-3 text-right text-findex-orange font-bold">{formatCurrencyDollars(totalMonthlyLease * 12)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
