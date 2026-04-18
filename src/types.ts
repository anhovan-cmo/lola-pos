export type UnitType = string;

export interface Product {
  id: string;
  name: string;
  category: string;
  unitPrice: number;
  costPrice: number; // Giá vốn
  unit: UnitType;
  stock: number; // Tồn kho hiện tại
  description?: string;
  image?: string;
  ownerId?: string;
}

export interface Calculation {
  productId: string;
  productName: string;
  length: number; // in meters
  width?: number | null; // in meters, optional if unit is 'm' or 'each'
  quantity: number;
  unitPrice: number;
  unit: UnitType;
  totalArea: number; // length * width if m2, length if m, 1 if each
  totalPrice: number;
}

export interface Quote {
  id: string;
  customerName: string;
  customerPhone?: string | null;
  items: Calculation[];
  totalAmount: number;
  paidAmount: number; // Số tiền đã thanh toán
  createdAt: string;
  status: 'draft' | 'ordered' | 'completed' | 'cancelled' | 'partially_paid' | 'paid';
  ownerId?: string;
}

export interface InventoryTransaction {
  id: string;
  productId: string;
  productName: string;
  type: 'in' | 'out' | 'adjust'; // Nhập, Xuất, Điều chỉnh
  quantity: number;
  lotNumber?: string; // Số lô
  expiryDate?: string; // Ngày hết hạn
  reason: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface Debt {
  id: string;
  type: 'receivable' | 'payable'; // Phải thu (khách hàng), Phải trả (nhà cung cấp)
  personName: string; // Tên khách hoặc nhà cung cấp
  amount: number;
  remainingAmount: number;
  dueDate?: string;
  status: 'pending' | 'partially_paid' | 'paid';
  relatedOrderId?: string; // Link tới Quote hoặc phiếu nhập
  createdAt: string;
  ownerId: string;
}
