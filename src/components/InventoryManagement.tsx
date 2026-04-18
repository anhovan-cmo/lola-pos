import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, addDoc, query, orderBy, doc, updateDoc, increment, getDoc, writeBatch } from 'firebase/firestore';
import { Product, InventoryTransaction } from '../types';
import { Package, ArrowUpRight, ArrowDownLeft, RefreshCcw, History, Search, PlusCircle, AlertCircle, Settings as SettingsIcon, X, Filter, Download, Calendar, FileText, Upload, FileUp, CheckCircle2, Loader2, AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { apiService } from '../services/apiService';
import Papa from 'papaparse';

interface InventoryManagementProps {
  products: Product[];
  currentUser: any;
  stockThreshold: number;
  setStockThreshold: (val: number) => void;
}

export default function InventoryManagement({ products, currentUser, stockThreshold, setStockThreshold }: InventoryManagementProps) {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'in' | 'out'>('all');
  const [isAddingIn, setIsAddingIn] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [lotSearch, setLotSearch] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [notes, setNotes] = useState('');
  
  const [showThresholdConfig, setShowThresholdConfig] = useState(false);
  const [activeHistoryProductId, setActiveHistoryProductId] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Batch Import States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Attachment State for Single Transaction
  const [attachment, setAttachment] = useState<string | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'inventory'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryTransaction));
      setTransactions(txs);
    });
    return () => unsubscribe();
  }, []);

  const handleStockAction = async (type: 'in' | 'out') => {
    if (!selectedProductId || quantity <= 0) {
      alert("Vui lòng chọn bảo vật và nhập số lượng hợp lệ.");
      return;
    }

    if (!reason.trim()) {
      alert("Vui lòng nhập lý do cụ thể.");
      return;
    }

    if (!notes.trim()) {
      alert("Vui lòng nhập ghi chú chi tiết cho giao dịch này.");
      return;
    }

    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    try {
      // 1. Record transaction
      const transactionData: any = {
        productId: selectedProductId,
        productName: product.name,
        type,
        quantity,
        lotNumber: lotNumber || null,
        expiryDate: expiryDate || null,
        reason: reason.trim(),
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
        createdBy: currentUser.displayName || currentUser.email
      };

      if (attachment) {
        transactionData.attachment = attachment;
      }

      await addDoc(collection(db, 'inventory'), transactionData);

      // 2. Update stock in product
      const productRef = doc(db, 'products', selectedProductId);
      await updateDoc(productRef, {
        stock: increment(type === 'in' ? quantity : -quantity)
      });

      // 3. Check for low stock notification
      if (type === 'out') {
        const updatedDoc = await getDoc(productRef);
        const newStock = updatedDoc.data()?.stock || 0;
        
        if (newStock <= stockThreshold) {
          try {
            await apiService.sendEmailNotification(
              `⚠️ Cảnh báo tồn kho thấp: ${product.name}`,
              `
              <h3>Thông báo tồn kho thấp</h3>
              <p>Bảo vật <strong>${product.name}</strong> vừa rơi vào ngưỡng cảnh báo.</p>
              <ul>
                <li><strong>Tồn kho hiện tại:</strong> ${newStock} ${product.unit}</li>
                <li><strong>Ngưỡng thiết lập:</strong> ${stockThreshold} ${product.unit}</li>
                <li><strong>Người thực hiện xuất kho:</strong> ${currentUser.displayName || currentUser.email}</li>
                <li><strong>Thời gian:</strong> ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</li>
              </ul>
              <p>Vui lòng kiểm tra và nạp thêm hàng nếu cần thiết.</p>
              `,
              'anhovan.cmo@gmail.com'
            );
          } catch (emailError) {
            console.error("Failed to send stock notification email:", emailError);
          }
        }
      }

      // Reset
      setIsAddingIn(false);
      setQuantity(0);
      setReason('');
      setNotes('');
      setLotNumber('');
      setExpiryDate('');
      setAttachment(null);
    } catch (error) {
      console.error("Stock action failed:", error);
    }
  };

  const downloadCSV = () => {
    const headers = ["Ngày", "Bảo vật", "Loại", "Số lượng", "Lô", "Hạn dùng", "Lý do", "Ghi chú", "Người thực hiện"];
    const rows = filteredTransactions.map(tx => [
      format(parseISO(tx.createdAt), 'dd/MM/yyyy HH:mm'),
      tx.productName,
      tx.type === 'in' ? 'Nhập' : 'Xuất',
      tx.quantity,
      tx.lotNumber || '-',
      tx.expiryDate || '-',
      tx.reason,
      (tx as any).notes || '-',
      tx.createdBy
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers, ...rows].map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Lich_su_kho_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportInventoryPDF = () => {
    const doc = new jsPDF();
    const timestamp = format(new Date(), 'dd/MM/yyyy HH:mm:ss');
    
    // Add title
    doc.setFontSize(18);
    doc.text('LOLA POS - BAO CAO TON KHO BAO VAT', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Thoi gian xuat: ${timestamp}`, 20, 30);
    doc.text(`Nguong canh bao: ${stockThreshold} don vi`, 20, 35);

    const tableHeaders = [['STT', 'Bao vat', 'Dong do', 'Ton kho', 'Trang thai']];
    const tableData = products.map((p, index) => [
      index + 1,
      p.name,
      p.category,
      `${p.stock || 0} ${p.unit}`,
      (p.stock || 0) <= stockThreshold ? 'Canh bao' : 'An toan'
    ]);

    (doc as any).autoTable({
      head: tableHeaders,
      body: tableData,
      startY: 45,
      theme: 'striped',
      headStyles: { fillColor: [74, 44, 23] }, // wood-800
      didDrawPage: (data: any) => {
        doc.setFontSize(8);
        const pageCount = doc.internal.pages.length - 1;
        doc.text(`Trang ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
      }
    });

    doc.save(`Bao_cao_ton_kho_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
  };

  const seedSampleInventory = async () => {
    if (!currentUser) return;
    setIsProcessingImport(true);
    try {
      const samples = [
        { date: '2026-03-20', name: 'Sập gụ tủ chè (Khảm trai)', type: 'in' as const, qty: 2, lot: 'BATCH-01', reason: 'Nhập tồn kho đầu kỳ từ xưởng Đồng Kỵ', notes: 'Hàng tuyển chọn loại 1', user: 'Hàn Hồng' },
        { date: '2026-03-21', name: 'Bàn ghế Trường kỷ (Tam sơn)', type: 'in' as const, qty: 3, lot: 'BATCH-02', reason: 'Nhập hàng mới trưng bày', notes: 'Gỗ gụ mật lâu năm', user: 'Gia Hân' },
        { date: '2026-03-22', name: 'Tranh gỗ tứ quý', type: 'in' as const, qty: 5, lot: 'BATCH-03', reason: 'Nhập theo đơn đặt hàng', notes: 'Đục tay tinh xảo', user: 'Hàn Hồng' },
        { date: '2026-03-23', name: 'Sập gụ tủ chè (Khảm trai)', type: 'out' as const, qty: 1, lot: '', reason: 'Xuất kho bàn giao khách Hải Phòng', notes: 'Đã kiểm tra kỹ mộng mẹo', user: 'Gia Hân' },
        { date: '2026-03-24', name: 'Cuốn thư câu đối', type: 'in' as const, qty: 10, lot: 'BATCH-04', reason: 'Nhập lô hàng sơn son thếp vàng', notes: 'Chờ thợ hoàn thiện chữ', user: 'Hàn Hồng' }
      ];

      const batch = writeBatch(db);
      for (const s of samples) {
        const product = products.find(p => p.name === s.name);
        if (!product) continue;

        const txRef = doc(collection(db, 'inventory'));
        batch.set(txRef, {
          productId: product.id,
          productName: product.name,
          type: s.type,
          quantity: s.qty,
          lotNumber: s.lot || null,
          expiryDate: null,
          reason: s.reason,
          notes: s.notes,
          createdAt: new Date(s.date).toISOString(),
          createdBy: s.user
        });

        const productRef = doc(db, 'products', product.id);
        batch.update(productRef, {
          stock: increment(s.type === 'in' ? s.qty : -s.qty)
        });
      }

      await batch.commit();
      alert("Đã nạp 05 dòng dữ liệu nghiệp vụ 'thật' vào hệ thống của bạn.");
    } catch (e: any) {
      alert("Lỗi nạp dữ liệu: " + e.message);
    } finally {
      setIsProcessingImport(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data.map((row: any) => {
          // Normalize types and handle missing data
          const name = row['Bảo vật'] || row['Product'] || row['Name'];
          const typeStr = row['Loại'] || row['Type'] || '';
          const qty = Number(row['Số lượng'] || row['Quantity'] || 0);
          
          let type: 'in' | 'out' = 'in';
          if (typeStr.toLowerCase().includes('xuất') || typeStr.toLowerCase().includes('out')) {
            type = 'out';
          }

          const product = products.find(p => p.name.toLowerCase().trim() === (name || '').toLowerCase().trim());
          
          return {
            ...row,
            matchedProduct: product,
            parsedType: type,
            parsedQuantity: qty,
            parsedDate: row['Ngày'] || row['Date'],
            parsedUser: row['Người thực hiện'] || row['PerformedBy'],
            isValid: !!product && qty > 0
          };
        });
        setImportRows(rows);
      },
      error: (err) => {
        setImportError("Lỗi đọc file: " + err.message);
      }
    });
  };

  const executeImport = async () => {
    const validRows = importRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      setImportError("Không có dữ liệu hợp lệ để nhập.");
      return;
    }

    setIsProcessingImport(true);
    setImportError(null);

    try {
      const batch = writeBatch(db);
      
      for (const row of validRows) {
        const product = row.matchedProduct;
        const type = row.parsedType;
        const qty = row.parsedQuantity;

        // Try to parse historical date if provided
        let createdAt = new Date().toISOString();
        if (row.parsedDate) {
          try {
            const parsedDate = parseISO(row.parsedDate);
            if (!isNaN(parsedDate.getTime())) {
              createdAt = parsedDate.toISOString();
            }
          } catch (e) {
            console.warn("Could not parse date from CSV:", row.parsedDate);
          }
        }

        // 1. Create Transaction
        const txRef = doc(collection(db, 'inventory'));
        batch.set(txRef, {
          productId: product.id,
          productName: product.name,
          type: type,
          quantity: qty,
          lotNumber: row['Lô'] || row['Lot'] || null,
          expiryDate: row['Hạn dùng'] || row['Expiry'] || null,
          reason: row['Lý do'] || row['Reason'] || 'Nhập từ file batch',
          notes: row['Ghi chú'] || row['Notes'] || '',
          createdAt: createdAt,
          createdBy: row.parsedUser || currentUser.displayName || currentUser.email
        });

        // 2. Update Product Stock
        const productRef = doc(db, 'products', product.id);
        batch.update(productRef, {
          stock: increment(type === 'in' ? qty : -qty)
        });
      }

      await batch.commit();
      
      // Cleanup
      setIsProcessingImport(false);
      setIsImportModalOpen(false);
      setImportRows([]);
      alert(`Đã cập nhật thành công ${validRows.length} giao dịch từ file.`);
    } catch (error: any) {
      console.error("Batch import failed:", error);
      setImportError("Lỗi hệ thống khi cập nhật: " + error.message);
      setIsProcessingImport(false);
    }
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) { // ~800KB limit for base64 in Firestore
        alert("File đính kèm quá lớn (vui lòng chọn file dưới 800KB)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachment(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const downloadTemplate = () => {
    const csvString = "\uFEFFNgày,Bảo vật,Loại,Số lượng,Lô,Hạn dùng,Lý do,Ghi chú,Người thực hiện\n" + 
                     "2024-03-20,Chó đá cổ,Nhập,5,BATCH-01,2025-12-31,Nhập kho định kỳ,Hàng mới về,Hàn Hồng\n" +
                     "2024-03-21,Khay trà gỗ trắc,Xuất,2,,,Giao khách,Đã thanh toán,Gia Hân";
    
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "mau_nhap_kho_lola.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.productName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLot = (tx.lotNumber || '').toLowerCase().includes(lotSearch.toLowerCase());
    const matchesType = filterType === 'all' || tx.type === filterType;
    
    let matchesDate = true;
    if (dateRange.start || dateRange.end) {
      const txDate = parseISO(tx.createdAt);
      const start = dateRange.start ? startOfDay(parseISO(dateRange.start)) : parseISO('2000-01-01');
      const end = dateRange.end ? endOfDay(parseISO(dateRange.end)) : parseISO('2100-01-01');
      matchesDate = isWithinInterval(txDate, { start, end });
    }

    const product = products.find(p => p.id === tx.productId);
    const matchesCategory = selectedCategory === 'all' || product?.category === selectedCategory;

    return matchesSearch && matchesLot && matchesType && matchesDate && matchesCategory;
  });

  const lowStockProducts = products.filter(p => (p.stock || 0) <= stockThreshold);
  const historyTransactions = activeHistoryProductId 
    ? transactions.filter(tx => tx.productId === activeHistoryProductId)
    : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-wood-100">
        <div>
          <h1 className="text-4xl font-display font-black text-wood-900 tracking-tighter">Quản trị Kho bãi</h1>
          <p className="text-base text-wood-500 font-serif italic mt-1 font-medium">Sử lục biến động bảo vật và điều phối tồn kho</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="w-full sm:w-auto px-6 py-4 bg-white border border-wood-100 text-wood-700 rounded-[1.5rem] font-bold flex items-center justify-center gap-3 hover:bg-wood-50 transition-all shadow-sm"
          >
            <FileUp className="w-5 h-5 text-amber-600" />
            Nhập File Lục
          </button>
          <button 
            onClick={() => setIsAddingIn(true)}
            className="w-full sm:w-auto px-10 py-4 bg-wood-900 text-white rounded-[1.5rem] font-black flex items-center justify-center gap-3 hover:bg-wood-950 shadow-xl shadow-wood-900/20 transition-all active:scale-95"
          >
            <PlusCircle className="w-6 h-6 text-amber-400" />
            Lập Phiếu Kho
          </button>
        </div>
      </header>

      {/* Notifications / Alerts */}
      <AnimatePresence>
        {lowStockProducts.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-rose-50 border-2 border-rose-100 rounded-[2.5rem] p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-8 shadow-inner"
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-rose-500 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-rose-200 animate-pulse">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-xl font-display font-black text-rose-900 uppercase tracking-tight">Cảnh báo Hung tin: Kho kiệt</h4>
                <p className="text-sm text-rose-700 font-serif italic font-medium mt-0.5">Có {lowStockProducts.length} bảo vật đang dưới ngưỡng an toàn ({stockThreshold} đơn vị).</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {lowStockProducts.slice(0, 5).map(p => (
                <span key={p.id} className="px-4 py-2 bg-white border border-rose-100 rounded-2xl text-[10px] font-black text-rose-600 whitespace-nowrap uppercase tracking-widest shadow-sm">
                  {p.name}: <span className="text-rose-900">{p.stock || 0}</span>
                </span>
              ))}
              {lowStockProducts.length > 5 && <span className="text-xs font-black text-rose-400 italic">...và {lowStockProducts.length - 5} bảo vật khác</span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="antique-card flex items-center gap-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-wood-50 rounded-full -mr-16 -mt-16 opacity-10 group-hover:scale-150 transition-transform duration-700" />
          <div className="w-20 h-20 bg-wood-950 rounded-[2rem] flex items-center justify-center text-amber-400 shadow-2xl relative z-10 border-4 border-white">
            <Package className="w-10 h-10" />
          </div>
          <div>
            <p className="small-caps opacity-40 mb-1">Tổng bảo vật</p>
            <div className="flex items-baseline gap-2">
                <h3 className="text-4xl font-display font-black text-wood-950">{products.length}</h3>
                <span className="text-xs font-serif italic text-wood-400">kiện vật</span>
            </div>
          </div>
          <button 
            onClick={() => setShowThresholdConfig(!showThresholdConfig)}
            className="absolute top-6 right-6 p-2 text-wood-200 hover:text-amber-600 transition-colors z-20"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
          
          <AnimatePresence>
            {showThresholdConfig && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    className="absolute top-16 right-6 bg-white border-2 border-wood-100 rounded-[2rem] shadow-2xl p-6 z-[30] w-64 space-y-4"
                >
                    <p className="small-caps text-wood-500 mb-2">Ngưỡng báo động</p>
                    <div className="relative">
                        <input 
                            type="number" 
                            value={stockThreshold}
                            onChange={(e) => setStockThreshold(Number(e.target.value))}
                            className="w-full pl-6 pr-12 py-3 bg-wood-50 rounded-2xl text-lg font-black text-wood-950 border-none focus:ring-4 focus:ring-amber-400/10 shadow-inner"
                        />
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-wood-300">ĐV</span>
                    </div>
                    <button 
                        onClick={() => setShowThresholdConfig(false)}
                        className="w-full py-3 bg-wood-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-wood-900/20 active:scale-95 transition-all"
                    >
                        Khắc nhập Ngưỡng
                    </button>
                </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="antique-card flex items-center gap-8 group">
          <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center text-emerald-600 shadow-xl border-4 border-white group-hover:rotate-6 transition-transform">
            <ArrowUpRight className="w-10 h-10" />
          </div>
          <div>
            <p className="small-caps text-emerald-600 opacity-60 mb-1">Mã nạp (Tháng)</p>
            <div className="flex items-baseline gap-2">
                <h3 className="text-4xl font-display font-black text-wood-950">
                    {transactions.filter(t => t.type === 'in').length}
                </h3>
                <span className="text-xs font-serif italic text-wood-400">lượt nạp</span>
            </div>
          </div>
        </div>

        <div className="antique-card flex items-center gap-8 group">
          <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center text-rose-600 shadow-xl border-4 border-white group-hover:-rotate-6 transition-transform">
            <ArrowDownLeft className="w-10 h-10" />
          </div>
          <div>
            <p className="small-caps text-rose-600 opacity-60 mb-1">Mã xuất (Tháng)</p>
            <div className="flex items-baseline gap-2">
                <h3 className="text-4xl font-display font-black text-wood-950">
                    {transactions.filter(t => t.type === 'out').length}
                </h3>
                <span className="text-xs font-serif italic text-wood-400">lượt xuất</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left: Product Stock Status */}
        <div className="lg:w-1/3 space-y-6">
          <div className="antique-card !p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-display font-black text-wood-900 tracking-tight">Kê lục Tồn kho</h3>
              <div className="flex items-center gap-3">
                <button 
                  onClick={exportInventoryPDF}
                  className="p-3 bg-amber-50 text-amber-700 rounded-2xl hover:bg-amber-100 transition-all shadow-sm group"
                  title="Xuất Họa đồ Tồn kho"
                >
                  <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
                <button 
                  onClick={() => setIsAddingIn(true)}
                  className="p-3 bg-wood-950 text-white rounded-2xl hover:bg-black transition-all shadow-xl shadow-wood-950/20 group"
                  title="Lập phiếu điều phối"
                >
                  <PlusCircle className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                </button>
              </div>
            </div>
            
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar pr-4">
              {products.map(product => (
                <button 
                  key={product.id} 
                  onClick={() => {
                    setActiveHistoryProductId(product.id);
                    setShowHistoryModal(true);
                  }}
                  className={cn(
                    "w-full p-6 rounded-[2rem] flex items-center justify-between transition-all text-left group/item relative overflow-hidden",
                    activeHistoryProductId === product.id 
                      ? "bg-wood-950 shadow-2xl scale-[1.02] ring-4 ring-amber-400/20" 
                      : "bg-white border border-wood-50 hover:border-amber-200 hover:shadow-xl shadow-sm"
                  )}
                >
                  {activeHistoryProductId === product.id && (
                     <div className="absolute inset-0 bg-gradient-to-r from-amber-600/10 to-transparent " />
                  )}
                  <div className="min-w-0 relative z-10">
                    <p className={cn(
                        "text-lg font-black tracking-tight group-hover/item:text-amber-800 transition-colors truncate",
                        activeHistoryProductId === product.id ? "text-white" : "text-wood-950"
                    )}>{product.name}</p>
                    <p className={cn(
                      "small-caps opacity-40 mt-1",
                      activeHistoryProductId === product.id ? "text-amber-500" : "text-wood-400"
                    )}>{product.category}</p>
                  </div>
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="text-right">
                      <p className={cn(
                        "text-xl font-display font-black",
                        (product.stock || 0) <= stockThreshold 
                          ? (activeHistoryProductId === product.id ? "text-rose-400" : "text-rose-600") 
                          : (activeHistoryProductId === product.id ? "text-emerald-400" : "text-wood-950")
                      )}>
                        {product.stock || 0}
                      </p>
                      <p className={cn(
                          "text-[9px] font-black uppercase tracking-widest",
                          activeHistoryProductId === product.id ? "text-wood-500" : "text-wood-300"
                      )}>{product.unit}</p>
                    </div>
                    <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                        activeHistoryProductId === product.id ? "bg-amber-400 text-wood-950 shadow-lg shadow-amber-400/20" : "bg-wood-50 text-wood-300 opacity-0 group-hover/item:opacity-100"
                    )}>
                        <History className="w-5 h-5" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Transaction History */}
        <div className="lg:flex-1 space-y-6">
          {activeHistoryProductId && (
            <motion.div 
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               className="bg-wood-950 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group mb-4"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500 rounded-full -mr-32 -mt-32 opacity-10 group-hover:scale-110 transition-transform duration-1000" />
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-amber-500/20 rounded-3xl flex items-center justify-center border-2 border-amber-500/20 shadow-lg">
                    <History className="w-8 h-8 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-display font-black tracking-tight">Sử lục Truy vết: <span className="text-amber-500">{products.find(p => p.id === activeHistoryProductId)?.name}</span></h3>
                    <p className="text-sm font-serif italic text-wood-400 mt-1">Đang trích sao nhật ký biến động của bảo vật này</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveHistoryProductId(null)}
                  className="p-4 bg-white/5 hover:bg-white/10 text-wood-400 hover:text-white rounded-[1.5rem] transition-all border border-white/10"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </motion.div>
          )}
          
          <div className="antique-card">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-wood-50 rounded-2xl">
                    <History className="w-6 h-6 text-wood-900" />
                </div>
                <h3 className="text-2xl font-display font-black text-wood-900 tracking-tight">
                  {activeHistoryProductId ? 'Trích sao Nhật ký' : 'Nhật ký Kho bãi'}
                </h3>
              </div>
              
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-wood-300" />
                  <input 
                    type="text" 
                    placeholder="Truy tìm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-wood-50 border-none rounded-2xl text-xs font-black shadow-inner focus:ring-2 focus:ring-amber-400/20 transition-all outline-none"
                  />
                </div>
                
                <div className="flex bg-wood-100 p-1 rounded-2xl shadow-inner shadow-black/5">
                  {(['all', 'in', 'out'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={cn(
                        "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        filterType === type ? "bg-white text-wood-900 shadow-md" : "text-wood-400 hover:text-wood-600 hover:bg-white/50"
                      )}
                    >
                      {type === 'all' ? 'Tất cả' : type === 'in' ? 'Khai Nhập' : 'Khai Xuất'}
                    </button>
                  ))}
                </div>
                
                <button 
                  onClick={downloadCSV}
                  className="flex items-center gap-3 px-6 py-3 bg-wood-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-wood-900/10 hover:bg-black transition-all active:scale-95 border border-white/10"
                >
                  <Download className="w-4 h-4 text-amber-500" />
                  Trích Lục (.CSV)
                </button>
              </div>
            </div>

            {/* Advanced Filters Overlay */}
            <div className="flex flex-wrap items-center gap-6 mb-10 bg-wood-50 p-6 rounded-[2rem] border border-wood-100/50 shadow-inner">
              <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl shadow-sm">
                <Calendar className="w-5 h-5 text-amber-600" />
                <div className="flex items-center gap-2">
                    <input 
                    type="date" 
                    value={dateRange.start}
                    onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                    className="bg-transparent text-xs font-black outline-none text-wood-900"
                    />
                    <span className="text-wood-200">~</span>
                    <input 
                    type="date" 
                    value={dateRange.end}
                    onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                    className="bg-transparent text-xs font-black outline-none text-wood-900"
                    />
                </div>
              </div>
              
              <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl shadow-sm">
                  <Filter className="w-5 h-5 text-amber-600" />
                  <select 
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-transparent text-xs font-black outline-none text-wood-900 cursor-pointer min-w-[150px]"
                  >
                    <option value="all">Mọi Dòng đồ</option>
                    {Array.from(new Set(products.map(p => p.category))).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
              </div>

              <div className="relative flex-1 min-w-[200px]">
                  <Upload className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-wood-300" />
                  <input 
                    type="text" 
                    placeholder="Lọc theo Số Lô..."
                    value={lotSearch}
                    onChange={(e) => setLotSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white border-2 border-wood-100 rounded-2xl text-xs font-black shadow-sm focus:ring-2 focus:ring-amber-400/20 transition-all outline-none"
                  />
                </div>

              <button 
                onClick={() => {
                  setSearchTerm('');
                  setLotSearch('');
                  setFilterType('all');
                  setDateRange({ start: '', end: '' });
                  setSelectedCategory('all');
                }}
                className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-700 transition-colors"
              >
                Hủy lọc
              </button>
            </div>

            <div className="overflow-x-auto rounded-[2rem] border-2 border-wood-50 shadow-inner bg-white">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-[10px] font-black text-wood-400 uppercase tracking-[0.2em] bg-wood-50/50">
                    <th className="px-8 py-6">Khai thức</th>
                    {!activeHistoryProductId && <th className="px-8 py-6">Danh mục Bảo vật</th>}
                    <th className="px-8 py-6 text-center">Biến động / Lô vật</th>
                    <th className="px-8 py-6">Lý chương</th>
                    <th className="px-8 py-6 text-right">Khắc giờ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-wood-50">
                  {(activeHistoryProductId ? historyTransactions : filteredTransactions).map((tx) => (
                    <tr key={tx.id} className="text-sm hover:bg-wood-50 transition-colors group">
                      <td className="px-8 py-6">
                        <span className={cn(
                          "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm",
                          tx.type === 'in' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"
                        )}>
                          {tx.type === 'in' ? 'Khai Nhập' : 'Khai Xuất'}
                        </span>
                      </td>
                      {!activeHistoryProductId && (
                        <td className="px-8 py-6">
                           <p className="font-black text-wood-950 uppercase tracking-tight group-hover:text-amber-800 transition-colors">{tx.productName}</p>
                           <p className="text-[10px] text-wood-400 font-medium">Người lập: {tx.createdBy}</p>
                        </td>
                      )}
                      <td className="px-8 py-6 text-center">
                        <div className={cn(
                            "text-xl font-display font-black",
                            tx.type === 'in' ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {tx.type === 'in' ? '+' : '-'}{tx.quantity}
                        </div>
                        {tx.lotNumber && (
                          <div className="text-[9px] text-amber-700 font-black bg-amber-50 px-2 py-1 rounded-full inline-block mt-2 border border-amber-100 uppercase tracking-tighter">
                            Lô: {tx.lotNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-6 max-w-xs">
                        <p className="text-xs font-serif italic text-wood-600 leading-relaxed truncate group-hover:whitespace-normal group-hover:overflow-visible group-hover:bg-white group-hover:p-4 group-hover:rounded-2xl group-hover:shadow-2xl group-hover:relative group-hover:z-20 transition-all">{tx.reason}</p>
                        {(tx as any).attachment && (
                            <div className="mt-2 flex items-center gap-1.5 text-[9px] text-amber-600 font-black uppercase tracking-widest">
                                <Sparkles className="w-3 h-3 animate-pulse" /> Có trích ảnh
                            </div>
                        )}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <p className="text-xs font-black text-wood-900">{format(parseISO(tx.createdAt), 'dd/MM/yyyy')}</p>
                        <p className="text-[10px] text-wood-400 font-medium mt-0.5">{format(parseISO(tx.createdAt), 'HH:mm')}</p>
                      </td>
                    </tr>
                  ))}
                  {(activeHistoryProductId ? historyTransactions : filteredTransactions).length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-40 text-center">
                        <div className="flex flex-col items-center justify-center opacity-30">
                            <RefreshCcw className="w-16 h-16 text-wood-200 mb-6 animate-spin-slow" />
                            <p className="text-xl font-display font-black text-wood-400 uppercase tracking-widest">Không có biến động nào được ghi nhận</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Add Stock */}
      <AnimatePresence>
        {isAddingIn && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-wood-950/20 backdrop-blur-sm">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-white w-full max-w-xl rounded-[3rem] p-10 border border-wood-100 shadow-2xl overflow-hidden relative"
                >
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 via-wood-900 to-amber-400" />
                    
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-wood-950 rounded-2xl flex items-center justify-center text-amber-400 shadow-xl border-4 border-white">
                                <PlusCircle className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-display font-black text-wood-900 tracking-tight">Kinh lược Kho bãi</h3>
                                <p className="text-sm font-serif italic text-wood-400">Điều phối luân chuyển bảo vật</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsAddingIn(false)}
                            className="p-3 hover:bg-wood-50 rounded-2xl transition-all group"
                        >
                            <X className="w-6 h-6 text-wood-300 group-hover:text-wood-900 group-hover:rotate-90 transition-all" />
                        </button>
                    </div>

                    <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar pr-4">
                        <div className="space-y-2">
                            <label className="small-caps text-wood-500 mb-2 block">Lựa chọn Bảo vật</label>
                            <select 
                                value={selectedProductId}
                                onChange={(e) => setSelectedProductId(e.target.value)}
                                className="w-full px-6 py-4 bg-wood-50 border-2 border-transparent rounded-[1.5rem] outline-none focus:ring-4 focus:ring-amber-400/10 focus:border-amber-200 transition-all font-black text-wood-900 appearance-none shadow-inner"
                            >
                                <option value="">--- Khai báo Sản phẩm ---</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} (Tồn hiện hữu: {p.stock || 0} {p.unit})</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <button 
                                onClick={() => handleStockAction('in')}
                                className={cn(
                                    "py-6 rounded-[2rem] font-black flex flex-col items-center justify-center gap-3 transition-all border-4 relative overflow-hidden group/btn",
                                    "bg-emerald-50 text-emerald-700 border-white shadow-xl hover:shadow-emerald-200/50 hover:-translate-y-1"
                                )}
                            >
                                <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-lg group-hover/btn:scale-110 transition-transform">
                                    <ArrowUpRight className="w-6 h-6" />
                                </div>
                                <span className="small-caps">Khai Nhập</span>
                            </button>
                            <button 
                                onClick={() => handleStockAction('out')}
                                className={cn(
                                    "py-6 rounded-[2rem] font-black flex flex-col items-center justify-center gap-3 transition-all border-4 relative overflow-hidden group/btn",
                                    "bg-rose-50 text-rose-700 border-white shadow-xl hover:shadow-rose-200/50 hover:-translate-y-1"
                                )}
                            >
                                <div className="p-3 bg-rose-600 text-white rounded-xl shadow-lg group-hover/btn:scale-110 transition-transform">
                                    <ArrowDownLeft className="w-6 h-6" />
                                </div>
                                <span className="small-caps">Khai Xuất</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="small-caps text-wood-500 block">Số lượng</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        value={quantity}
                                        onChange={(e) => setQuantity(Number(e.target.value))}
                                        className="w-full pl-6 pr-12 py-4 bg-wood-50 border-2 border-transparent rounded-2xl outline-none focus:ring-4 focus:ring-amber-400/10 focus:border-amber-200 transition-all font-black text-wood-900 text-xl shadow-inner"
                                        placeholder="0.00"
                                    />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-wood-300">Đơn vị</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="small-caps text-wood-500 block">Số Lô (Lot Number)</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={lotNumber}
                                        onChange={(e) => setLotNumber(e.target.value)}
                                        className="w-full pl-6 pr-12 py-4 bg-wood-50 border-2 border-transparent rounded-2xl outline-none focus:ring-4 focus:ring-amber-400/10 focus:border-amber-200 transition-all font-black text-wood-900 shadow-inner"
                                        placeholder="VD: batch-2024"
                                    />
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-wood-200 italic">Lô vật</div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="space-y-2">
                                <label className="small-caps text-wood-500 block">Ngày đáo hạn</label>
                                <input 
                                    type="date" 
                                    value={expiryDate}
                                    onChange={(e) => setExpiryDate(e.target.value)}
                                    className="w-full px-6 py-4 bg-wood-50 border-2 border-transparent rounded-2xl outline-none focus:ring-4 focus:ring-amber-400/10 focus:border-amber-200 transition-all font-black text-wood-900 shadow-inner"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="small-caps text-rose-500 block">Lý chương điều phối</label>
                                <input 
                                    type="text" 
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full px-6 py-4 bg-rose-50/50 border-2 border-transparent rounded-2xl outline-none focus:ring-4 focus:ring-rose-400/10 focus:border-rose-200 transition-all font-black text-rose-900 shadow-inner"
                                    placeholder="Lý do điều chuyển..."
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="small-caps text-wood-600 block">Biên lục chi tiết (Ghi chú)</label>
                            <textarea 
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full px-6 py-4 bg-wood-50 border-2 border-transparent rounded-[2rem] outline-none focus:ring-4 focus:ring-amber-400/10 focus:border-amber-200 transition-all font-medium text-wood-900 min-h-[120px] shadow-inner font-serif italic"
                                placeholder="Ghi chép ngữ cảnh cụ thể cho hậu lục..."
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="small-caps text-wood-500 block font-black">Trích xuất Hình ảnh / Chứng từ</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <button 
                                    onClick={() => attachmentInputRef.current?.click()}
                                    className="relative h-40 bg-wood-50 border-4 border-dashed border-wood-100 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 hover:bg-white hover:border-amber-400/50 hover:shadow-inner transition-all group overflow-hidden"
                                >
                                    {attachment ? (
                                        <div className="absolute inset-0">
                                            {attachment.startsWith('data:image') ? (
                                                <img src={attachment} alt="Preview" className="w-full h-full object-cover opacity-20" />
                                            ) : (
                                                <div className="w-full h-full bg-amber-50 flex items-center justify-center">
                                                    <FileText className="w-10 h-10 text-amber-600" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/20 backdrop-blur-[2px]">
                                                <CheckCircle2 className="w-10 h-10 text-emerald-600 mb-2" />
                                                <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Đã nạp tệp</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-wood-200 shadow-sm group-hover:scale-110 transition-transform">
                                                <Upload className="w-6 h-6" />
                                            </div>
                                            <span className="text-xs font-black text-wood-400 uppercase tracking-widest group-hover:text-amber-600 transition-colors">Tải ảnh vật hoặc biên lai</span>
                                        </>
                                    )}
                                </button>
                                
                                {attachment && (
                                     <div className="flex flex-col gap-4">
                                        <div className="p-6 bg-emerald-50 border-2 border-emerald-100 rounded-[2rem] flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                                                <FileText className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black text-emerald-900 truncate">Tai_lieu_ton_kho.pdf</p>
                                                <p className="text-[10px] text-emerald-600 uppercase font-black tracking-widest mt-0.5">Hợp lệ</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setAttachment(null)}
                                            className="w-full py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-100 transition-all border border-rose-100"
                                        >
                                            Xoá tệp đính kèm
                                        </button>
                                     </div>
                                )}
                            </div>
                            <input 
                                ref={attachmentInputRef}
                                type="file" 
                                className="hidden" 
                                accept="image/*,.pdf"
                                onChange={handleAttachmentChange}
                            />
                        </div>
                    </div>

                    <div className="mt-10 flex flex-col sm:flex-row gap-4">
                        <button 
                            onClick={() => setIsAddingIn(false)}
                            className="flex-1 py-5 bg-wood-50 text-wood-400 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-wood-100 h hover:text-wood-700 transition-all"
                        >
                            Hủy bỏ Phiếu
                        </button>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
      {/* Modal: History */}
      <AnimatePresence>
        {showHistoryModal && activeHistoryProductId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-wood-950/20 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-5xl rounded-[3rem] p-10 border border-wood-100 shadow-2xl max-h-[90vh] flex flex-col relative"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 via-wood-900 to-amber-400" />
              
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-amber-50 rounded-[1.5rem] flex items-center justify-center text-amber-600 shadow-inner border border-amber-100 group">
                    <History className="w-8 h-8 group-hover:rotate-12 transition-transform" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-display font-black text-wood-900 tracking-tight">
                        Sử lục Biến động: <span className="text-amber-600">{products.find(p => p.id === activeHistoryProductId)?.name}</span>
                    </h3>
                    <p className="text-sm font-serif italic text-wood-500">Toàn văn nhật ký điều phối kho bãi của bảo vật</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowHistoryModal(false)}
                  className="p-4 bg-wood-50 hover:bg-wood-100 rounded-2xl transition-all group"
                >
                  <X className="w-6 h-6 text-wood-400 group-hover:text-wood-900 group-hover:rotate-90 transition-all" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pr-4">
                <div className="rounded-[2.5rem] border-2 border-wood-50 overflow-hidden shadow-inner bg-white">
                    <table className="w-full">
                    <thead>
                        <tr className="text-left text-[10px] font-black text-wood-400 uppercase tracking-[0.2em] bg-wood-50/50">
                        <th className="px-8 py-6">Khai thức</th>
                        <th className="px-8 py-6 text-center">Số lượng</th>
                        <th className="px-8 py-6 text-center">Lô / Hạn dùng</th>
                        <th className="px-8 py-6">Lý chương & Ghi chú</th>
                        <th className="px-8 py-6 text-right">Khắc giờ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-wood-50">
                        {historyTransactions.map((tx) => (
                        <tr key={tx.id} className="text-sm hover:bg-wood-50/50 transition-colors group">
                            <td className="px-8 py-6">
                            <span className={cn(
                                "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm",
                                tx.type === 'in' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"
                            )}>
                                {tx.type === 'in' ? 'Khai Nhập' : 'Khai Xuất'}
                            </span>
                            </td>
                            <td className="px-8 py-6 text-center">
                            <div className={cn(
                                "text-2xl font-display font-black",
                                tx.type === 'in' ? "text-emerald-600" : "text-rose-600"
                            )}>
                                {tx.type === 'in' ? '+' : '-'}{tx.quantity}
                            </div>
                            </td>
                            <td className="px-8 py-6 text-center">
                            <div className="text-[10px] font-black text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-100 inline-block uppercase tracking-tighter shadow-sm mb-1">{tx.lotNumber || '- No Lot -'}</div>
                            <div className="text-[10px] text-wood-400 font-bold mt-1 uppercase tracking-widest">{tx.expiryDate || 'Vô thời hạn'}</div>
                            </td>
                            <td className="px-8 py-6">
                                <p className="text-xs font-serif italic text-wood-600 leading-relaxed mb-2 font-medium">"{tx.reason}"</p>
                                <div className="space-y-2">
                                    <p className="text-[10px] text-wood-400 font-medium max-w-[250px] leading-snug">{(tx as any).notes}</p>
                                    <div className="flex items-center gap-3">
                                        <p className="text-[9px] font-black text-wood-300 uppercase tracking-widest">Lập bởi: {tx.createdBy || 'Hệ thống'}</p>
                                        {(tx as any).attachment && (
                                            <div className="flex items-center gap-1 text-[9px] text-amber-600 font-black uppercase tracking-widest animate-pulse">
                                                <Sparkles className="w-3 h-3" /> Có trích ảnh
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </td>
                            <td className="px-8 py-6 text-right">
                                <p className="text-xs font-black text-wood-900">{format(parseISO(tx.createdAt), 'dd/MM/yyyy')}</p>
                                <p className="text-[10px] text-wood-400 font-bold mt-1 uppercase tracking-widest">{format(parseISO(tx.createdAt), 'HH:mm:ss')}</p>
                            </td>
                        </tr>
                        ))}
                        {historyTransactions.length === 0 && (
                        <tr>
                            <td colSpan={5} className="py-40 text-center">
                                <div className="flex flex-col items-center justify-center opacity-30">
                                    <RefreshCcw className="w-16 h-16 text-wood-200 mb-6 animate-spin-slow" />
                                    <p className="text-xl font-display font-black text-wood-400 uppercase tracking-widest">Chưa có sử lục nào cho bảo vật này</p>
                                </div>
                            </td>
                        </tr>
                        )}
                    </tbody>
                    </table>
                </div>
              </div>
              
              <div className="mt-10 flex justify-end gap-4 border-t border-wood-50 pt-8">
                <button 
                  onClick={() => setShowHistoryModal(false)}
                  className="px-10 py-4 bg-wood-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-wood-900/20 hover:bg-black transition-all active:scale-95"
                >
                  Hoàn tất Xem lục
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Modal: Batch Import */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-wood-950/20 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-4xl rounded-[3rem] p-10 border border-wood-100 shadow-2xl max-h-[90vh] flex flex-col relative"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 via-wood-900 to-amber-400" />
              
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-wood-50 rounded-[1.5rem] flex items-center justify-center text-amber-600 shadow-inner border border-wood-100">
                    <FileUp className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-display font-black text-wood-900 tracking-tight">Cập nhật Lục vật Hàng loạt</h3>
                    <p className="text-sm font-serif italic text-wood-500">Xử lý nạp/xuất kho bằng tệp tin CSV</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsImportModalOpen(false)}
                  className="p-4 bg-wood-50 hover:bg-wood-100 rounded-2xl transition-all group"
                >
                  <X className="w-6 h-6 text-wood-300 group-hover:text-wood-900 transition-all" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pr-4">
                {importRows.length === 0 ? (
                  <div className="border-4 border-dashed border-wood-50 rounded-[3rem] py-24 text-center space-y-6 bg-wood-50/30 group hover:border-amber-200 transition-all">
                    <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mx-auto text-wood-100 shadow-sm border-2 border-wood-50 group-hover:scale-110 group-hover:text-amber-400 transition-all">
                        <Upload className="w-10 h-10" />
                    </div>
                    <div>
                      <p className="text-wood-600 font-black text-lg uppercase tracking-widest">Kéo thả File Lục (.csv)</p>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-4 px-8 py-3 bg-wood-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-wood-900/20 hover:bg-black transition-all active:scale-95"
                      >
                        Chọn từ Thiết bị
                      </button>
                      <button 
                        onClick={seedSampleInventory}
                        className="mt-4 ml-4 px-8 py-3 bg-amber-500 text-wood-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all active:scale-95"
                      >
                        Nạp dữ liệu 'thật' mặc định
                      </button>
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        accept=".csv" 
                        className="hidden" 
                        onChange={handleFileUpload}
                      />
                    </div>
                    <button 
                      onClick={downloadTemplate}
                      className="text-[10px] font-black text-amber-700 hover:text-amber-900 flex items-center gap-2 mx-auto uppercase tracking-widest group/tmp underline underline-offset-4"
                    >
                      <Download className="w-3 h-3 group-hover/tmp:translate-y-1 transition-transform" /> Tải Họa đồ mẫu (.csv)
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between bg-wood-50 p-6 rounded-2xl border border-wood-100 italic">
                      <p className="text-sm text-wood-600 font-medium">
                        Phát hiện <b>{importRows.length}</b> dòng dữ liệu. 
                        (<span className="text-emerald-600 font-bold">{importRows.filter(r => r.isValid).length} Bảo vật hợp thức</span>)
                      </p>
                      <button 
                        onClick={() => setImportRows([])}
                        className="px-6 py-2 bg-white text-rose-500 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-rose-50 transition-all border border-rose-100"
                      >
                        Hủy nạp / Làm lại
                      </button>
                    </div>

                    <div className="rounded-[2.5rem] border-2 border-wood-50 overflow-hidden shadow-inner bg-white bg-[url('https://www.transparenttextures.com/patterns/notebook-dark.png')] opacity-100">
                      <table className="w-full text-xs">
                        <thead className="bg-wood-100/50 text-wood-400 uppercase text-[9px] font-black tracking-widest">
                          <tr>
                            <th className="px-6 py-4 text-left">Bảo vật</th>
                            <th className="px-6 py-4 text-center">Khai thức</th>
                            <th className="px-6 py-4 text-center">Số lượng</th>
                            <th className="px-6 py-4">Lý chương</th>
                            <th className="px-6 py-4 text-right">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-wood-50 bg-white/80">
                          {importRows.map((row, idx) => (
                            <tr key={idx} className={cn(
                                "transition-colors",
                                row.isValid ? "hover:bg-emerald-50/30" : "bg-rose-50/30"
                            )}>
                              <td className="px-6 py-4 font-black text-wood-950 uppercase tracking-tight">{row.productName || 'Vô danh'}</td>
                              <td className="px-6 py-4 text-center">
                                <span className={cn(
                                    "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                                    row.type === 'in' ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                                )}>
                                    {row.type === 'in' ? 'Khai Nhập' : 'Khai Xuất'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center font-display font-black text-xl text-wood-900">{row.quantity}</td>
                              <td className="px-6 py-4 font-serif italic text-wood-500">{row.reason}</td>
                              <td className="px-6 py-4 text-right">
                                {row.isValid ? (
                                  <div className="flex items-center justify-end gap-2 text-emerald-600 font-black uppercase text-[9px]">
                                    <CheckCircle2 className="w-3 h-3" /> Hợp quy
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-2 text-rose-600 font-black uppercase text-[9px]">
                                        <AlertTriangle className="w-3 h-3" /> Bất hợp thức
                                    </div>
                                    <p className="text-[8px] text-rose-400 font-bold italic">{row.errors?.join(', ')}</p>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-8 flex flex-col sm:flex-row gap-4">
                        <button 
                            disabled={importRows.filter(r => r.isValid).length === 0}
                            onClick={executeImport}
                            className="flex-1 py-5 bg-wood-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-wood-900/40 hover:bg-black disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-4"
                        >
                            <CheckCircle2 className="w-5 h-5 text-amber-400" />
                            Xác thực Kinh lược ({importRows.filter(r => r.isValid).length} giao điểm)
                        </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
