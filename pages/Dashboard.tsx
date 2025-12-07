import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export const Dashboard: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  const [stats, setStats] = useState({
    inspections: 0,
    volume: 0,
    paid: 0,
    pending: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const fetchStats = async () => {
    if (!profile) return;

    try {
      let inspectionQuery = supabase.from('field_inspection_reports').select('*');
      let payoutQuery = supabase.from('payout_reports').select('*');

      // Field Agents only see their own data
      if (!isAdmin) {
        inspectionQuery = inspectionQuery.eq('created_by_user_id', profile.user_id);
        payoutQuery = payoutQuery.eq('created_by_user_id', profile.user_id);
      }

      const [inspectionRes, payoutRes] = await Promise.all([inspectionQuery, payoutQuery]);

      const inspections = inspectionRes.data || [];
      const payouts = payoutRes.data || [];

      const totalVolume = inspections.reduce((sum, item) => sum + (Number(item.loan_amount) || 0), 0);
      const pending = payouts.filter(p => p.payment_status === 'Pending').length;
      const paid = payouts.filter(p => p.payment_status === 'Paid').length;

      setStats({
        inspections: inspections.length,
        volume: totalVolume,
        paid,
        pending
      });

      // Prepare chart data (Region breakdown for inspections)
      const regionMap: Record<string, number> = {};
      inspections.forEach(i => {
        const region = i.region || 'Unknown';
        regionMap[region] = (regionMap[region] || 0) + 1;
      });

      const processedChartData = Object.keys(regionMap).map(key => ({ name: key, count: regionMap[key] }));
      setChartData(processedChartData.length > 0 ? processedChartData : [{ name: 'No Data', count: 0 }]);
      
      setPieData([
        { name: 'Paid', value: paid },
        { name: 'Pending', value: pending }
      ]);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl border shadow-sm flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
    </div>
  );

  if (loading) return <div className="p-8">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Welcome back, {profile?.full_name?.split(' ')[0]}
        </h1>
        <p className="text-slate-500">Here's what's happening today.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Inspections" 
          value={stats.inspections} 
          icon={FileText} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Total Loan Volume" 
          value={`$${stats.volume.toLocaleString()}`} 
          icon={DollarSign} 
          color="bg-green-500" 
        />
        <StatCard 
          title="Pending Payouts" 
          value={stats.pending} 
          icon={AlertCircle} 
          color="bg-orange-500" 
        />
        <StatCard 
          title="Completed Payouts" 
          value={stats.paid} 
          icon={CheckCircle} 
          color="bg-teal-500" 
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Inspections by Region</h3>
          {/* Explicit height wrapper to prevent re-charts width(-1) error */}
          <div className="h-[300px] w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Payout Status Distribution</h3>
          {/* Explicit height wrapper to prevent re-charts width(-1) error */}
          <div className="h-[300px] w-full min-h-[300px] flex items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#f97316" />
                </Pie>
                <Tooltip />
              </PieChart>
             </ResponsiveContainer>
          </div>
           <div className="flex justify-center gap-4 text-sm mt-4">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Paid</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500"></div> Pending</div>
            </div>
        </div>
      </div>
    </div>
  );
};