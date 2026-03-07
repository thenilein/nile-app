import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle } from 'lucide-react';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SEC = 60;

interface OtpVerificationProps {
    phone: string;
    maskedPhone: string;
    onVerified: () => void;
    onBack: () => void;
}

const OtpVerification: React.FC<OtpVerificationProps> = ({
    phone,
    maskedPhone,
    onVerified,
    onBack,
}) => {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SEC);
    const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const isOtpComplete = otp.every((d) => d !== '') && otp.join('').length === OTP_LENGTH;

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setInterval(() => setResendCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
        return () => clearInterval(t);
    }, [resendCooldown]);

    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);
        setError('');
        if (value && index < OTP_LENGTH - 1) {
            otpInputRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpInputRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
        const newOtp = [...otp];
        pasted.split('').forEach((char, i) => {
            newOtp[i] = char;
        });
        setOtp(newOtp);
        const nextIndex = Math.min(pasted.length, OTP_LENGTH - 1);
        otpInputRefs.current[nextIndex]?.focus();
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isOtpComplete) return;
        setError('');
        setLoading(true);
        try {
            const token = otp.join('');
            const { error: verifyError } = await supabase.auth.verifyOtp({
                phone,
                token,
                type: 'sms',
            });
            if (verifyError) throw verifyError;
            onVerified();
        } catch (err: any) {
            const msg = err?.message || 'Invalid OTP. Please try again.';
            if (msg.toLowerCase().includes('expired')) {
                setError('This code has expired. Please request a new one.');
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0) return;
        setError('');
        setLoading(true);
        setResendCooldown(RESEND_COOLDOWN_SEC);
        try {
            const { error: otpError } = await supabase.auth.signInWithOtp({ phone });
            if (otpError) throw otpError;
        } catch (err: any) {
            const msg = err?.message || 'Failed to send OTP';
            if (msg.includes('rate limit') || msg.includes('already')) {
                setError('Please wait a moment before requesting another code.');
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
                    Verify your number
                </h2>
                <p className="text-gray-500">We sent a 6-digit code to {maskedPhone}</p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            <form onSubmit={handleVerify} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                        Enter 6-digit code
                    </label>
                    <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                ref={(el) => {
                                    otpInputRefs.current[index] = el;
                                }}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleOtpChange(index, e.target.value)}
                                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                className="w-11 h-12 text-center text-lg font-semibold border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-green-800 outline-none transition-colors"
                                autoFocus={index === 0}
                            />
                        ))}
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={!isOtpComplete || loading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-800 hover:bg-green-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {loading ? 'Verifying...' : 'Verify & continue'}
                </button>

                <div className="flex flex-col items-center gap-2">
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={resendCooldown > 0 || loading}
                        className="text-sm font-medium text-green-800 hover:text-green-900 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {resendCooldown > 0
                            ? `Resend code in ${resendCooldown}s`
                            : 'Resend code'}
                    </button>
                    <button
                        type="button"
                        onClick={onBack}
                        className="text-sm font-medium text-gray-600 hover:text-green-800 transition-colors"
                    >
                        Change number
                    </button>
                </div>
            </form>
        </>
    );
};

export default OtpVerification;
