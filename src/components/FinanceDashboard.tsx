import { useState, useMemo } from 'react';
import { Quote, Product } from '../types';
import { TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon, ArrowUpRight, ArrowDownLeft, Calendar, Download } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { cn } from '../lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FinanceDashboardProps {
  quotes: Quote[];
  products: Product[];
}

export default function FinanceDashboard({ quotes, products }: FinanceDashboardProps) {
  const [timeRange, setTimeRange] = useState<'month' | 'year' | 'all'>('month');

  const stats = useMemo(() => {
    const completedOrders = quotes.filter(q => q.status === 'completed');
    
    let totalRevenue = 0;
    let totalCost = 0;
    
    const categoryStats: Record<string, { revenue: number, cost: number, profit: number }> = {};

    completedOrders.forEach(order => {
      totalRevenue += order.totalAmount;
      order.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const itemCost = (product.costPrice || 0) * item.totalArea * item.quantity;
          totalCost += itemCost;

          if (!categoryStats[product.category]) {
            categoryStats[product.category] = { revenue: 0, cost: 0, profit: 0 };
          }
          categoryStats[product.category].revenue += (item.totalPrice);
          categoryStats[product.category].cost += itemCost;
          categoryStats[product.category].profit = categoryStats[product.category].revenue - categoryStats[product.category].cost;
        }
      });
    });

    const profit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return { totalRevenue, totalCost, profit, margin, count: completedOrders.length, categoryStats };
  }, [quotes, products]);

  const chartData = useMemo(() => {
    // Group quotes by month
    const months: Record<string, { name: string, revenue: number, profit: number }> = {};
    const last6Months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return d.toLocaleString('vi-VN', { month: 'short' });
    }).reverse();

    last6Months.forEach(m => months[m] = { name: m, revenue: 0, profit: 0 });

    quotes.filter(q => q.status === 'completed').forEach(q => {
      const m = new Date(q.createdAt).toLocaleString('vi-VN', { month: 'short' });
      if (months[m]) {
        months[m].revenue += q.totalAmount;
        let cost = 0;
        q.items.forEach(item => {
          const product = products.find(p => p.id === item.productId);
          if (product) cost += (product.costPrice || 0) * item.totalArea * item.quantity;
        });
        months[m].profit += (q.totalAmount - cost);
      }
    });

    return Object.values(months);
  }, [quotes, products]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const exportFinancialReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text('BAO CAO TAI CHINH - CO NGHE POS', 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(`Ngay xuat: ${new Date().toLocaleDateString()}`, 20, 40);
    doc.text(`Ky bao cao: ${timeRange === 'month' ? 'Thang nay' : timeRange === 'year' ? 'Nam nay' : 'Toan thoi gian'}`, 20, 50);

    const dataRows = [
      ['Tong Doanh Thu', formatCurrency(stats.totalRevenue)],
      ['Gia Von Hang Ban (COGS)', formatCurrency(stats.totalCost)],
      ['Loi Nhuan Gop', formatCurrency(stats.profit)],
      ['Bien Loi Nhuan', `${stats.margin.toFixed(2)}%`],
      ['So Giao Keo Tat Toan', stats.count.toString()]
    ];

    autoTable(doc, {
      startY: 60,
      head: [['Hang muc', 'So lieu Tai chinh']],
      body: dataRows,
    });

    doc.save(`BaoCaoTaiChinh_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToCSV = () => {
    const headers = ['Dòng đồ', 'Doanh thu', 'Giá vốn', 'Lợi nhuận', 'Tỷ lệ %'];
    const rows = Object.entries(stats.categoryStats as Record<string, { revenue: number, cost: number, profit: number }>).map(([cat, data]: [string, any]) => [
      cat,
      data.revenue,
      data.cost,
      data.profit,
      ((data.profit / (data.revenue || 1)) * 100).toFixed(1) + '%'
    ]);

    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bao_cao_LOLA_POS_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
        <h1 className="text-3xl font-serif font-black text-wood-900 italic">Thống kê Tài chính</h1>
        <div className="flex gap-2">
          <button 
            onClick={exportToCSV}
            className="px-4 py-3 bg-wood-100 text-wood-800 rounded-2xl font-black flex items-center gap-2 hover:bg-wood-200 transition-all"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button 
            onClick={exportFinancialReport}
            className="px-6 py-3 bg-wood-800 text-white rounded-2xl font-black flex items-center gap-2 hover:bg-wood-900 transition-all shadow-lg shadow-wood-100"
          >
            <Download className="w-5 h-5" />
            Xuất PDF
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-wood-100 shadow-sm space-y-4">
          <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-wood-400 font-black uppercase tracking-widest mb-1">Doanh thu tổng</p>
            <h3 className="text-2xl font-serif font-black text-wood-900">{formatCurrency(stats.totalRevenue)}</h3>
            <p className="text-xs text-emerald-600 font-bold flex items-center gap-1 mt-2">
              <TrendingUp className="w-3 h-3" /> +12.5% <span className="text-wood-400 font-normal italic">so với tháng trước</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-wood-100 shadow-sm space-y-4">
          <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-wood-400 font-black uppercase tracking-widest mb-1">Giá vốn hàng bán</p>
            <h3 className="text-2xl font-serif font-black text-wood-900">{formatCurrency(stats.totalCost)}</h3>
            <p className="text-xs text-wood-400 italic mt-2">Chiếm {(stats.totalRevenue > 0 ? (stats.totalCost/stats.totalRevenue*100) : 0).toFixed(1)}% doanh thu</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-wood-100 shadow-sm space-y-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-wood-400 font-black uppercase tracking-widest mb-1">Lợi nhuận gộp</p>
            <h3 className="text-2xl font-serif font-black text-emerald-700">{formatCurrency(stats.profit)}</h3>
            <p className="text-xs text-emerald-600 font-bold mt-2">Biên lợi nhuận: {stats.margin.toFixed(1)}%</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-wood-100 shadow-sm space-y-4">
          <div className="w-12 h-12 bg-wood-900 rounded-2xl flex items-center justify-center text-amber-400">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-wood-400 font-black uppercase tracking-widest mb-1">Số giao kèo tất toán</p>
            <h3 className="text-2xl font-serif font-black text-wood-900">{stats.count}</h3>
            <p className="text-xs text-wood-400 italic mt-2">Trạng thái: Hoàn tất</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-wood-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-wood-900" />
              <h3 className="text-xl font-serif font-bold text-wood-900">Biểu đồ Doanh thu & Lợi nhuận</h3>
            </div>
            <div className="flex bg-wood-50 p-1 rounded-xl">
              {(['month', 'year'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                    timeRange === r ? "bg-white text-wood-900 shadow-sm" : "text-wood-400 hover:text-wood-600"
                  )}
                >
                  {r === 'month' ? 'Tháng này' : 'Năm nay'}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0E6DC" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9C8C7D', fontSize: 10, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9C8C7D', fontSize: 10, fontWeight: 700 }}
                  tickFormatter={(val) => `${(val / 1000000).toFixed(0)}tr`}
                />
                <Tooltip 
                  cursor={{ fill: '#F9F6F3' }}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: '1px solid #F0E6DC', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontFamily: 'Inter, sans-serif'
                  }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
                <Bar dataKey="revenue" name="Doanh thu" fill="#1C1917" radius={[4, 4, 0, 0]} barSize={32} />
                <Bar dataKey="profit" name="Lợi nhuận" fill="#D97706" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Analysis */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-wood-100 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <PieChartIcon className="w-6 h-6 text-wood-900" />
            <h3 className="text-xl font-serif font-bold text-wood-900">Tỷ trọng Bảo vật</h3>
          </div>
          <div className="h-[250px] w-full mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Sập gụ', value: 40 },
                    { name: 'Tủ chè', value: 30 },
                    { name: 'Bàn ghế', value: 30 },
                  ]}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#1C1917" />
                  <Cell fill="#D97706" />
                  <Cell fill="#9C8C7D" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-wood-900" />
                <span className="text-sm font-medium text-wood-700">Đồ Gỗ Mỹ Nghệ</span>
              </div>
              <span className="font-bold">40%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-600" />
                <span className="text-sm font-medium text-wood-700">Cổ vật Sưu tầm</span>
              </div>
              <span className="font-bold">35%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-wood-400" />
                <span className="text-sm font-medium text-wood-700">Tranh & Vật phẩm</span>
              </div>
              <span className="font-bold">25%</span>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white p-8 rounded-[2.5rem] border border-wood-100 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <PieChartIcon className="w-6 h-6 text-wood-900" />
          <h3 className="text-xl font-serif font-bold text-wood-900">Chi tiết Lợi nhuận theo Dòng đồ</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-wood-50">
                <th className="py-4 text-xs font-bold text-wood-400 uppercase tracking-widest">Phân loại</th>
                <th className="py-4 text-right text-xs font-bold text-wood-400 uppercase tracking-widest">Doanh thu</th>
                <th className="py-4 text-right text-xs font-bold text-wood-400 uppercase tracking-widest">Lợi nhuận</th>
                <th className="py-4 text-right text-xs font-bold text-wood-400 uppercase tracking-widest">Biên LN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-wood-50">
              {Object.entries(stats.categoryStats as Record<string, { revenue: number, cost: number, profit: number }>).map(([category, data]: [string, any]) => (
                <tr key={category} className="hover:bg-wood-50/50 transition-colors">
                  <td className="py-4 font-bold text-wood-900">{category}</td>
                  <td className="py-4 text-right font-medium text-wood-700">{formatCurrency(data.revenue)}</td>
                  <td className="py-4 text-right font-black text-emerald-700">{formatCurrency(data.profit)}</td>
                  <td className="py-4 text-right">
                    <span className="inline-block px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold">
                      {((data.profit / (data.revenue || 1)) * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
              {Object.keys(stats.categoryStats).length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-wood-400 italic">Chưa có dữ liệu giao kèo hoàn tất</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
