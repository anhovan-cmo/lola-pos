import { 
  X, 
  Smartphone, 
  CheckCircle2, 
  QrCode,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Quote } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { useState } from 'react';

interface DigitalWalletModalProps {
  quote: Quote;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DigitalWalletModal({ quote, onClose, onSuccess }: DigitalWalletModalProps) {
  const [selectedWallet, setSelectedWallet] = useState<'momo' | 'zalopay' | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [step, setStep] = useState<'select' | 'qr' | 'success'>('select');

  const handleWalletSelect = (wallet: 'momo' | 'zalopay') => {
    setSelectedWallet(wallet);
    setStep('qr');
  };

  const handleConfirmPayment = () => {
    setIsConfirming(true);
    // Simulate payment processing
    setTimeout(() => {
      setIsConfirming(false);
      setStep('success');
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm shadow-2xl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl border border-wood-100"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-wood-400 hover:text-wood-900 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-wood-900 rounded-xl flex items-center justify-center shadow-lg">
              <Smartphone className="text-amber-400 w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-serif font-black text-wood-900">Ví Điện Tử</h3>
              <p className="text-xs text-wood-400 font-bold uppercase tracking-widest">Thanh toán nhanh chóng</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === 'select' && (
              <motion.div 
                key="select"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <p className="text-sm text-wood-600 font-medium mb-4">Chọn phương thức thanh toán yêu thích của bạn:</p>
                
                <button 
                  onClick={() => handleWalletSelect('momo')}
                  className="w-full p-6 bg-pink-50 border border-pink-100 rounded-3xl flex items-center justify-between hover:bg-pink-100 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-pink-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md">M</div>
                    <div className="text-left">
                      <p className="font-black text-pink-900">MoMo</p>
                      <p className="text-[10px] text-pink-700 font-bold uppercase tracking-tighter cursor-default">Thanh toán qua app MoMo</p>
                    </div>
                  </div>
                  <Smartphone className="w-5 h-5 text-pink-400 group-hover:scale-110 transition-transform" />
                </button>

                <button 
                  onClick={() => handleWalletSelect('zalopay')}
                  className="w-full p-6 bg-blue-50 border border-blue-100 rounded-3xl flex items-center justify-between hover:bg-blue-100 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md">Z</div>
                    <div className="text-left">
                      <p className="font-black text-blue-900">ZaloPay</p>
                      <p className="text-[10px] text-blue-700 font-bold uppercase tracking-tighter cursor-default">Thanh toán qua ZaloPay</p>
                    </div>
                  </div>
                  <Smartphone className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
                </button>
              </motion.div>
            )}

            {step === 'qr' && (
              <motion.div 
                key="qr"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 text-center"
              >
                <div className="bg-wood-50 p-6 rounded-[2rem] border-2 border-dashed border-wood-200 relative group">
                  <div className="bg-white p-4 rounded-3xl shadow-inner inline-block relative">
                    <QrCode className={cn(
                      "w-48 h-48",
                      selectedWallet === 'momo' ? "text-pink-600" : "text-blue-600"
                    )} />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/20 backdrop-blur-[2px] rounded-3xl">
                      <Smartphone className="w-12 h-12 text-wood-900/40" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-[10px] font-black text-wood-400 uppercase tracking-widest mb-1">Số tiền cần thanh toán</p>
                    <h2 className="text-3xl font-serif font-black text-wood-900">{formatCurrency(quote.totalAmount)}</h2>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-center text-[10px] font-bold text-emerald-600 bg-emerald-50 py-2 px-4 rounded-full mx-auto w-fit">
                  <ShieldCheck className="w-3 h-3" />
                  Giao dịch an toàn & Bảo mật
                </div>

                <div className="space-y-3 pt-4">
                  <button 
                    onClick={handleConfirmPayment}
                    disabled={isConfirming}
                    className="w-full py-4 bg-wood-900 text-white rounded-2xl font-black text-lg shadow-xl shadow-wood-100 hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {isConfirming ? (
                      <>
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        />
                        Đang xác thực...
                      </>
                    ) : (
                      "Tôi đã thanh toán"
                    )}
                  </button>
                  <button 
                    onClick={() => setStep('select')}
                    className="text-wood-400 text-xs font-bold hover:text-wood-600"
                  >
                    Quay lại chọn phương thức khác
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 space-y-6"
              >
                <div className="w-24 h-24 bg-emerald-100 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-lg animate-bounce">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-serif font-black text-wood-900">Bái kiến Thành công!</h3>
                  <p className="text-sm text-wood-500 font-medium mt-2 px-4 leading-relaxed">
                    Đã tất toán giao kèo cho khách hữu <b>{quote.customerName}</b>. Sử lục tài chính địa phương đã được cập nhật.
                  </p>
                </div>
                <button 
                  onClick={() => {
                    onSuccess();
                    onClose();
                  }}
                  className="w-full py-4 bg-wood-900 text-white rounded-2xl font-black shadow-lg"
                >
                  Trở về Niên giám
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
