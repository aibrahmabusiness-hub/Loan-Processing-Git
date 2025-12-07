import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { PayoutReport } from '../types';
import { exportToExcel, openOutlook } from '../utils/excelExport';
import { Plus, Download, Mail, X, Save } from 'lucide-react';
import { PAYOUT_STATUSES } from '../constants';

export const PayoutReports: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  const [reports, setReports] = useState<PayoutReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Default to current month YYYY-MM
  const initialFormState: Partial<PayoutReport> = {
    month: new Date().toISOString().slice(0, 7), 
    financier: '',
    loan_amount: 0,
    payout_percentage: 0,
    amount_paid: 0,
    less_tds: 0,
    nett_amount: 0,
    bank_details: '',
    pan_no: '',
    sm_name: '',
    contact_no: '',
    mail_sent: false,
    payment_status: 'Pending'
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const fetchReports = async () => {
    try {
      let query = supabase.from('payout_reports').select('*');
      if (!isAdmin && profile) {
        query = query.eq('created_by_user_id', profile.user_id);
      }
      const { data, error } = await query;
      if (error) throw error;
      setReports(data || []);
    } catch (err: any) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateAmounts = (updatedData: Partial<PayoutReport>) => {
     // Simple auto-calculation logic
     const amt = Number(updatedData.loan_amount || 0);
     const pct = Number(updatedData.payout_percentage || 0);
     const paid = (amt * pct) / 100;
     const tds = paid * 0.1; // Assuming 10% TDS default logic
     const nett = paid - tds;

     return {
         ...updatedData,
         amount_paid: paid,
         less_tds: tds,
         nett_amount: nett
     };
  };

  const handleInputChange = (field: keyof PayoutReport, value: any) => {
      const newData = { ...formData, [field]: value };
      if (['loan_amount', 'payout_percentage'].includes(field)) {
          setFormData(calculateAmounts(newData));
      } else {
          setFormData(newData);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const payload = { ...formData, created_by_user_id: profile.user_id };

    if (!isEditing) {
        delete (payload as any).id;
        delete (payload as any).created_at;
    }

    try {
      const { error } = isEditing 
        ? await supabase.from('payout_reports').update(payload).eq('id', formData.id)
        : await supabase.from('payout_reports').insert([payload]);

      if (error) throw error;
      setShowModal(false);
      fetchReports();
    } catch (err: any) {
      console.error(err);
      alert('Error saving report:\n' + (err.message || JSON.stringify(err)));
    }
  };

  const handleEdit = (report: PayoutReport) => {
    setFormData(report);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleExport = () => exportToExcel(reports, 'Payout_Reports');

  const handleEmail = () => {
    if (confirm("This will download the Excel file first. Please attach it manually in the Outlook window that opens next.")) {
      handleExport();
      setTimeout(() => openOutlook('', 'Payout Report', 'Attached is the payout report.'), 1000);
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Payout Reports</h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setIsEditing(false); setFormData(initialFormState); setShowModal(true); }} className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
            <Plus size={16} /> New Payout
          </button>
          <button onClick={handleExport} className="bg-white border hover:bg-gray-50 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
            <Download size={16} /> Export
          </button>
           {isAdmin && (
            <button onClick={handleEmail} className="bg-white border hover:bg-gray-50 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
              <Mail size={16} /> Send Email
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-slate-500 font-medium border-b">
              <tr>
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3">Financier</th>
                <th className="px-4 py-3">Nett Amount</th>
                <th className="px-4 py-3 hidden md:table-cell">SM Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
               {loading ? (
                <tr><td colSpan={6} className="p-4 text-center">Loading...</td></tr>
              ) : reports.length === 0 ? (
                <tr><td colSpan={6} className="p-4 text-center text-slate-500">No data found.</td></tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">{report.month}</td>
                    <td className="px-4 py-3">{report.financier}</td>
                    <td className="px-4 py-3 font-semibold">${report.nett_amount.toFixed(2)}</td>
                    <td className="px-4 py-3 hidden md:table-cell">{report.sm_name}</td>
                    <td className="px-4 py-3">
                       <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        report.payment_status === 'Paid' ? 'bg-green-100 text-green-800' :
                        report.payment_status === 'Processing' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {report.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                       { (isAdmin || report.created_by_user_id === profile?.user_id) && (
                        <button onClick={() => handleEdit(report)} className="text-blue-600 hover:text-blue-800 font-medium text-xs">Edit</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

       {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-bold">{isEditing ? 'Edit Payout' : 'New Payout'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
                <input required type="month" className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" value={formData.month} onChange={e => handleInputChange('month', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Financier</label>
                <input required type="text" className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" value={formData.financier} onChange={e => handleInputChange('financier', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Loan Amount</label>
                <input required type="number" className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" value={formData.loan_amount} onChange={e => handleInputChange('loan_amount', Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payout %</label>
                <input required type="number" step="0.01" className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" value={formData.payout_percentage} onChange={e => handleInputChange('payout_percentage', Number(e.target.value))} />
              </div>
              <div className="bg-gray-50 p-2 rounded border col-span-1 md:col-span-2 grid grid-cols-3 gap-2">
                 <div>
                    <span className="text-xs text-slate-500">Amount Paid</span>
                    <div className="font-semibold">{formData.amount_paid?.toFixed(2)}</div>
                 </div>
                 <div>
                    <span className="text-xs text-slate-500">Less TDS (10%)</span>
                    <div className="font-semibold text-red-500">-{formData.less_tds?.toFixed(2)}</div>
                 </div>
                 <div>
                    <span className="text-xs text-slate-500">Nett Amount</span>
                    <div className="font-bold text-green-600">{formData.nett_amount?.toFixed(2)}</div>
                 </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">PAN No</label>
                <input required type="text" className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" value={formData.pan_no} onChange={e => handleInputChange('pan_no', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SM Name</label>
                <input required type="text" className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" value={formData.sm_name} onChange={e => handleInputChange('sm_name', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" value={formData.payment_status} onChange={e => handleInputChange('payment_status', e.target.value)}>
                    {PAYOUT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="md:col-span-2 pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-slate-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                  <Save size={18} /> Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};