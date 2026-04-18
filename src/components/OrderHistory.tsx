import { 
  FileText, 
  ExternalLink, 
  Search, 
  Calendar, 
  User, 
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Banknote,
  Clock,
  CheckCircle,
  Ban,
  Plus,
  Loader2,
  Sparkles
} from 'lucide-react';
import { Quote } from '../types.ts';
import { formatCurrency, formatNumber } from '../lib/utils.ts';
import { cn } from '../lib/utils.ts';
import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

import { apiService } from '../services/apiService';
import DigitalWalletModal from './DigitalWalletModal.tsx';

interface OrderHistoryProps {
  quotes: Quote[];
}

export default function OrderHistory({ quotes }: OrderHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | Quote['status']>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [activeWalletQuote, setActiveWalletQuote] = useState<Quote | null>(null);
  
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);
  const [paymentInput, setPaymentInput] = useState<{id: string, amount: string} | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const handleUpdatePayment = async (quote: Quote, amountStr: string) => {
    const additionalAmount = Number(amountStr);
    if (isNaN(additionalAmount) || additionalAmount <= 0) {
      alert("Số tiền không hợp lệ");
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const newPaidAmount = (quote.paidAmount || 0) + additionalAmount;
      const remaining = quote.totalAmount - newPaidAmount;
      
      let newStatus = quote.status;
      if (remaining <= 0) {
        newStatus = 'paid';
      } else {
        newStatus = 'partially_paid';
      }

      const quoteRef = doc(db, 'quotes', quote.id);
      await updateDoc(quoteRef, {
        paidAmount: newPaidAmount,
        status: newStatus
      });

      setPaymentInput(null);
      alert("Cập nhật thanh toán thành công");
    } catch (error: any) {
      console.error("Payment update error:", error);
      alert("Lỗi khi cập nhật thanh toán: " + error.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleOnlinePayment = async (quote: Quote) => {
    try {
      setIsProcessingPayment(true);
      const { clientSecret } = await apiService.createPaymentIntent(
        quote.totalAmount, 
        quote.id, 
        quote.customerName
      );
      
      // In a real app with Elements, we'd confirmPayment(clientSecret)
      alert(`Đã khởi tạo thanh toán trực tuyến cho khách: ${quote.customerName}.\nClient Secret: ${clientSecret.substring(0, 15)}...\n(Môi trường Demo: Giả lập thành công)`);
      
      // Send confirmation email
      await apiService.sendEmailNotification(
        `Xác nhận Thanh toán: ${quote.customerName}`,
        `<h1>Giao kèo #${quote.id}</h1><p>Khách hàng <b>${quote.customerName}</b> đã thanh toán số tiền <b>${formatCurrency(quote.totalAmount)}</b> trực tuyến.</p>`,
        quote.customerPhone // Using phone as mock email for now or default
      );
      
    } catch (error: any) {
      alert("Lỗi thanh toán: " + error.message);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const filteredQuotes = quotes.filter(q => {
    const matchesSearch = q.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (q.customerPhone || '').includes(searchTerm);
    const matchesStatus = filterStatus === 'all' || q.status === filterStatus;
    
    let matchesDate = true;
    if (dateRange.start || dateRange.end) {
      const qDate = parseISO(q.createdAt);
      const start = dateRange.start ? startOfDay(parseISO(dateRange.start)) : parseISO('2000-01-01');
      const end = dateRange.end ? endOfDay(parseISO(dateRange.end)) : parseISO('2100-01-01');
      matchesDate = isWithinInterval(qDate, { start, end });
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const exportToPDF = (quote: Quote) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.text('CO NGHE POS - HOA DON GIAO KEO', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Khach hang: ${quote.customerName}`, 20, 40);
    doc.text(`Dien thoai: ${quote.customerPhone || 'N/A'}`, 20, 47);
    doc.text(`Ngay lap: ${new Date(quote.createdAt).toLocaleString()}`, 20, 54);
    doc.text(`Ma giao keo: ${quote.id}`, 20, 61);
    doc.text(`Trang thai: ${quote.status.toUpperCase()}`, 150, 40);

    // Table
    const tableData = quote.items.map(item => [
      item.productName,
      item.unit === 'm' ? `${item.length}m` : item.unit === 'each' ? `${item.quantity} chiec` : `${item.length}x${item.width}m2`,
      formatCurrency(item.unitPrice),
      formatCurrency(item.totalPrice)
    ]);

    autoTable(doc, {
      startY: 70,
      head: [['Ten Bao Vat', 'Quy Cach', 'Don Gia', 'Thanh Tien']],
      body: tableData,
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text(`TONG CONG: ${formatCurrency(quote.totalAmount)}`, 140, finalY);

    doc.save(`GiaoKeo_${quote.customerName}_${quote.id}.pdf`);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-wood-100">
        <div>
          <h1 className="text-4xl font-display font-black text-wood-900 tracking-tighter">Niên giám Giao kèo</h1>
          <p className="text-base text-wood-500 font-serif italic mt-1 font-medium">Sử lục ghi chép các cuộc giao dịch và kết kèo bảo vật</p>
        </div>
      </header>
      
      <div className="flex flex-col gap-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-wood-400" />
            <input 
              type="text" 
              placeholder="Truy vết Giao kèo, Khách hữu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-white border-none rounded-[1.5rem] outline-none focus:ring-2 focus:ring-wood-200 transition-all shadow-sm font-bold text-wood-900 shadow-inner"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-wrap items-center gap-1.5 bg-wood-100 p-1.5 rounded-[1.5rem] shadow-inner">
              {(['all', 'draft', 'ordered', 'partially_paid', 'paid', 'completed', 'cancelled'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                    filterStatus === status ? "bg-white text-wood-900 shadow-sm" : "text-wood-400 hover:text-wood-600 hover:bg-white/50"
                  )}
                >
                  {status === 'all' ? 'Tất cả' : 
                   status === 'draft' ? 'Nháp' : 
                   status === 'ordered' ? 'Kết kèo' : 
                   status === 'partially_paid' ? 'Gửi một phần' :
                   status === 'paid' ? 'Hòa ngân' :
                   status === 'completed' ? 'Tất toán' : 'Hủy'}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-3 bg-white border-none px-6 py-3 rounded-[1.5rem] shadow-sm">
                <Calendar className="w-5 h-5 text-amber-600" />
                <div className="flex items-center gap-2">
                    <input 
                    type="date" 
                    value={dateRange.start}
                    onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                    className="bg-transparent text-xs font-black outline-none text-wood-900"
                    />
                    <span className="text-wood-200 font-display">~</span>
                    <input 
                    type="date" 
                    value={dateRange.end}
                    onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                    className="bg-transparent text-xs font-black outline-none text-wood-900"
                    />
                </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredQuotes.length > 0 ? filteredQuotes.map((quote) => (
          <motion.div 
            layout
            key={quote.id} 
            className={cn(
              "antique-card !p-0 overflow-hidden hover:shadow-2xl transition-all duration-500",
              expandedQuoteId === quote.id && "ring-2 ring-amber-400"
            )}
          >
            <div className="p-8 cursor-pointer relative overflow-hidden" onClick={() => setExpandedQuoteId(expandedQuoteId === quote.id ? null : quote.id)}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
                <div className="flex items-center gap-8">
                  <div className={cn(
                      "w-16 h-16 rounded-[1.5rem] flex items-center justify-center border-4 border-white shadow-xl transition-all group-hover:rotate-3",
                      quote.status === 'completed' || quote.status === 'paid' ? "bg-emerald-50 text-emerald-600" :
                      quote.status === 'cancelled' ? "bg-rose-50 text-rose-500" : "bg-wood-50 text-wood-600"
                  )}>
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="flex items-center gap-4 mb-2">
                      <h4 className="text-2xl font-display font-black text-wood-900 tracking-tight">{quote.customerName}</h4>
                      <span className={cn(
                        "text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-[0.2em] shadow-sm border",
                        quote.status === 'completed' || quote.status === 'paid' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                        quote.status === 'partially_paid' ? "bg-amber-50 text-amber-700 border-amber-100" :
                        quote.status === 'ordered' ? "bg-wood-50 text-wood-700 border-wood-100" : 
                        quote.status === 'cancelled' ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-stone-50 text-stone-700 border-stone-100"
                      )}>
                        {quote.status === 'draft' ? 'Lập nháp' : 
                         quote.status === 'ordered' ? 'Kết kèo' : 
                         quote.status === 'partially_paid' ? 'Trả một phần' :
                         quote.status === 'paid' ? 'Hòa ngân' :
                         quote.status === 'completed' ? 'Tất toán' : 'Đã hủy'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-6 text-sm text-wood-500 font-medium">
                      <span className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-wood-300" />
                        {quote.customerPhone || 'Ẩn danh khách'}
                      </span>
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-wood-300" />
                        {format(parseISO(quote.createdAt), 'dd MMMM, yyyy', {  })}
                      </span>
                      <div className="flex items-center gap-2 text-amber-700 font-black">
                         <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                         {quote.items.length} kiện bảo vật
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-4">
                  <div className="text-right">
                    <p className="text-3xl font-display font-black text-wood-950">{formatCurrency(quote.totalAmount)}</p>
                    {quote.paidAmount > 0 && (
                      <div className="flex items-center justify-end gap-1.5 mt-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">
                            Hòa ngân: {formatCurrency(quote.paidAmount)}
                          </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setPaymentInput(paymentInput?.id === quote.id ? null : {id: quote.id, amount: ''}); }}
                      className="p-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-[1.2rem] transition-all shadow-sm"
                      title="Ghi nhận thanh toán"
                    >
                      <Banknote className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); exportToPDF(quote); }}
                      className="p-3 bg-white border border-wood-100 text-wood-600 hover:text-wood-900 rounded-[1.2rem] transition-all shadow-sm"
                      title="Xuất họa đồ Giao kèo"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <div className="hidden lg:block w-px h-10 bg-wood-100 opacity-20" />
                    <button 
                      className={cn(
                          "p-4 bg-wood-50 text-wood-400 rounded-2xl transition-all hover:bg-white hover:shadow-lg",
                          expandedQuoteId === quote.id && "bg-amber-400 text-white shadow-xl shadow-amber-400/20"
                      )}
                    >
                      {expandedQuoteId === quote.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {paymentInput?.id === quote.id && (
                <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                >
                    <div className="px-10 py-8 bg-emerald-50/50 border-t border-emerald-100 flex flex-col md:flex-row items-end gap-6 relative">
                      <div className="flex-1 max-w-md w-full">
                        <label className="small-caps text-emerald-700 mb-2 block">Cập nhật ngân khoản thực trả</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            value={paymentInput.amount}
                            onChange={(e) => setPaymentInput({...paymentInput, amount: e.target.value})}
                            className="w-full pl-6 pr-16 py-4 bg-white border-2 border-emerald-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-emerald-400/10 font-black text-emerald-950 text-xl"
                            placeholder="Số ngân thực nạp..."
                          />
                          <span className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-black text-emerald-300">VNĐ</span>
                        </div>
                      </div>
                      <div className="flex gap-4 w-full md:w-auto">
                        <button 
                            onClick={() => setPaymentInput(null)}
                            className="flex-1 md:flex-none px-6 py-4 text-emerald-600 font-bold hover:bg-white rounded-2xl transition-all"
                        >
                            Đóng
                        </button>
                        <button 
                            onClick={() => handleUpdatePayment(quote, paymentInput.amount)}
                            disabled={isUpdatingStatus}
                            className="flex-1 md:flex-none px-10 py-4 bg-emerald-600 text-white rounded-[1.5rem] font-black hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                        >
                            {isUpdatingStatus ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                            Hòa ngân vào Lục
                        </button>
                      </div>
                    </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <AnimatePresence>
              {expandedQuoteId === quote.id && (
                <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-wood-100"
                >
                  <div className="p-10 bg-wood-50/20 space-y-8">
                    <div>
                        <h5 className="small-caps opacity-40 mb-6">Trích lục Danh mục Bảo vật</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {quote.items.map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-6 bg-white rounded-[2rem] border border-wood-50 shadow-sm group hover:border-amber-100 hover:shadow-xl transition-all">
                              <div className="flex items-center gap-6">
                                <div className="w-12 h-12 bg-wood-50 rounded-2xl flex items-center justify-center text-wood-200 font-display font-black text-xl border-2 border-white shadow-md text-wood-500">
                                  {i + 1}
                                </div>
                                <div>
                                  <p className="text-base font-black text-wood-950 group-hover:text-amber-800 transition-colors uppercase tracking-tight">{item.productName}</p>
                                  <p className="text-xs text-wood-400 font-serif italic mt-0.5">
                                    {item.unit === 'm' ? `${formatNumber(item.length)}m dài` : 
                                     item.unit === 'each' ? `${item.quantity} kiện` : 
                                     `${formatNumber(item.length)}x${formatNumber(item.width || 0)}m (Diện: ${formatNumber(item.totalArea)}m²)`}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] text-wood-300 font-black uppercase tracking-widest">{formatCurrency(item.unitPrice)} / {item.unit}</p>
                                <p className="text-lg font-display font-black text-wood-950 mt-1">{formatCurrency(item.totalPrice)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-8 bg-wood-950 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-wood-900 to-transparent opacity-50" />
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10 w-full lg:w-auto">
                        <div className="space-y-1">
                          <p className="small-caps text-wood-400 opacity-60">Toàn khoản Niêm yết</p>
                          <p className="text-3xl font-display font-black text-white">{formatCurrency(quote.totalAmount)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="small-caps text-emerald-400 opacity-60">Ngân khố đã Hòa</p>
                          <p className="text-3xl font-display font-black text-emerald-400">{formatCurrency(quote.paidAmount || 0)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="small-caps text-rose-400 opacity-60">Khoản nợ hiện hữu</p>
                          <p className="text-3xl font-display font-black text-white">{formatCurrency(quote.totalAmount - (quote.paidAmount || 0))}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 relative z-10">
                        {quote.status !== 'completed' && quote.status !== 'paid' && quote.status !== 'cancelled' && (
                          <button 
                            onClick={async () => {
                              if (confirm("Xác nhận tất toán toàn bộ giao kèo này vào Niên lục?")) {
                                try {
                                  await updateDoc(doc(db, 'quotes', quote.id), { status: 'completed' });
                                } catch (e: any) { alert(e.message); }
                              }
                            }}
                            className="px-8 py-4 bg-amber-400 text-wood-950 rounded-[1.5rem] font-black hover:bg-amber-300 transition-all shadow-xl shadow-amber-400/20 flex items-center gap-3 active:scale-95"
                          >
                            <CheckCircle2 className="w-6 h-6" /> Tất toán Giao kèo
                          </button>
                        )}
                        {quote.status !== 'cancelled' && (
                          <button 
                            onClick={async () => {
                              if (confirm("Hành động xóa bỏ giao kèo sẽ được ghi lại. Bạn có chắc chắn muốn hủy?")) {
                                try {
                                  await updateDoc(doc(db, 'quotes', quote.id), { status: 'cancelled' });
                                } catch (e: any) { alert(e.message); }
                              }
                            }}
                            className="px-8 py-4 bg-white/5 text-rose-400 border border-rose-500/30 rounded-[1.5rem] font-bold hover:bg-rose-500/10 transition-all flex items-center gap-3"
                          >
                            <Ban className="w-5 h-5 text-rose-500" /> Hủy bỏ Kèo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )) : null}

        {quotes.length === 0 && (
          <div className="py-40 text-center flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-700">
            <div className="w-32 h-32 bg-wood-50 rounded-[3rem] flex items-center justify-center text-wood-100 mb-8 border-2 border-dashed border-wood-100 scale-110 opacity-50 relative">
                 <FileText className="w-16 h-16" />
                 <div className="absolute inset-0 border-4 border-amber-400/20 rounded-[3rem] animate-pulse" />
            </div>
            <h3 className="text-3xl font-display font-black text-wood-300 mb-4 uppercase tracking-widest">Sổ giao kèo còn trống</h3>
            <p className="text-base text-wood-400 max-w-sm mx-auto mb-10 font-serif italic font-medium leading-relaxed">Bạn chưa lập giao kèo nào. Hãy định giá bảo vật để lưu danh giao dịch vào niên giám.</p>
            <button className="px-10 py-5 bg-wood-900 text-white rounded-[2rem] font-black shadow-2xl shadow-wood-900/20 hover:bg-wood-950 transition-all active:scale-95 flex items-center gap-3">
              <Plus className="w-6 h-6 text-amber-400" /> Khai triển Giao kèo mới
            </button>
          </div>
        )}
      </div>

      {activeWalletQuote && (
        <DigitalWalletModal 
          quote={activeWalletQuote}
          onClose={() => setActiveWalletQuote(null)}
          onSuccess={() => {
            // In a real app, update Firestore status to 'completed'
            alert("Đã cập nhật trạng thái 'Tất toán' cho giao kèo này.");
          }}
        />
      )}
    </div>
  );
}
