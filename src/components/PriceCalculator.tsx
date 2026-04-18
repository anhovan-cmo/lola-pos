import { useState, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Calculator as CalcIcon, 
  Save, 
  User, 
  Phone,
  ArrowRight,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Quote, Calculation } from '../types.ts';
import { cn, formatCurrency, formatNumber } from '../lib/utils.ts';

interface PriceCalculatorProps {
  products: Product[];
  onSaveQuote: (quote: Quote) => void;
}

export default function PriceCalculator({ products, onSaveQuote }: PriceCalculatorProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [items, setItems] = useState<Calculation[]>([]);

  // State for current item being added
  const [selectedProductId, setSelectedProductId] = useState('');
  const [length, setLength] = useState<number>(0);
  const [width, setWidth] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);

  const selectedProduct = useMemo(() => 
    products.find(p => p.id === selectedProductId), 
    [products, selectedProductId]
  );

  const addItem = () => {
    if (!selectedProduct) return;

    let totalArea = 1;
    if (selectedProduct.unit === 'm') totalArea = length;
    else if (selectedProduct.unit === 'm2') totalArea = length * width;
    
    const totalPrice = selectedProduct.unitPrice * totalArea * quantity;

    const newItem: Calculation = {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      length,
      width: selectedProduct.unit === 'm2' ? width : null,
      quantity,
      unitPrice: selectedProduct.unitPrice,
      unit: selectedProduct.unit,
      totalArea,
      totalPrice,
    };

    setItems([...items, newItem]);
    // Reset inputs
    setLength(0);
    setWidth(0);
    setQuantity(1);
    setSelectedProductId('');
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = useMemo(() => 
    items.reduce((acc, item) => acc + item.totalPrice, 0), 
    [items]
  );

  const handleSave = async () => {
    if (!customerName || items.length === 0) {
      alert("Vui lòng ghi rõ danh tính Khách hữu và ít nhất một bảo vật.");
      return;
    }

    const newQuote: Quote = {
      id: Math.random().toString(36).substr(2, 9),
      customerName,
      customerPhone,
      items,
      totalAmount,
      paidAmount: Number(paidAmount),
      createdAt: new Date().toISOString(),
      status: 'ordered',
    };

    try {
      await onSaveQuote(newQuote);
      // Reset form
      setItems([]);
      setCustomerName('');
      setCustomerPhone('');
      setPaidAmount(0);
      alert("Hợp thư Giao kèo đã được niêm phong và lưu vào Niên giám!");
    } catch (error) {
      console.error("Save error:", error);
      alert("Có lỗi xảy ra khi lưu giao kèo. Vui lòng thử lại.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
      {/* Input Section */}
      <div className="lg:col-span-2 space-y-10">
        {/* Customer Info */}
        <div className="antique-card p-10 space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-wood-50 rounded-bl-[5rem] -mr-10 -mt-10 opacity-50" />
          <h3 className="text-2xl font-display font-black flex items-center gap-3 text-wood-900 relative z-10">
            <User className="w-6 h-6 text-amber-600" />
            Danh tính Khách hữu
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            <div className="space-y-3">
              <label className="small-caps">Họ tên / Danh xưng</label>
              <div className="relative">
                 <input 
                    type="text" 
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nguyễn Công Trình..."
                    className="w-full px-6 py-4 bg-wood-50 border-2 border-transparent rounded-[1.5rem] outline-none focus:border-wood-200 focus:bg-white transition-all font-bold text-wood-900 shadow-inner"
                  />
              </div>
            </div>
            <div className="space-y-3">
              <label className="small-caps">Sổ liên lạc</label>
              <input 
                type="tel" 
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="09xx xxx xxx"
                className="w-full px-6 py-4 bg-wood-50 border-2 border-transparent rounded-[1.5rem] outline-none focus:border-wood-200 focus:bg-white transition-all font-bold text-wood-900 shadow-inner"
              />
            </div>
          </div>
        </div>

        {/* Calculator Tool */}
        <div className="antique-card p-10 space-y-8">
          <h3 className="text-2xl font-display font-black flex items-center gap-3 text-wood-900">
            <CalcIcon className="w-6 h-6 text-amber-600" />
            Định giá Bảo vật
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3 md:col-span-2">
              <label className="small-caps">Chọn Bảo vật / Nội thất</label>
              <div className="relative">
                <select 
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-6 py-4 bg-wood-50 border-2 border-transparent rounded-[1.5rem] outline-none focus:border-wood-200 focus:bg-white transition-all font-bold text-wood-900 appearance-none shadow-inner cursor-pointer"
                >
                    <option value="">-- Khai mở danh lục bảo vật --</option>
                    {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.unitPrice)}/{p.unit})</option>
                    ))}
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-wood-400">
                    <Plus className="w-5 h-5" />
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="small-caps">Số lượng / Kiện</label>
              <input 
                type="number" 
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                min="1"
                className="w-full px-6 py-4 bg-wood-50 border-2 border-transparent rounded-[1.5rem] outline-none focus:border-wood-200 focus:bg-white transition-all font-bold text-wood-900 shadow-inner"
              />
            </div>

            {selectedProduct && selectedProduct.unit !== 'each' && (
              <div className="space-y-3">
                <label className="small-caps">
                  Chiều dài (mét)
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                  className="w-full px-6 py-4 bg-amber-50 border-2 border-amber-200 rounded-[1.5rem] outline-none focus:border-amber-400 focus:bg-white transition-all font-black text-amber-900 shadow-inner"
                />
              </div>
            )}

            {selectedProduct && selectedProduct.unit === 'm2' && (
              <div className="space-y-3">
                <label className="small-caps">
                  Chiều rộng (mét)
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  className="w-full px-6 py-4 bg-amber-50 border-2 border-amber-200 rounded-[1.5rem] outline-none focus:border-amber-400 focus:bg-white transition-all font-black text-amber-900 shadow-inner"
                />
              </div>
            )}
          </div>

          <AnimatePresence>
            {selectedProduct && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-wood-50 rounded-[1.5rem] flex items-center gap-4 border border-wood-100"
                >
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                        <Info className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-sm text-wood-900 font-bold">Quy cách định tính</p>
                        <p className="text-xs text-wood-500 font-serif italic">
                            Sản vật này tính theo <strong>{selectedProduct.unit === 'm' ? 'mét dài' : selectedProduct.unit === 'm2' ? 'mét vuông' : 'chiếc'}</strong>. 
                            Định mức: {formatCurrency(selectedProduct.unitPrice)}
                        </p>
                    </div>
                </motion.div>
            )}
          </AnimatePresence>

          <button 
            onClick={addItem}
            disabled={!selectedProduct || (selectedProduct.unit !== 'each' && length <= 0)}
            className="w-full py-5 bg-wood-900 text-white rounded-[2rem] font-black flex items-center justify-center gap-3 hover:bg-wood-950 disabled:opacity-30 disabled:grayscale transition-all shadow-[0_20px_40px_-10px_rgba(29,17,8,0.3)] active:scale-95"
          >
            <Plus className="w-6 h-6 text-amber-400" />
            Đưa vào Giao kèo
          </button>
        </div>

        {/* Items Table */}
        <div className="antique-card flex flex-col">
          <div className="p-8 border-b border-wood-100 flex items-center justify-between">
            <h3 className="text-xl font-display font-bold text-wood-900">Chi tiết Ngân khố</h3>
            <span className="small-caps opacity-50">{items.length} hạng mục</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-wood-50/50">
                  <th className="px-8 py-5 text-left small-caps opacity-60">Bảo vật</th>
                  <th className="px-8 py-5 text-center small-caps opacity-60">Khổ sai</th>
                  <th className="px-8 py-5 text-center small-caps opacity-60">SL</th>
                  <th className="px-8 py-5 text-right small-caps opacity-60">Thành tiền</th>
                  <th className="px-8 py-5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-wood-100">
                {items.length > 0 ? items.map((item, i) => (
                  <tr key={i} className="hover:bg-wood-50/30 transition-colors group">
                    <td className="px-8 py-6">
                      <span className="font-bold text-wood-900 block group-hover:text-amber-800 transition-colors">{item.productName}</span>
                      <p className="text-[10px] text-wood-400 font-black uppercase tracking-widest mt-1">Đơn vị: {item.unit}</p>
                    </td>
                    <td className="px-8 py-6 text-center text-sm font-bold text-wood-600">
                      {item.unit === 'm' ? `${formatNumber(item.length)}m` : 
                       item.unit === 'm2' ? `${formatNumber(item.length)}x${formatNumber(item.width || 0)}m` : 
                       'Hữu hình'}
                    </td>
                    <td className="px-8 py-6 text-center text-sm font-black text-wood-900">{item.quantity}</td>
                    <td className="px-8 py-6 text-right">
                      <span className="text-base font-display font-black text-amber-900">{formatCurrency(item.totalPrice)}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => removeItem(i)}
                        className="p-2 text-wood-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        title="Loại bỏ"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center opacity-30">
                            <CalcIcon className="w-12 h-12 mb-4" />
                            <p className="font-serif italic text-lg">Hợp văn đang trống, vui lòng chọn bảo vật</p>
                        </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="space-y-10">
        <div className="bg-wood-950 text-white p-10 rounded-[3rem] shadow-2xl shadow-wood-950/20 border border-wood-800 sticky top-28 overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
          
          <h3 className="text-2xl font-display font-bold mb-10 flex items-center gap-3 relative z-10">
            <div className="p-2 bg-amber-400 rounded-xl">
                 <Save className="w-5 h-5 text-wood-900" />
            </div>
            Tòng văn Giao kèo
          </h3>
          
          <div className="space-y-6 font-medium relative z-10">
            <div className="flex justify-between items-center text-wood-300 text-base">
              <span className="font-serif italic">Tạm tính ngân xuyến</span>
              <span className="text-white font-bold">{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex justify-between items-center text-wood-300 text-base">
              <span className="font-serif italic">Sử lục bảo vật</span>
              <span className="text-white font-bold">{items.length} kiện</span>
            </div>
            
            <div className="py-8 my-8 border-y border-white/10">
               <div className="flex flex-col gap-2">
                <p className="small-caps !text-amber-400">Tổng cộng Kim Ngạch</p>
                <div className="flex items-baseline gap-2">
                     <h2 className="text-5xl font-display font-black tracking-tighter text-amber-400">{formatCurrency(totalAmount).replace('₫', '')}</h2>
                     <span className="text-2xl font-display text-white italic">₫</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="small-caps !text-wood-400">Tiền khách đã ứng (đặt cọc)</label>
              <div className="relative">
                 <input 
                    type="number" 
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    className="w-full px-6 py-5 bg-white/5 border border-white/10 rounded-[1.5rem] outline-none focus:bg-white/10 focus:border-amber-400 transition-all font-display font-black text-white text-2xl shadow-inner"
                    placeholder="0"
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-wood-400 font-bold">₫</div>
              </div>
              <div className="flex justify-between items-center px-2">
                  <span className="text-xs text-wood-400 italic font-serif">Ngân xuyến còn lại:</span>
                  <span className="text-sm font-bold text-amber-200">{formatCurrency(Math.max(0, totalAmount - paidAmount))}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-12 space-y-6 relative z-10">
            <button 
              onClick={handleSave}
              disabled={!customerName || items.length === 0}
              className="w-full py-6 bg-amber-400 text-wood-950 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 hover:bg-white transition-all shadow-xl shadow-amber-400/20 disabled:opacity-20 disabled:grayscale active:scale-95"
            >
              <Save className="w-6 h-6" />
              Lập Giao kèo & Ấn định
            </button>
            <div className="flex flex-col items-center gap-2 opacity-40">
                <div className="w-full h-px bg-white/20" />
                <p className="text-[10px] text-center font-black uppercase tracking-widest leading-relaxed px-4">
                  Giao kèo điện tử có giá trị niêm phong sử lục <br/> tại LOLA POS
                </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
