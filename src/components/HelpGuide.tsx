import { 
  BookOpen, 
  HelpCircle, 
  LayoutDashboard, 
  Calculator, 
  Package, 
  History, 
  Truck, 
  LineChart, 
  ShieldCheck,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertCircle,
  FileText,
  Users
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useState } from 'react';

type Section = 'overview' | 'roles' | 'calculator' | 'products' | 'inventory' | 'finance' | 'accountant_flow' | 'cskh_flow';

export default function HelpGuide() {
  const [activeTab, setActiveTab] = useState<Section>('overview');

  const sections = [
    { id: 'overview', label: 'Tổng quan', icon: HelpCircle },
    { id: 'roles', label: 'Phân quyền', icon: ShieldCheck },
    { id: 'calculator', label: 'Định giá', icon: Calculator },
    { id: 'products', label: 'Bảo vật', icon: Package },
    { id: 'inventory', label: 'Kho bãi', icon: Truck },
    { id: 'finance', label: 'Tài chính', icon: LineChart },
    { id: 'accountant_flow', label: 'Quy trình Kế toán', icon: FileText },
    { id: 'cskh_flow', label: 'Quy trình CSKH', icon: Users },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="bg-wood-50 p-8 rounded-[2rem] border border-wood-100">
              <h3 className="text-2xl font-serif font-black text-wood-900 mb-4">Chào mừng đến với LOLA POS</h3>
              <p className="text-wood-600 leading-relaxed mb-6">
                LOLA POS là hệ quản trị di sản và kinh doanh dành riêng cho các nghệ nhân, nhà sưu tầm đồ gỗ mỹ nghệ và cổ vật. 
                Hệ thống giúp bạn số hóa mọi quy trình từ định giá, quản lý kho đến tất toán giao kèo.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex gap-3 items-start bg-white p-4 rounded-2xl shadow-sm border border-wood-50">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-wood-800">Quản lý kho bãi chính xác theo từng lô hàng và hạn dùng.</p>
                </div>
                <div className="flex gap-3 items-start bg-white p-4 rounded-2xl shadow-sm border border-wood-50">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-wood-800">Định giá bảo vật thông minh dựa trên kích thước và đơn giá gỗ.</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-serif font-bold text-wood-900 border-l-4 border-wood-800 pl-3">Sơ đồ vận hành chính</h4>
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-8 px-4">
                <div className="flex flex-col items-center gap-3 w-32 text-center">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
                    <Package className="w-8 h-8" />
                  </div>
                  <span className="text-xs font-bold text-wood-900">1. Nhập kho</span>
                </div>
                <ChevronRight className="hidden md:block text-wood-200" />
                <div className="flex flex-col items-center gap-3 w-32 text-center">
                  <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-sm">
                    <Calculator className="w-8 h-8" />
                  </div>
                  <span className="text-xs font-bold text-wood-900">2. Định giá & Lập Giao kèo</span>
                </div>
                <ChevronRight className="hidden md:block text-wood-200" />
                <div className="flex flex-col items-center gap-3 w-32 text-center">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <span className="text-xs font-bold text-wood-900">3. Tất toán & Giao bảo vật</span>
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 'roles':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-100 flex flex-col gap-4">
                <div className="w-12 h-12 bg-amber-700 text-white rounded-2xl flex items-center justify-center shadow-lg">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="font-serif font-bold text-lg text-amber-900">Quản sự (Admin)</h4>
                <ul className="text-sm text-amber-800 space-y-2 list-disc pl-4 italic">
                  <li>Toàn quyền điều phối hệ thống.</li>
                  <li>Phê duyệt danh mục bảo vật.</li>
                  <li>Quản lý phân quyền thành viên.</li>
                  <li>Xem báo cáo tài chính tổng thể.</li>
                </ul>
              </div>

              <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100 flex flex-col gap-4">
                <div className="w-12 h-12 bg-blue-700 text-white rounded-2xl flex items-center justify-center shadow-lg">
                  <LineChart className="w-6 h-6" />
                </div>
                <h4 className="font-serif font-bold text-lg text-blue-900">Kế toán (Accountant)</h4>
                <ul className="text-sm text-blue-800 space-y-2 list-disc pl-4 italic">
                  <li>Theo dõi công nợ khách hữu.</li>
                  <li>Xuất báo cáo tài chính định kỳ.</li>
                  <li>Xác nhận các khoản tất toán.</li>
                </ul>
              </div>

              <div className="p-6 bg-wood-50 rounded-[2rem] border border-wood-100 flex flex-col gap-4">
                <div className="w-12 h-12 bg-wood-800 text-white rounded-2xl flex items-center justify-center shadow-lg">
                  <LayoutDashboard className="w-6 h-6" />
                </div>
                <h4 className="font-serif font-bold text-lg text-wood-900">Thợ việc (Employee)</h4>
                <ul className="text-sm text-wood-800 space-y-2 list-disc pl-4 italic">
                  <li>Định giá sơ bộ bảo vật.</li>
                  <li>Cập nhật tình hình kho bãi.</li>
                  <li>Lập phiếu giao kèo nháp cho khách.</li>
                </ul>
              </div>
            </div>
          </motion.div>
        );

      case 'calculator':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-white p-6 rounded-3xl border border-wood-100 shadow-sm">
              <h4 className="text-xl font-serif font-bold text-wood-900 mb-4">Cách định giá Giao kèo</h4>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-wood-100 text-wood-800 flex items-center justify-center font-black shrink-0">1</div>
                  <div>
                    <p className="font-bold text-wood-900">Chọn Bảo vật</p>
                    <p className="text-sm text-wood-500">Tìm kiếm bảo vật trong kho hoặc chọn từ danh sách có sẵn.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-wood-100 text-wood-800 flex items-center justify-center font-black shrink-0">2</div>
                  <div>
                    <p className="font-bold text-wood-900">Nhập thông số kỹ thuật</p>
                    <p className="text-sm text-wood-500">Nhập Chiều dài, Chiều rộng (nếu đo theo m2) và số lượng. Hệ thống sẽ tự tính diện tích/thể tích.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-wood-100 text-wood-800 flex items-center justify-center font-black shrink-0">3</div>
                  <div>
                    <p className="font-bold text-wood-900">Lưu Giao kèo</p>
                    <p className="text-sm text-wood-500">Giao kèo có thể lưu ở trạng thái "Lập nháp" (Draft) hoặc "Kết kèo" (Ordered) để chờ khách tất toán.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3">
              <Info className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800 font-medium italic">Mẹo: Bạn có thể tải hóa đơn PDF để gửi cho khách ngay sau khi Kết kèo.</p>
            </div>
          </motion.div>
        );

      case 'inventory':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
             <div className="p-6 bg-white rounded-3xl border border-wood-100 shadow-sm">
                <h4 className="text-xl font-serif font-bold text-wood-900 mb-4 uppercase tracking-tighter">Quy chuẩn Kho bãi (Lot Management)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <p className="font-black text-rose-800 flex items-center gap-2 underline underline-offset-4 decoration-rose-200">
                      <AlertCircle className="w-4 h-4" />
                      Lưu ý về Số Lô
                    </p>
                    <p className="text-sm text-wood-600 leading-relaxed">
                      Mỗi đợt bảo vật nhập về phải có <b>Số Lô</b> (Lot ID) riêng biệt. Điều này giúp truy xuất nguồn gốc gỗ và kiểm soát chất lượng chính xác nhất.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <p className="font-black text-emerald-800 flex items-center gap-2 underline underline-offset-4 decoration-emerald-200">
                      <CheckCircle2 className="w-4 h-4" />
                      Lập Phiếu Kho
                    </p>
                    <p className="text-sm text-wood-600 leading-relaxed">
                      Sử dụng nút "Lập Phiếu Kho" để ghi nhận mọi biến động (Nhập thêm/Xuất bán/Hư hỏng). Hãy ghi rõ <b>Lý do</b> để thuận tiện cho việc kế toán đối soát cuối tháng.
                    </p>
                  </div>
                </div>
             </div>
          </motion.div>
        );

      case 'accountant_flow':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="bg-blue-900 text-white p-8 rounded-[2rem] shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <FileText className="w-32 h-32" />
              </div>
              <h3 className="text-2xl font-serif font-black mb-4">Nhật ký Kế sự (Workflow Kế toán)</h3>
              <p className="text-blue-200 leading-relaxed">Đảm bảo dòng tiền thông suốt và minh bạch trong từng giao kèo.</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {[
                { 
                  step: '01', 
                  title: 'Kiểm soát Giao dịch', 
                  desc: 'Truy cập "Niên Giám Giao Dịch" mỗi buổi sáng để kiểm tra các giao kèo mới được "Kết kèo" (Ordered).' 
                },
                { 
                  step: '02', 
                  title: 'Quản lý Công nợ', 
                  desc: 'Tại "Sổ cái Công nợ", lọc theo trạng thái "Chờ thanh toán" để xác định danh sách khách hữu cần đốc thúc dòng tiền.' 
                },
                { 
                  step: '03', 
                  title: 'Xác nhận Tất toán', 
                  desc: 'Khi nhận được tiền (Tiền mặt/Chuyển khoản), tìm Giao kèo tương ứng và cập nhật "Số tiền đã trả". Chuyển trạng thái sang "Hoàn tất" (Completed).' 
                },
                { 
                  step: '04', 
                  title: 'Đối soát & Báo cáo', 
                  desc: 'Cuối tháng, xuất báo cáo tại "Ngân xuyến & Lợi nhuận" và tải CSV lịch sử kho để đối soát tài sản thực tế.' 
                }
              ].map((item) => (
                <div key={item.step} className="flex gap-6 p-6 bg-white rounded-3xl border border-wood-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-4xl font-serif font-black text-blue-100">{item.step}</div>
                  <div>
                    <h4 className="font-bold text-wood-900 mb-1">{item.title}</h4>
                    <p className="text-sm text-wood-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        );

      case 'cskh_flow':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="bg-emerald-900 text-white p-8 rounded-[2rem] shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Users className="w-32 h-32" />
              </div>
              <h3 className="text-2xl font-serif font-black mb-4">Tâm khảm Khách hữu (Workflow CSKH)</h3>
              <p className="text-emerald-200 leading-relaxed">Chăm sóc mối thâm tình và hỗ trợ khách hữu tìm được bảo vật ưng ý.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-white rounded-3xl border border-wood-100 shadow-sm space-y-4">
                <h4 className="font-black text-wood-900 flex items-center gap-2">
                  <LayoutDashboard className="w-5 h-5 text-emerald-600" />
                  Tiếp đón & Tư vấn
                </h4>
                <p className="text-sm text-wood-500 italic leading-relaxed">
                  Dùng "Lầu Ngắm Cảnh" (Dashboard) để xem nhanh các bảo vật đang có sẵn tại kho. Tư vấn khách dựa trên danh lục hình ảnh và thông số tại "Kho Cổ Vật".
                </p>
              </div>
              <div className="p-6 bg-white rounded-3xl border border-wood-100 shadow-sm space-y-4">
                <h4 className="font-black text-wood-900 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-emerald-600" />
                  Báo giá tức thời
                </h4>
                <p className="text-sm text-wood-500 italic leading-relaxed">
                  Khi khách ưng ý, dùng "Định Giá Đồ Cổ" để tính toán nhanh giá trị dựa trên kích thước. Lưu ở dạng "Lập nháp" (Draft) và gửi PDF cho khách duyệt qua Zalo.
                </p>
              </div>
              <div className="p-6 bg-white rounded-3xl border border-wood-100 shadow-sm space-y-4">
                <h4 className="font-black text-wood-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-emerald-600" />
                  Hậu mãi & Chăm sóc
                </h4>
                <p className="text-sm text-wood-500 italic leading-relaxed">
                  Tìm kiếm khách hữu tại "Niên Giám Giao Dịch" để xem lại các vật phẩm họ đã từng thỉnh. Đề xuất thêm các bảo vật cùng bộ hoặc cùng dòng gỗ.
                </p>
              </div>
              <div className="p-6 bg-white rounded-3xl border border-wood-100 shadow-sm space-y-4">
                <h4 className="font-black text-wood-900 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-emerald-600" />
                  Theo dõi Giao nhận
                </h4>
                <p className="text-sm text-wood-500 italic leading-relaxed">
                  Thông báo cho khách khi bảo vật hoàn tất quy trình kiểm định kho và sẵn sàng đóng gói giao đi.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
              <p className="text-xs font-black text-amber-800 uppercase tracking-widest mb-2">Quy chuẩn ứng xử</p>
              <p className="text-sm text-amber-900 leading-relaxed italic">
                "Lời chào cao hơn mâm cỗ. Với khách hữu của LOLA, mỗi giao kèo là một mối thâm tình. Hãy luôn kiểm tra kỹ lịch sử mua hàng trước khi gọi điện để cá nhân hóa cuộc hội thoại."
              </p>
            </div>
          </motion.div>
        );

      default:
        return <div className="p-12 text-center text-wood-400 italic">Tính năng đang cập nhật nội dung...</div>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="mb-4">
        <h1 className="text-3xl font-serif font-black text-wood-900 italic">Hướng dẫn Vận hành</h1>
        <p className="text-sm text-wood-500 font-medium tracking-tight">Kinh nang sử dụng hệ thống LOLA POS dành cho Quản sự và Nhân viên.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveTab(section.id as Section)}
              className={cn(
                "w-full flex items-center gap-3 p-4 rounded-2xl transition-all duration-200 font-bold text-sm",
                activeTab === section.id 
                  ? "bg-wood-800 text-white shadow-lg shadow-wood-100" 
                  : "text-wood-600 hover:bg-wood-50"
              )}
            >
              <section.icon className={cn("w-5 h-5", activeTab === section.id ? "text-amber-400" : "text-wood-400")} />
              {section.label}
            </button>
          ))}
        </div>

        <div className="lg:col-span-3 min-h-[500px]">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
