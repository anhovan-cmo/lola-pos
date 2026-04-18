import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  ArrowUpRight,
  Package,
  DollarSign,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { Quote, Product } from '../types.ts';
import { formatCurrency, formatNumber, cn } from '../lib/utils.ts';
import { motion, AnimatePresence } from 'motion/react';
import { apiService } from '../services/apiService';

interface DashboardProps {
  quotes: Quote[];
  products: Product[];
  stockThreshold: number;
}

const data = [
  { name: 'Thứ 2', revenue: 45000000 },
  { name: 'Thứ 3', revenue: 32000000 },
  { name: 'Thứ 4', revenue: 58000000 },
  { name: 'Thứ 5', revenue: 42000000 },
  { name: 'Thứ 6', revenue: 65000000 },
  { name: 'Thứ 7', revenue: 89000000 },
  { name: 'CN', revenue: 75000000 },
];

export default function Dashboard({ quotes, products, stockThreshold }: DashboardProps) {
  const totalRevenue = quotes.reduce((acc, q) => acc + q.totalAmount, 0);
  
  const lowStockItems = products.filter(p => (p.stock || 0) <= stockThreshold);
  
  const stats = [
    { label: 'Ngân xuyến thu về', value: formatCurrency(totalRevenue || 0), icon: DollarSign, color: 'text-amber-700', bg: 'bg-amber-50' },
    { label: 'Hợp thư giao kèo', value: formatNumber(quotes.length), icon: ShoppingBag, color: 'text-wood-700', bg: 'bg-wood-50' },
    { label: 'Môn đồ tri kỷ', value: formatNumber(8), icon: Users, color: 'text-stone-700', bg: 'bg-stone-50' },
    { label: 'Bảo vật hiện hữu', value: formatNumber(products.length), icon: Package, color: 'text-wood-900', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-10">
      {/* Page Heading */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-wood-100">
        <div>
          <h1 className="text-4xl font-display font-black text-wood-900 tracking-tighter">Tổng quan Niên giám</h1>
          <p className="text-base text-wood-500 font-serif italic mt-1 font-medium italic">Vận hành tâm khảm, quản vụ bảo vật kinh kỳ</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-wood-100 shadow-sm">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
           <span className="small-caps !text-emerald-700">Tâm linh kết nối</span>
        </div>
      </header>

      {/* Low Stock Alerts */}
      <AnimatePresence>
        {lowStockItems.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-rose-50 border border-rose-100 rounded-[2.5rem] p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl shadow-rose-900/5"
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-rose-500 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-rose-500/20 rotate-3">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-display font-bold text-rose-900">Cảnh báo Tồn kho</h3>
                <p className="text-sm text-rose-700 font-medium font-serif italic">Có {lowStockItems.length} bảo vật sắp cạn kiệt trong Kho lục.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex -space-x-4 overflow-hidden">
                {lowStockItems.slice(0, 4).map(p => (
                  <div key={p.id} className="inline-block h-10 w-10 rounded-2xl border-4 border-white bg-wood-100 flex items-center justify-center text-xs font-black text-wood-600 shadow-sm" title={p.name}>
                    {p.name.charAt(0)}
                  </div>
                ))}
                {lowStockItems.length > 4 && (
                  <div className="inline-block h-10 w-10 rounded-2xl border-4 border-white bg-rose-200 flex items-center justify-center text-[10px] font-black text-rose-700 shadow-sm">
                    +{lowStockItems.length - 4}
                  </div>
                )}
              </div>
              <button 
                onClick={async () => {
                  try {
                    const html = `
                      <h2>Cảnh báo Tồn kho Bảo vật</h2>
                      <p>Hiện có ${lowStockItems.length} bảo vật đang dưới ngưỡng an toàn (${stockThreshold}).</p>
                      ${lowStockItems.map(p => `<p><b>${p.name}</b>: Còn ${p.stock || 0} ${p.unit}</p>`).join('')}
                    `;
                    await apiService.sendEmailNotification('Cảnh báo Tồn kho - LOLA POS', html);
                    alert('Đã gửi thư báo tới Chưởng môn.');
                  } catch (e) {
                    alert('Lỗi gửi thư: ' + (e as any).message);
                  }
                }}
                className="px-6 py-3 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20 flex items-center gap-2 active:scale-95"
              >
                <ShoppingBag className="w-4 h-4" /> Báo cáo Chưởng môn
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="antique-card p-8 group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
               <stat.icon className="w-24 h-24" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className={stat.bg + " p-3 rounded-2xl border border-wood-100 shadow-sm group-hover:scale-110 transition-transform"}>
                  <stat.icon className={stat.color + " w-6 h-6"} />
                </div>
                <div className="bg-amber-50 text-[10px] font-black text-amber-500 px-3 py-1 rounded-full border border-amber-100 flex items-center gap-1">
                   <ArrowUpRight className="w-3 h-3" /> THƯỢNG
                </div>
              </div>
              <p className="small-caps mb-1">{stat.label}</p>
              <h3 className="text-3xl font-display font-black text-wood-950 tracking-tighter">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main Chart */}
        <div className="lg:col-span-2 antique-card p-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div>
              <h3 className="text-2xl font-display font-bold text-wood-900">Biểu đồ Kim Ngạch</h3>
              <p className="text-wood-500 font-serif italic text-sm">Thống kê vận vụ mua bán theo tuần trăng</p>
            </div>
            <div className="flex gap-2">
               {['Tuần', 'Tháng', 'Kỳ'].map((t) => (
                 <button key={t} className={cn(
                   "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                   t === 'Tuần' ? "bg-wood-900 text-white border-wood-900 shadow-lg shadow-wood-900/20" : "bg-white text-wood-400 border-wood-100 hover:bg-wood-50"
                 )}>{t}</button>
               ))}
            </div>
          </div>
          <div className="h-[400px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8E5D3D" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#8E5D3D" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#E5D8CC" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#8E5D3D', fontSize: 12, fontWeight: 700 }} 
                  dy={15}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#8E5D3D', fontSize: 12, fontWeight: 700 }}
                  tickFormatter={(value) => `${value / 1000000}tr`}
                  dx={-10}
                />
                <Tooltip 
                  cursor={{ stroke: '#8E5D3D', strokeWidth: 2, strokeDasharray: '5 5' }}
                  contentStyle={{ borderRadius: '24px', border: 'none', backgroundColor: '#2D1B0D', color: '#fff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', padding: '16px' }}
                  itemStyle={{ color: '#fff', fontWeight: 700 }}
                  labelStyle={{ color: '#E5D8CC', marginBottom: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '10px' }}
                  formatter={(value: number) => [formatCurrency(value), 'Hành ngân']}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#8E5D3D" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Quotes */}
        <div className="antique-card p-10 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-display font-bold text-wood-900">Giao kèo mới</h3>
            <span className="small-caps opacity-50">Niên giám</span>
          </div>
          <div className="space-y-8 flex-1">
            {quotes.length > 0 ? quotes.slice(0, 5).map((quote, i) => (
              <div key={i} className="flex items-center justify-between group cursor-pointer hover:translate-x-1 transition-transform">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-wood-50 flex items-center justify-center font-black text-wood-800 border border-wood-100 group-hover:bg-wood-900 group-hover:text-white transition-colors duration-300">
                    {quote.customerName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-wood-900 group-hover:text-wood-700 transition-colors">{quote.customerName}</h4>
                    <p className="text-[10px] text-wood-400 font-black uppercase tracking-widest">{format(new Date(quote.createdAt), 'dd/MM/yyyy')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base font-display font-black text-wood-900">{formatCurrency(quote.totalAmount)}</p>
                  <span className={cn(
                    "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border",
                    quote.status === 'completed' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                    quote.status === 'ordered' ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-stone-50 text-stone-600 border-stone-100"
                  )}>
                    {quote.status}
                  </span>
                </div>
              </div>
            )) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
                <div className="w-20 h-20 bg-wood-50 rounded-[2rem] flex items-center justify-center text-wood-100 mb-6 border-2 border-dashed border-wood-100">
                   <Clock className="w-10 h-10" />
                </div>
                <p className="text-wood-400 text-sm font-serif italic font-medium">Chưa có sử lục giao kèo nào được nạp</p>
              </div>
            )}
          </div>
          <button className="w-full mt-10 py-4 bg-wood-50 text-wood-900 rounded-[1.5rem] font-bold hover:bg-wood-900 hover:text-white transition-all duration-300 shadow-sm flex items-center justify-center gap-2 group">
            Xem toàn sử niên giám
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
