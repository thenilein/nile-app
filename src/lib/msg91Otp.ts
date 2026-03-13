import { supabase } from './supabase';

export type ToastFn = (type: 'error' | 'success', text: string) => void;

type SendOtpOptions = {
  phone: string;
  showToast?: ToastFn;
};

type ResendOtpOptions = {
  phone: string;
  showToast?: ToastFn;
};

type OtpFunctionResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  email?: string;
  password?: string;
  requiresProfileCompletion?: boolean;
};

let activePhone: string | null = null;

const isValidPhone = (phone: string) => /^[6-9]\d{9}$/.test(phone);
const isValidOtp = (otp: string) => /^\d{6}$/.test(otp);

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (!error) return fallback;

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const message =
      record.message ??
      record.error ??
      record.reason ??
      record.description ??
      (typeof record.context === 'object' && record.context
        ? (record.context as Record<string, unknown>).message
        : undefined);

    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return fallback;
};

const getFunctionErrorMessage = async (error: unknown, fallback: string): Promise<string> => {
  const directMessage = getErrorMessage(error, '');
  if (directMessage && directMessage !== 'Edge Function returned a non-2xx status code') {
    return directMessage;
  }

  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const response = (error as { context?: unknown }).context;
  if (!(response instanceof Response)) {
    return directMessage || fallback;
  }

  try {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = (await response.clone().json()) as Record<string, unknown>;
      const message = data.message ?? data.error ?? data.reason ?? data.description;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }

    const text = await response.clone().text();
    if (text.trim()) {
      return text;
    }
  } catch {
    // Fall back to the generic message below.
  }

  return directMessage || fallback;
};

const invokeOtpFunction = async (
  fnName: 'send-otp' | 'resend-otp' | 'verify-otp' | 'complete-profile',
  payload: Record<string, string>,
  fallbackMessage: string,
): Promise<OtpFunctionResponse> => {
  const { data, error } = await supabase.functions.invoke<OtpFunctionResponse>(fnName, {
    body: payload,
  });

  if (error) {
    throw new Error(await getFunctionErrorMessage(error, fallbackMessage));
  }

  const response = data ?? {};

  if (response.success === false) {
    throw new Error(response.message || response.error || fallbackMessage);
  }

  return response;
};

const signInVerifiedUser = async (phone: string, email?: string, password?: string) => {
  if (!email || !password) {
    throw new Error('Verification completed, but login credentials were not returned.');
  }

  const { data: sessionData } = await supabase.auth.getSession();

  if (sessionData.session) {
    await supabase.auth.signOut();
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('Could not create an authenticated session.');
  }

  await supabase.auth.updateUser({
    data: {
      phone,
      full_phone: `+91${phone}`,
      verified_via: 'msg91-edge-function',
    },
  });
};

export const completeProfile = async ({
  phone,
  fullName,
  showToast,
}: {
  phone: string;
  fullName: string;
  showToast?: ToastFn;
}): Promise<boolean> => {
  const trimmedName = fullName.trim();

  if (!trimmedName) {
    showToast?.('error', 'Please enter your name.');
    return false;
  }

  try {
    const response = await invokeOtpFunction(
      'complete-profile',
      { phone, fullName: trimmedName },
      'Failed to save your profile. Please try again.',
    );

    await signInVerifiedUser(phone, response.email, response.password);

    const { error: updateUserError } = await supabase.auth.updateUser({
      data: {
        phone,
        full_phone: `+91${phone}`,
        full_name: trimmedName,
        verified_via: 'msg91-edge-function',
      },
    });

    if (updateUserError) {
      throw updateUserError;
    }

    return true;
  } catch (error) {
    console.error('Profile completion failed', error);
    showToast?.('error', getErrorMessage(error, 'Failed to save your profile. Please try again.'));
    return false;
  }
};

export const sendOtp = async ({ phone, showToast }: SendOtpOptions): Promise<boolean> => {
  if (!isValidPhone(phone)) {
    showToast?.('error', 'Enter a valid 10-digit mobile number.');
    return false;
  }

  try {
    await invokeOtpFunction('send-otp', { phone }, 'Failed to send OTP. Please try again.');
    activePhone = phone;
    return true;
  } catch (error) {
    console.error('OTP send failed', error);
    showToast?.('error', getErrorMessage(error, 'Failed to send OTP. Please try again.'));
    return false;
  }
};

export const verifyOtp = async (
  phone: string,
  otp: string,
  showToast?: ToastFn,
  callbacks?: {
    onVerified?: () => void;
    onNeedsProfile?: () => void;
  },
): Promise<boolean> => {
  if (!isValidPhone(phone)) {
    showToast?.('error', 'Enter a valid 10-digit mobile number.');
    return false;
  }

  if (!isValidOtp(otp)) {
    showToast?.('error', 'Enter the 6-digit OTP.');
    return false;
  }

  try {
    const response = await invokeOtpFunction(
      'verify-otp',
      { phone, otp },
      'Incorrect or expired OTP. Please try again.',
    );

    activePhone = null;

    if (response.requiresProfileCompletion) {
      callbacks?.onNeedsProfile?.();
    } else {
      await signInVerifiedUser(phone, response.email, response.password);
      callbacks?.onVerified?.();
    }

    return true;
  } catch (error) {
    console.error('OTP verify failed', error);
    showToast?.('error', getErrorMessage(error, 'Incorrect or expired OTP. Please try again.'));
    return false;
  }
};

export const resendOtp = async ({ phone, showToast }: ResendOtpOptions): Promise<boolean> => {
  if (!isValidPhone(phone)) {
    showToast?.('error', 'Enter a valid 10-digit mobile number.');
    return false;
  }

  try {
    await invokeOtpFunction('resend-otp', { phone }, 'Failed to resend OTP. Please try again.');
    activePhone = phone;
    showToast?.('success', `OTP resent to +91 ${phone}`);
    return true;
  } catch (error) {
    console.error('OTP resend failed', error);
    showToast?.('error', getErrorMessage(error, 'Failed to resend OTP. Please try again.'));
    return false;
  }
};

