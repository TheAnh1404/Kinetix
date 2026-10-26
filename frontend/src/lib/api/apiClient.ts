/**
 * Backend REST API Client for Kinetix
 * Kết nối với Express Server + Neon PostgreSQL
 */

import { BACKEND_API_BASE_URL } from '@/contracts/config';

export interface SyncWalletPayload {
  walletAddress: string;
  fullName: string;
}

export interface CreateWithdrawalPayload {
  familyId: string;
  requesterId: string;
  amount: number;
  vault: 'Retirement Shield' | 'Kids Savings' | 'Family ROSCA';
  reason: string;
  onchainRequestId?: number;
}

export interface ApproveWithdrawalPayload {
  requestId: string;
  guardianWallet: string;
}

export interface SubmitChorePayload {
  choreId: string;
  proofImageUrl: string;
}

export interface VerifyChorePayload {
  choreId: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = BACKEND_API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
    const url = `${this.baseUrl}${endpoint}`;
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP Error ${response.status}`);
      }

      const json = await response.json();
      return json.data ?? json;
    } catch (error) {
      console.warn(`[Kinetix API] Endpoint ${endpoint} offline hoặc lỗi kết nối:`, error);
      return null;
    }
  }

  /**
   * Đồng bộ ví người dùng vào Neon Database
   */
  async syncWallet(payload: SyncWalletPayload) {
    return this.request('/auth/sync-wallet', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Lấy thông tin gia đình & thành viên
   */
  async getFamily(familyId: string) {
    return this.request(`/families/${familyId}`);
  }

  /**
   * Lấy danh sách yêu cầu rút tiền
   */
  async getWithdrawals(familyId: string) {
    return this.request(`/withdrawals/${familyId}`);
  }

  /**
   * Tạo yêu cầu rút tiền lớn
   */
  async createWithdrawal(payload: CreateWithdrawalPayload) {
    return this.request('/withdrawals/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Guardian phê duyệt yêu cầu rút tiền
   */
  async approveWithdrawal(payload: ApproveWithdrawalPayload) {
    return this.request('/withdrawals/approve', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Lấy danh sách nhiệm vụ Chore-to-Earn
   */
  async getChores(familyId: string) {
    return this.request(`/chores/${familyId}`);
  }

  /**
   * Con nhỏ nộp bằng chứng làm việc nhà
   */
  async submitChore(payload: SubmitChorePayload) {
    return this.request('/chores/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Bố mẹ duyệt và thưởng việc nhà
   */
  async verifyChore(payload: VerifyChorePayload) {
    return this.request('/chores/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Lấy thông báo theo userId
   */
  async getNotifications(userId: string) {
    return this.request(`/notifications/${userId}`);
  }

  /**
   * Đánh dấu thông báo đã đọc
   */
  async markNotificationRead(notificationId: string) {
    return this.request(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  }
}

export const apiClient = new ApiClient();
