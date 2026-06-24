import { ref } from 'vue';
import { apiFetch } from '@/utils/api.js';

/**
 * useSignature — composable điều phối nghi thức ký số (PIN).
 *
 * Cách dùng:
 *   const { open, pending, requestSignature } = useSignature();
 *   // mở modal SignatureCeremony, resolve khi người dùng nhập PIN hợp lệ
 *   const pin = await requestSignature();
 *   // gửi pin kèm request ký/phê duyệt tới backend
 */
export function useSignature() {
  const open = ref(false);
  const pending = ref(false);
  const hasPin = ref(null); // null = chưa biết, true/false = đã kiểm tra

  let resolver = null;
  let rejecter = null;

  /** Kiểm tra người dùng đã thiết lập PIN ký số chưa. */
  async function checkPinStatus() {
    try {
      const res = await apiFetch('/api/system/signature/status');
      if (res.ok) {
        hasPin.value = (await res.json()).hasPin;
      }
    } catch {
      hasPin.value = null;
    }
    return hasPin.value;
  }

  /** Đặt/đổi PIN ký số. */
  async function setPin(pin) {
    const res = await apiFetch('/api/system/signature/set-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Không thể thiết lập PIN');
    }
    hasPin.value = true;
    return true;
  }

  /**
   * Mở nghi thức ký và trả về Promise<string> (PIN người dùng nhập).
   * Promise bị reject nếu người dùng huỷ.
   */
  function requestSignature() {
    open.value = true;
    return new Promise((resolve, reject) => {
      resolver = resolve;
      rejecter = reject;
    });
  }

  /** Component modal gọi khi người dùng xác nhận PIN. */
  function confirm(pin) {
    open.value = false;
    if (resolver) resolver(pin);
    resolver = rejecter = null;
  }

  /** Component modal gọi khi người dùng huỷ. */
  function cancel() {
    open.value = false;
    if (rejecter) rejecter(new Error('cancelled'));
    resolver = rejecter = null;
  }

  return {
    open,
    pending,
    hasPin,
    checkPinStatus,
    setPin,
    requestSignature,
    confirm,
    cancel,
  };
}
