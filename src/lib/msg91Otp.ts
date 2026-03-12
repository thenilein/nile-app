import { supabase } from './supabase';

const MSG91_WIDGET_ID = import.meta.env.VITE_MSG91_WIDGET_ID || '';
const MSG91_TOKEN_AUTH =
  import.meta.env.VITE_MSG91_TOKEN_AUTH || import.meta.env.VITE_MSG91_AUTH_KEY || '';
const USING_AUTH_KEY_FALLBACK =
  !import.meta.env.VITE_MSG91_TOKEN_AUTH && !!import.meta.env.VITE_MSG91_AUTH_KEY;

export const isMsg91Configured = !!MSG91_WIDGET_ID && !!MSG91_TOKEN_AUTH;
export const MSG91_CAPTCHA_CONTAINER_ID = 'msg91-captcha-container';

export type ToastFn = (type: 'error' | 'success', text: string) => void;

type SendOtpOptions = {
  phone: string;
  showToast?: ToastFn;
};

type ResendOtpOptions = {
  phone: string;
  showToast?: ToastFn;
};

const SDK_WAIT_MS = 5000;
const SDK_CALLBACK_TIMEOUT_MS = 12000;

type OtpSession = {
  phone: string;
  identifier: string;
  reqId?: string;
};

let activeSession: OtpSession | null = null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (typeof error === 'object') {
    const rec = error as Record<string, unknown>;
    const msg = rec.message ?? rec.error ?? rec.reason ?? rec.description;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  return fallback;
};

const getReqId = (data: unknown): string | undefined => {
  if (!data || typeof data !== 'object') return undefined;
  const record = data as Record<string, unknown>;
  const value =
    record.reqId ??
    record.requestId ??
    record.request_id ??
    (typeof record.data === 'object' && record.data
      ? (record.data as Record<string, unknown>).reqId ??
        (record.data as Record<string, unknown>).requestId ??
        (record.data as Record<string, unknown>).request_id
      : undefined);

  return typeof value === 'string' ? value : undefined;
};

const ensureScriptLoaded = (showToast?: ToastFn): boolean => {
  if (!isMsg91Configured) {
    showToast?.('error', 'OTP is not configured. Add MSG91 credentials in .env and restart.');
    return false;
  }

  if (USING_AUTH_KEY_FALLBACK) {
    console.warn(
      'MSG91 tokenAuth is using VITE_MSG91_AUTH_KEY fallback. Prefer VITE_MSG91_TOKEN_AUTH from OTP widget integration.',
    );
  }

  if (!window.initSendOTP) {
    showToast?.('error', 'OTP service script is still loading. Please try again.');
    return false;
  }

  return true;
};

const hasCaptchaContainer = () =>
  typeof document !== 'undefined' && !!document.getElementById(MSG91_CAPTCHA_CONTAINER_ID);

const waitForSdkMethods = async (
  methods: Array<'sendOtp' | 'verifyOtp'>,
  waitMs = SDK_WAIT_MS,
): Promise<boolean> => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < waitMs) {
    if (methods.every((method) => typeof window[method] === 'function')) {
      return true;
    }
    await sleep(100);
  }
  return false;
};

const initSessionForPhone = async (phone: string, showToast?: ToastFn): Promise<boolean> => {
  if (!ensureScriptLoaded(showToast) || !window.initSendOTP) {
    return false;
  }

  window.initSendOTP({
    widgetId: MSG91_WIDGET_ID,
    tokenAuth: MSG91_TOKEN_AUTH,
    identifier: `91${phone}`,
    exposeMethods: true,
    captchaRenderId: MSG91_CAPTCHA_CONTAINER_ID,
    numeric: '1',
    success: () => {
      // Intentionally no-op; verifyOtp callback handles success to avoid duplicate UI events.
    },
    failure: () => {
      // Intentionally no-op; verifyOtp callback handles failures to avoid duplicate UI events.
    },
  });

  const sdkReady = await waitForSdkMethods(['sendOtp']);
  if (!sdkReady) {
    showToast?.('error', 'OTP service is unavailable. Check MSG91 widget token and widget id.');
    return false;
  }

  activeSession = {
    phone,
    identifier: `91${phone}`,
  };
  return true;
};

const runWithTimeout = async (
  executor: (resolve: (value: boolean) => void) => void,
  onTimeout: () => void,
): Promise<boolean> =>
  await new Promise<boolean>((resolve) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      onTimeout();
      resolve(false);
    }, SDK_CALLBACK_TIMEOUT_MS);

    executor((value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(value);
    });
  });

const saveVerifiedUser = async (phone: string) => {
  const { data: sessionData } = await supabase.auth.getSession();

  let userId = sessionData.session?.user?.id;

  if (!userId) {
    const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously({
      options: {
        data: {
          phone,
          full_phone: `+91${phone}`,
          verified_via: 'msg91',
        },
      },
    });
    if (anonError) throw anonError;
    userId = anonData?.user?.id;
  }

  if (!userId) return;

  await supabase.from('profiles').upsert(
    {
      id: userId,
      phone,
      role: 'customer',
      created_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );
};

export const sendOtp = async ({ phone, showToast }: SendOtpOptions): Promise<boolean> => {
  if (!hasCaptchaContainer()) {
    showToast?.('error', 'Captcha container is missing. Please reload the page and try again.');
    return false;
  }

  const sessionReady = await initSessionForPhone(phone, showToast);
  if (!sessionReady || !window.sendOtp) {
    return false;
  }

  return await runWithTimeout(
    (resolve) => {
      window.sendOtp?.(
        `91${phone}`,
        (data) => {
          activeSession = {
            phone,
            identifier: `91${phone}`,
            reqId: getReqId(data),
          };
          resolve(true);
        },
        (error) => {
          console.error('MSG91 send OTP failed', error);
          showToast?.('error', getErrorMessage(error, 'Failed to send OTP. Please try again.'));
          resolve(false);
        },
      );
    },
    () => {
      showToast?.('error', 'No response from OTP provider. Please try again.');
    },
  );
};

export const verifyOtp = async (
  phone: string,
  otp: string,
  showToast?: ToastFn,
  onVerified?: () => void,
): Promise<boolean> => {
  if (activeSession?.phone !== phone) {
    showToast?.('error', 'OTP session not found. Please resend OTP and try again.');
    return false;
  }

  const sessionReady = await waitForSdkMethods(['verifyOtp']);
  if (!sessionReady || !window.verifyOtp) {
    showToast?.('error', 'OTP verify service unavailable. Please resend OTP.');
    return false;
  }

  return await runWithTimeout(
    (resolve) => {
      window.verifyOtp?.(
        otp,
        async () => {
          try {
            await saveVerifiedUser(phone);
            activeSession = null;
            onVerified?.();
            resolve(true);
          } catch (error) {
            console.error('MSG91 login completion failed', error);
            showToast?.('error', 'Login failed. Please try again.');
            resolve(false);
          }
        },
        (error) => {
          console.error('MSG91 verify OTP failed', error);
          showToast?.('error', getErrorMessage(error, 'Incorrect or expired OTP. Please try again.'));
          resolve(false);
        },
        activeSession?.phone === phone ? activeSession.reqId : undefined,
      );
    },
    () => {
      showToast?.('error', 'OTP verification timed out. Please try again.');
    },
  );
};

export const resendOtp = async ({ phone, showToast }: ResendOtpOptions): Promise<boolean> => {
  const sessionReady =
    activeSession?.phone === phone ? await waitForSdkMethods(['sendOtp']) : await initSessionForPhone(phone, showToast);

  if (!sessionReady) {
    return false;
  }

  const retryReady = await waitForSdkMethods(['sendOtp', 'verifyOtp']);

  if (!retryReady || !window.retryOtp) {
    const ok = await sendOtp({ phone, showToast });
    if (ok) {
      showToast?.('success', `OTP resent to +91 ${phone}`);
    }
    return ok;
  }

  return await runWithTimeout(
    (resolve) => {
      window.retryOtp?.(
        null,
        (data) => {
          activeSession = {
            phone,
            identifier: `91${phone}`,
            reqId: getReqId(data) || activeSession?.reqId,
          };
          showToast?.('success', `OTP resent to +91 ${phone}`);
          resolve(true);
        },
        (error) => {
          console.error('MSG91 retry OTP failed', error);
          showToast?.('error', getErrorMessage(error, 'Failed to resend OTP. Please try again.'));
          resolve(false);
        },
        activeSession?.phone === phone ? activeSession.reqId : undefined,
      );
    },
    () => {
      showToast?.('error', 'OTP resend timed out. Please try again.');
    },
  );
};

