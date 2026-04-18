import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  MoreVertical,
  Filter,
  Package,
  ArrowUpDown,
  Sparkles,
  Eye,
  X,
  Loader2,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Product, UnitType } from '../types.ts';
import { cn, formatCurrency } from '../lib/utils.ts';
import { generateProductImage } from '../services/imageGenService.ts';
import { motion, AnimatePresence } from 'motion/react';
import { List } from 'react-window';

interface ProductManagementProps {
  products: Product[];
  onAddProduct: (product: Product) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
}

export default function ProductManagement({ products, onAddProduct, onDeleteProduct }: ProductManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [stockStatus, setStockStatus] = useState<'all' | 'low' | 'instock' | 'out'>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showImageModal, setShowImageModal] = useState<string | null>(null);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  
  // Enhanced Filters & Sorting
  const [minPrice, setMinPrice] = useState<number | ''>('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [exactStock, setExactStock] = useState<number | ''>('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Product; direction: 'asc' | 'desc' } | null>(null);

  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('productVisibleColumns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse visible columns:", e);
      }
    }
    return {
      image: true,
      category: true,
      stock: true,
      price: true,
      actions: true
    };
  });

  useEffect(() => {
    localStorage.setItem('productVisibleColumns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);
  
  // New product form
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    category: '',
    unitPrice: 0,
    costPrice: 0,
    unit: 'each',
    stock: 0,
    description: '',
    image: ''
  });

  const processedProducts = useMemo(() => {
    let result = products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
      
      let matchesStock = true;
      if (stockStatus === 'low') matchesStock = (p.stock || 0) > 0 && (p.stock || 0) <= 5;
      else if (stockStatus === 'out') matchesStock = (p.stock || 0) <= 0;
      else if (stockStatus === 'instock') matchesStock = (p.stock || 0) > 5;

      // Enhanced filters
      const matchesMinPrice = minPrice === '' || p.unitPrice >= minPrice;
      const matchesMaxPrice = maxPrice === '' || p.unitPrice <= maxPrice;
      const matchesExactStock = exactStock === '' || p.stock === exactStock;

      return matchesSearch && matchesCategory && matchesStock && matchesMinPrice && matchesMaxPrice && matchesExactStock;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        const key = sortConfig.key as keyof Product;
        const aValue = a[key];
        const bValue = b[key];

        if (aValue === undefined || bValue === undefined) return 0;
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' ? Number(aValue) - Number(bValue) : Number(bValue) - Number(aValue);
        }
        
        return 0;
      });
    }

    return result;
  }, [products, searchTerm, filterCategory, stockStatus, minPrice, maxPrice, exactStock, sortConfig]);

  const requestSort = (key: keyof Product) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.unitPrice) {
      alert("Vui lòng nhập tên và giá bán của bảo vật.");
      return;
    }

    if (!newProduct.description || newProduct.description.trim().length < 10) {
      alert("Mô tả bảo vật là bắt buộc (tối thiểu 10 ký tự) để ghi nhận vào sử lục.");
      return;
    }
    
    setIsSaving(true);
    try {
      const product: Product = {
        id: Math.random().toString(36).substr(2, 9),
        name: newProduct.name!,
        category: newProduct.category || 'Vật phẩm quý',
        unitPrice: Number(newProduct.unitPrice),
        costPrice: Number(newProduct.costPrice || 0),
        unit: (newProduct.unit as string) || 'each',
        stock: Number(newProduct.stock || 0),
        description: newProduct.description,
        image: newProduct.image || null
      };

      await onAddProduct(product);
      setNewProduct({ name: '', category: '', unitPrice: 0, costPrice: 0, unit: 'each', stock: 0, description: '', image: '' });
      setIsAdding(false);
      alert("Đã lưu bảo vật vào Kho lục thành công!");
    } catch (error: any) {
      console.error("Save error:", error);
      alert("Lỗi khi lưu bảo vật: " + (error.message || "Không xác định"));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!productToDelete) return;

    try {
      await onDeleteProduct(id);
      setProductToDelete(null);
    } catch (error: any) {
      alert("Lỗi khi xóa: " + error.message);
    }
  };

  const handleGenerateAIImage = async () => {
    if (!newProduct.name || !newProduct.description) {
      alert("Vui lòng nhập tên và mô tả chi tiết để AI có thể phác họa hình ảnh chính xác nhất.");
      return;
    }

    setIsGeneratingImage(true);
    try {
      const imageUrl = await generateProductImage(newProduct.name, newProduct.description);
      setNewProduct(prev => ({ ...prev, image: imageUrl }));
    } catch (error: any) {
      alert("Phác họa bằng AI thất bại: " + (error.message || "Lỗi hệ thống"));
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-wood-100">
        <div>
          <h1 className="text-4xl font-display font-black text-wood-900 tracking-tighter">Kho lục Bảo vật</h1>
          <p className="text-base text-wood-500 font-serif italic mt-1 font-medium">Bản thảo ghi chép và phác họa danh lục các vật phẩm quý hiếm</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="px-8 py-4 bg-wood-900 text-white rounded-[2rem] font-black flex items-center justify-center gap-3 hover:bg-wood-950 shadow-xl shadow-wood-900/10 transition-all active:scale-95"
        >
          <Plus className="w-6 h-6 text-amber-400" />
          Khai báo Bảo vật
        </button>
      </header>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-wood-400" />
            <input 
              type="text" 
              placeholder="Truy tìm danh tính hoặc dòng đồ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-white border-none rounded-[1.5rem] outline-none focus:ring-2 focus:ring-wood-200 transition-all shadow-sm font-bold text-wood-900 shadow-inner"
            />
          </div>
          
          <div className="flex bg-wood-100 p-1.5 rounded-[1.5rem] shadow-inner">
            {(['all', 'low', 'out'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStockStatus(status)}
                className={cn(
                  "px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
                  stockStatus === status 
                    ? "bg-white text-wood-900 shadow-sm" 
                    : "text-wood-400 hover:text-wood-600"
                )}
              >
                {status === 'all' ? 'Tất cả' : status === 'low' ? 'Sắp cạn' : 'Đã hết'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <select 
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-6 py-4 bg-white border-none rounded-[1.5rem] text-sm font-black text-wood-900 outline-none hover:bg-wood-50 shadow-sm transition-all appearance-none cursor-pointer pr-12 relative"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238E5D3D' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.5rem center', backgroundSize: '1.2rem' }}
            >
              <option value="all">Mọi Dòng đồ</option>
              {Array.from(new Set(products.map(p => p.category))).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <div className="relative">
              <button 
                onClick={() => setShowColumnConfig(!showColumnConfig)}
                className="p-4 bg-white border border-wood-100 rounded-[1.5rem] text-wood-600 font-bold flex items-center gap-2 hover:bg-wood-50 shadow-sm transition-all"
              >
                <Filter className="w-5 h-5 text-amber-600" />
              </button>
              <AnimatePresence>
                {showColumnConfig && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-4 w-60 bg-white rounded-[2rem] border border-wood-100 shadow-2xl p-6 z-50 space-y-4"
                  >
                    <p className="small-caps opacity-50 mb-2">Tùy biến nhãn mục</p>
                    {(Object.keys(visibleColumns) as Array<keyof typeof visibleColumns>).map((col) => (
                      <label key={col.toString()} className="flex items-center gap-4 cursor-pointer group">
                        <div className="relative flex items-center">
                          <input 
                            type="checkbox" 
                            checked={visibleColumns[col]}
                            onChange={() => setVisibleColumns({ ...visibleColumns, [col]: !visibleColumns[col] })}
                            className="peer h-6 w-6 cursor-pointer appearance-none rounded-lg border-2 border-wood-100 bg-wood-50 transition-all checked:bg-wood-900 checked:border-wood-900"
                          />
                          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-white opacity-0 peer-checked:opacity-100 transition-opacity">
                             <Sparkles className="w-3 h-3" />
                          </div>
                        </div>
                        <span className="text-sm font-bold text-wood-700 group-hover:text-wood-900 capitalize">
                          {col === 'image' ? 'Phác họa' : col === 'category' ? 'Dòng đồ' : col === 'stock' ? 'Tồn khố' : col === 'price' ? 'Kim ngạch' : 'Hành vụ'}
                        </span>
                      </label>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Enhanced Filter Bar */}
        <div className="antique-card !p-6 flex flex-wrap items-center gap-8 bg-white/40 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <span className="small-caps opacity-40">Ngưỡng Ngân khố:</span>
            <div className="flex items-center gap-2">
                <input 
                    type="number" 
                    placeholder="Thiểu" 
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-28 px-4 py-2 bg-white border border-wood-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-wood-200 font-bold"
                />
                <span className="text-wood-200 font-display">~</span>
                <input 
                    type="number" 
                    placeholder="Đại"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-28 px-4 py-2 bg-white border border-wood-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-wood-200 font-bold"
                />
            </div>
          </div>
          <div className="w-px h-8 bg-wood-100 hidden md:block" />
          <div className="flex items-center gap-4">
            <span className="small-caps opacity-40">Ấn định Tồn kho:</span>
            <input 
              type="number" 
              placeholder="S.L chính xác..."
              value={exactStock}
              onChange={(e) => setExactStock(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-32 px-4 py-2 bg-white border border-wood-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-wood-200 font-bold"
            />
          </div>
          <button 
            onClick={() => {
              setMinPrice('');
              setMaxPrice('');
              setExactStock('');
              setSearchTerm('');
              setFilterCategory('all');
              setStockStatus('all');
            }}
            className="ml-auto flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-tighter text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
          >
             <X className="w-4 h-4" /> Hoàn nguyên bộ lọc
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="antique-card p-10 space-y-8 animate-in fade-in slide-in-from-top-4 duration-500 overflow-visible relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 via-wood-800 to-amber-400 opacity-20" />
          
          <div className="flex items-center justify-between mb-2">
            <div>
                <h3 className="text-2xl font-display font-black text-wood-900">Khai báo Bảo vật mới</h3>
                <p className="text-sm text-wood-400 font-serif italic mt-1 leading-none">Minh bạch sử liệu, nạp lục vào Kho văn</p>
            </div>
            <button 
                onClick={() => setIsAdding(false)} 
                className="p-3 text-wood-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="space-y-3">
              <label className="small-caps">Tên Bảo vật</label>
              <input 
                type="text" 
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                className="w-full px-6 py-4 bg-wood-50 border-none rounded-[1.5rem] font-bold text-wood-900 outline-none focus:ring-2 focus:ring-wood-200 shadow-inner"
                placeholder="VD: Bình hoa Cổ Nghệ..."
              />
            </div>
            <div className="space-y-3">
              <label className="small-caps">Dòng đồ / Chất liệu</label>
              <input 
                type="text" 
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                className="w-full px-6 py-4 bg-wood-50 border-none rounded-[1.5rem] font-bold text-wood-900 outline-none focus:ring-2 focus:ring-wood-200 shadow-inner"
                placeholder="Trạm khảm / Gốm Chu Đậu..."
              />
            </div>
            <div className="space-y-3">
              <label className="small-caps">Quy cách định giá</label>
              <div className="flex gap-2">
                <select 
                  value={['each', 'm', 'm2'].includes(newProduct.unit || 'each') ? newProduct.unit : 'custom'}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setNewProduct({ ...newProduct, unit: '' });
                    } else {
                      setNewProduct({ ...newProduct, unit: e.target.value });
                    }
                  }}
                  className="flex-1 px-6 py-4 bg-wood-50 border-none rounded-[1.5rem] font-bold text-wood-900 outline-none focus:ring-2 focus:ring-wood-200 appearance-none shadow-inner cursor-pointer"
                >
                  <option value="each">Cái / Bộ</option>
                  <option value="m">Mét dài (m)</option>
                  <option value="m2">Mét vuông (m2)</option>
                  <option value="custom">Đơn vị khác...</option>
                </select>
                {!['each', 'm', 'm2'].includes(newProduct.unit || 'each') && (
                  <input 
                    type="text"
                    placeholder="Nhập..."
                    value={newProduct.unit}
                    onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                    className="w-24 px-4 py-4 bg-white border-2 border-wood-100 rounded-[1.5rem] font-bold text-amber-900 outline-none focus:ring-2 focus:ring-amber-200"
                  />
                )}
              </div>
            </div>
            <div className="space-y-3">
              <label className="small-caps">Kim ngạch bán (VNĐ)</label>
              <div className="relative">
                <input 
                    type="number" 
                    value={newProduct.unitPrice}
                    onChange={(e) => setNewProduct({ ...newProduct, unitPrice: Number(e.target.value) })}
                    className="w-full px-6 py-4 bg-amber-50 border-none rounded-[1.5rem] font-black text-amber-900 outline-none focus:ring-2 focus:ring-amber-200 shadow-inner"
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-amber-400 font-bold">₫</div>
              </div>
            </div>
            <div className="space-y-3">
              <label className="small-caps opacity-50">Giá vốn nạp kho (VNĐ)</label>
              <div className="relative">
                <input 
                    type="number" 
                    value={newProduct.costPrice}
                    onChange={(e) => setNewProduct({ ...newProduct, costPrice: Number(e.target.value) })}
                    className="w-full px-6 py-4 bg-wood-50 border-none rounded-[1.5rem] font-bold text-wood-400 outline-none focus:ring-2 focus:ring-wood-200 shadow-inner"
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-wood-200 font-bold">₫</div>
              </div>
            </div>
            <div className="space-y-3">
              <label className="small-caps">Tồn khố hiện hữu</label>
              <div className="relative">
                <input 
                    type="number" 
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: Number(e.target.value) })}
                    className="w-full px-6 py-4 bg-wood-50 border-none rounded-[1.5rem] font-black text-wood-900 outline-none focus:ring-2 focus:ring-wood-200 shadow-inner"
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-wood-300 font-bold lowercase">{newProduct.unit}</div>
              </div>
            </div>
            <div className="space-y-3 lg:col-span-2">
              <label className="small-caps">Điển tích & Giai thoại (Biên lục)</label>
              <textarea 
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                className="w-full px-6 py-4 bg-wood-50 border-none rounded-[1.5rem] font-medium text-wood-900 outline-none focus:ring-2 focus:ring-wood-200 min-h-[140px] shadow-inner"
                placeholder="Ghi lại nguồn gốc, điển tích hoặc thông số chi tiết của bảo vật vào niên giám..."
              />
            </div>
            <div className="space-y-3">
              <label className="small-caps">Phác họa Bảo vật (Ảnh)</label>
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <input 
                    type="text" 
                    value={newProduct.image}
                    onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                    className="w-full px-6 py-4 bg-wood-50 border-none rounded-[1.5rem] font-bold text-wood-900 outline-none focus:ring-2 focus:ring-wood-200 shadow-inner pr-24"
                    placeholder="Dẫn nhập họa đồ (URL)..."
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
                    {newProduct.image && (
                        <button 
                            onClick={() => setShowImageModal(newProduct.image || null)}
                            className="p-2 bg-white rounded-xl shadow-sm hover:text-amber-600 transition-colors"
                        >
                            <Eye className="w-4 h-4" />
                        </button>
                    )}
                     <button 
                        onClick={handleGenerateAIImage}
                        disabled={isGeneratingImage}
                        className="p-3 bg-amber-400 text-wood-900 rounded-xl font-bold hover:bg-amber-300 transition-all shadow-lg shadow-amber-400/20 active:scale-95 disabled:opacity-50"
                        title="Dùng AI phác họa họa đồ"
                    >
                        {isGeneratingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                    {newProduct.image && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-4 bg-wood-50 rounded-[1.5rem] border border-wood-100 flex items-center gap-6"
                        >
                            <div className="w-20 h-20 rounded-[1.2rem] overflow-hidden border-2 border-white shadow-md rotate-2 shrink-0">
                                <img src={newProduct.image} alt="Họa đồ Preview" className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <p className="text-xs font-black text-amber-700 uppercase tracking-widest">Họa đồ phác thảo</p>
                                <p className="text-[10px] text-wood-400 font-serif italic">Bản phục dựng qua tâm khảm số</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
              </div>
            </div>
          </div>
          <div className="pt-6 flex justify-end gap-4">
            <button 
                onClick={() => setIsAdding(false)}
                className="px-8 py-4 text-wood-400 font-bold hover:text-wood-600 transition-all"
            >
                Bỏ qua
            </button>
            <button 
              onClick={handleAddProduct}
              disabled={isSaving}
              className="px-10 py-4 bg-wood-900 text-white rounded-[2rem] font-black hover:bg-wood-950 transition-all shadow-xl shadow-wood-900/10 active:scale-95 flex items-center gap-3 disabled:opacity-50"
            >
              {isSaving && <Loader2 className="w-5 h-5 animate-spin text-amber-400" />}
              Chấp bút lưu Niên giám
            </button>
          </div>
        </div>
      )}

      <div className="antique-card overflow-hidden flex flex-col min-h-[600px] relative">
        <div className="bg-wood-50/50 border-b border-wood-100 flex items-center">
          <div 
            className="px-8 py-6 text-[10px] font-black text-wood-400 uppercase tracking-[0.2em] flex-1 cursor-pointer hover:text-wood-900 transition-colors flex items-center gap-3"
            onClick={() => requestSort('name')}
          >
            Mô tả Bảo vật nạp lục
            {sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-amber-600" /> : <ChevronDown className="w-4 h-4 text-amber-600" />) : <ArrowUpDown className="w-3 h-3 opacity-20" />}
          </div>
          {visibleColumns.category && (
            <div 
              className="px-8 py-6 text-[10px] font-black text-wood-400 uppercase tracking-[0.2em] w-40 cursor-pointer hover:text-wood-900 transition-colors flex items-center gap-3"
              onClick={() => requestSort('category')}
            >
              Dòng đồ
              {sortConfig?.key === 'category' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-amber-600" /> : <ChevronDown className="w-4 h-4 text-amber-600" />) : <ArrowUpDown className="w-3 h-3 opacity-20" />}
            </div>
          )}
          {visibleColumns.stock && (
            <div 
              className="px-8 py-6 text-[10px] font-black text-wood-400 uppercase tracking-[0.2em] w-32 text-center cursor-pointer hover:text-wood-900 transition-colors flex items-center justify-center gap-3"
              onClick={() => requestSort('stock')}
            >
              Tồn khố
              {sortConfig?.key === 'stock' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-amber-600" /> : <ChevronDown className="w-4 h-4 text-amber-600" />) : <ArrowUpDown className="w-3 h-3 opacity-20" />}
            </div>
          )}
          {visibleColumns.price && (
            <div 
              className="px-8 py-6 text-[10px] font-black text-wood-400 uppercase tracking-[0.2em] w-64 text-right cursor-pointer hover:text-wood-900 transition-colors flex items-center justify-end gap-3"
              onClick={() => requestSort('unitPrice')}
            >
              Kim ngạch nạp lục
              {sortConfig?.key === 'unitPrice' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-amber-600" /> : <ChevronDown className="w-4 h-4 text-amber-600" />) : <ArrowUpDown className="w-3 h-3 opacity-20" />}
            </div>
          )}
          {visibleColumns.actions && <div className="px-8 py-6 w-32"></div>}
        </div>

        <div className="flex-1 bg-white">
          {processedProducts.length > 0 ? (
            <List
              rowCount={processedProducts.length}
              rowHeight={100}
              className="custom-scrollbar"
              style={{ height: 600, width: '100%' }}
              rowComponent={({ index, style }) => {
                const product = processedProducts[index];
                return (
                  <div style={style} className="group hover:bg-wood-50/40 transition-all duration-300 border-b border-wood-50 flex items-center">
                    <div className="px-8 py-4 flex-1 overflow-hidden">
                      <div className="flex items-center gap-6">
                        {visibleColumns.image && (
                          <div 
                            onClick={() => { if(product.image) setShowImageModal(product.image) }}
                            className="w-16 h-16 bg-wood-50 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-2 group-hover:border-amber-100 group-hover:shadow-2xl transition-all overflow-hidden shrink-0 cursor-pointer border-4 border-white shadow-xl"
                          >
                            {product.image ? (
                              <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <Package className="w-8 h-8 text-wood-100" />
                            )}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-lg font-display font-black text-wood-900 truncate group-hover:text-amber-800 transition-colors uppercase tracking-tight">{product.name}</h4>
                          <p className="text-sm text-wood-400 font-serif italic truncate mt-0.5">{product.description || 'Chưa cập nhật sử liệu kinh điển'}</p>
                        </div>
                      </div>
                    </div>
                    {visibleColumns.category && (
                      <div className="px-8 py-4 w-40 shrink-0">
                        <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-4 py-1.5 rounded-full border border-amber-100 uppercase tracking-widest truncate block text-center shadow-sm">
                          {product.category}
                        </span>
                      </div>
                    )}
                    {visibleColumns.stock && (
                      <div className="px-8 py-4 w-32 shrink-0 text-center">
                        <div className={cn(
                          "text-xl font-display font-black",
                          (product.stock || 0) <= 5 ? "text-rose-500" : "text-emerald-600"
                        )}>
                          {product.stock || 0}
                        </div>
                        <div className="small-caps !text-[9px] opacity-40">{product.unit}</div>
                      </div>
                    )}
                    {visibleColumns.price && (
                      <div className="px-8 py-4 w-64 shrink-0 text-right">
                        <div className="text-xl font-display font-black text-wood-950">{formatCurrency(product.unitPrice)}</div>
                        <div className="text-[10px] text-wood-400 font-black uppercase tracking-widest mt-1">Vốn: {formatCurrency(product.costPrice || 0)}</div>
                      </div>
                    )}
                    {visibleColumns.actions && (
                      <div className="px-8 py-4 w-32 shrink-0 text-right">
                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                          <button className="p-3 text-wood-200 hover:text-wood-900 hover:bg-white hover:shadow-lg rounded-2xl transition-all">
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => setProductToDelete(product)}
                            className="p-3 text-wood-200 hover:text-rose-500 hover:bg-rose-50 hover:shadow-lg rounded-2xl transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }}
              rowProps={{}}
            />
          ) : (
            <div className="py-40 text-center flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-700">
              <div className="w-32 h-32 bg-wood-50 rounded-[3rem] flex items-center justify-center text-wood-100 mb-8 border-2 border-dashed border-wood-100 scale-110 opacity-50">
                   <Package className="w-16 h-16" />
              </div>
              <p className="text-2xl font-serif font-bold italic text-wood-300">Không tìm thấy vật phẩm nào trong Niên giám</p>
              <button 
                onClick={() => { setSearchTerm(''); setFilterCategory('all'); setStockStatus('all'); }}
                className="mt-6 text-sm font-black uppercase tracking-widest text-wood-400 hover:text-wood-900 transition-colors"
                >Làm mới tầm soát</button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {productToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-wood-950/40 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white max-w-md w-full rounded-[3rem] p-12 border border-wood-100 shadow-3xl text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-rose-500" />
              <div className="w-24 h-24 bg-rose-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-rose-500 shadow-inner">
                <Trash2 className="w-10 h-10" />
              </div>
              <h3 className="text-3xl font-display font-black text-wood-900 mb-4 tracking-tight">Xóa Bảo Vật?</h3>
              <p className="text-base text-wood-500 mb-10 font-serif italic font-medium leading-relaxed">
                Bạn có chắc chắn muốn gác lại sử liệu về <span className="text-wood-900 font-black">"{productToDelete.name}"</span>? 
                Hành động này sẽ gỡ bỏ bảo vật khỏi Kho lục và vĩnh viễn không thể hồi phục.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => deleteProduct(productToDelete.id)}
                  className="w-full py-5 bg-rose-600 text-white font-black text-lg rounded-[2rem] hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/20 active:scale-95"
                >
                  Xác nhận Khai tử
                </button>
                <button 
                  onClick={() => setProductToDelete(null)}
                  className="w-full py-5 text-wood-400 font-bold hover:text-wood-900 rounded-[2rem] transition-all"
                >
                  Trở lại Kho lục
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showImageModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-4xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl"
            >
              <button 
                onClick={() => setShowImageModal(null)}
                className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors z-10"
              >
                <X className="w-6 h-6" />
              </button>
              <img 
                src={showImageModal} 
                className="w-full h-auto max-h-[80vh] object-contain bg-wood-50" 
                alt="Full size"
                referrerPolicy="no-referrer"
              />
              <div className="p-6 text-center">
                <p className="text-sm font-bold text-wood-900 italic">Cổ Nghệ Phác Họa - Bảo Vật Toàn Cảnh</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
