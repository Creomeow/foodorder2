// API response DTOs consumed by the frontends.
import type {
  Role,
  OrderType,
  OrderStatus,
  TableStatus,
  PaymentMethod,
  PaymentStatus,
  PaymentProvider,
  CouponType,
} from './enums.js';

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  brandId: string | null;
  restaurantId: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface Brand {
  id: string;
  name: string;
  logo: string | null;
  createdAt: string;
}

export interface Restaurant {
  id: string;
  brandId: string;
  name: string;
  logo: string | null;
  address: string | null;
  phone: string | null;
  taxRate: number;
  serviceCharge: number;
  currency: string;
  operatingHours: unknown;
  paymentMethods: PaymentMethod[];
}

export interface Category {
  id: string;
  restaurantId: string;
  name: string;
  sortOrder: number;
  visible: boolean;
}

export interface ModifierOption {
  id: string;
  modifierGroupId: string;
  name: string;
  price: number;
  isDefault: boolean;
  sortOrder: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  required: boolean;
  multiple: boolean;
  minSelect: number;
  maxSelect: number;
  options: ModifierOption[];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  restaurantId: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  available: boolean;
  sortOrder: number;
  popular: boolean;
  recommended: boolean;
  modifierGroups?: ModifierGroup[];
}

export interface MenuResponse {
  restaurant: Restaurant;
  categories: Category[];
  items: MenuItem[];
}

export interface Table {
  id: string;
  restaurantId: string;
  tableNumber: string;
  capacity: number;
  status: TableStatus;
  qrToken: string;
  qrUrl?: string;
}

export interface TableSession {
  id: string;
  tableId: string;
  customerId: string | null;
  openedAt: string;
  closedAt: string | null;
}

export interface OrderItemModifier {
  id: string;
  name: string;
  price: number;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  notes: string | null;
  modifiers: OrderItemModifier[];
}

export interface Payment {
  id: string;
  provider: PaymentProvider;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  amount: number;
  transactionReference: string | null;
}

export interface Order {
  id: string;
  restaurantId: string;
  orderNumber: string;
  orderType: OrderType;
  status: OrderStatus;
  tableId: string | null;
  tableNumber?: string | null;
  sessionId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  subtotal: number;
  tax: number;
  serviceCharge: number;
  discount: number;
  total: number;
  items: OrderItem[];
  payment?: Payment | null;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  minSpend: number;
  active: boolean;
}

export interface CouponValidation {
  valid: boolean;
  discount: number;
  message?: string;
  coupon?: Coupon;
}

export interface DashboardStats {
  todayRevenue: number;
  todayOrders: number;
  averageOrderValue: number;
  activeOrders: number;
  completedOrders: number;
}

export interface SalesReportRow {
  label: string;
  orders: number;
  revenue: number;
}

export interface ProductReportRow {
  menuItemId: string;
  name: string;
  category: string;
  quantitySold: number;
  revenue: number;
}
