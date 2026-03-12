import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import OtpVerification from './OtpVerification';

const MOBILE_LENGTH = 10;
const MSG91_WIDGET_ID = import.meta.env.VITE_MSG91_TEMPLATE_ID;
const MSG91_TOKEN_AUTH = import.meta.env.VITE_MSG91_AUTH_KEY;

const Login = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
    const [mobile, setMobile] = useState('');
    const [error, setError] = useState('');
    const [toastMsg, setToastMsg] = useState<{ type: 'error' | 'success', text: string } | null>(null);
    const [loading, setLoading] = useState(false);

    const isMobileValid = mobile.length === MOBILE_LENGTH;

    const showToast = (type: 'error' | 'success', text: string) => {
        setToastMsg({ type, text });
        setTimeout(() => setToastMsg(null), 3500);
    };

    const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, MOBILE_LENGTH);
        setMobile(value);
        setError('');
    };

    // ── Debug Check ─────────────────────────────────────────────────────────
    React.useEffect(() => {
        const checkWidget = setInterval(() => {
            if (window.sendOtp) {
                console.log('sendOtp methods:', Object.keys(window.sendOtp));
                clearInterval(checkWidget);
            }
        }, 500);
        return () => clearInterval(checkWidget);
    }, []);

    // ── Send OTP (step 1 → step 2) ──────────────────────────────────────────
    const sendOtp = async () => {
        if (!isMobileValid) return;
        setLoading(true);
        setError('');
        try {
            const waitForWidget = () => new Promise<void>((resolve, reject) => {
                let attempts = 0;
                const check = setInterval(() => {
                    attempts++;
                    if (window.sendOtp) {
                        clearInterval(check);
                        resolve();
                    }
                    if (attempts > 20) {
                        clearInterval(check);
                        reject(new Error('Widget not loaded'));
                    }
                }, 200);
            });
            await waitForWidget();

            window.sendOtp?.send(
                '91' + mobile,
                (data: any) => {
                    console.log('OTP sent', data);
                    setStep('otp');
                    showToast('success', `OTP sent to +91 ${mobile}`);
                    setLoading(false);
                },
                (error: any) => {
                    console.log('Send failed', error);
                    showToast('error', 'Failed to send OTP. Please try again.');
                    setLoading(false);
                }
            );
        } catch (err) {
            showToast('error', 'OTP service not ready. Please refresh.');
            setLoading(false);
        }
    };

    // ── Verify OTP (called from OtpVerification) ────────────────────────────
    const verifyOtp = (otp: string) => {
        if (!window.sendOtp) {
            showToast('error', 'OTP session expired. Please request a new OTP.');
            return;
        }
        
        window.sendOtp?.verify(
            otp,
            async (data: any) => {
                console.log('OTP verified', data);
                showToast('success', 'Welcome to Nile Ice Creams! 🎉');
                navigate('/');
            },
            (error: any) => {
                console.error('OTP failed', error);
                showToast('error', 'OTP verification failed. Please try again.');
            }
        );
    };

    // ── Resend OTP (called from OtpVerification) ────────────────────────────
    const resendOtp = () => {
        window.sendOtp?.retry(
            (data: any) => {
                showToast('success', `OTP resent to +91 ${mobile}`);
            },
            (error: any) => {
                showToast('error', 'Resend failed. Try again.');
            }
        );
    };

    const handleBackToMobile = () => {
        setStep('mobile');
        setError('');
    };

    return (
        <div className="flex-1 flex items-center justify-center bg-gray-50 px-4 py-12 relative">
            <AnimatePresence>
                {toastMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 max-w-[90vw] ${
                            toastMsg.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-600 text-white'
                        }`}
                    >
                        {toastMsg.type === 'error' ? (
                            <AlertCircle className="w-4 h-4" />
                        ) : (
                            <CheckCircle2 className="w-4 h-4" />
                        )}
                        <span className="text-sm font-semibold">{toastMsg.text}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                {step === 'mobile' ? (
                    <>
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
                                Create an account
                            </h2>
                            <p className="text-gray-500">
                                Enter your mobile number to continue
                            </p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Mobile number
                                </label>
                                <div className="flex rounded-lg border border-gray-200 overflow-hidden focus-within:ring-1 focus-within:ring-green-800 focus-within:border-green-800">
                                    <div className="flex items-center justify-center px-3 bg-gray-50 border-r border-gray-200 text-gray-600 font-medium">
                                        +91
                                    </div>
                                    <div className="relative flex-1 flex items-center">
                                        <div className="absolute left-3 flex items-center pointer-events-none text-gray-400">
                                            <Smartphone className="h-5 w-5" />
                                        </div>
                                        <input
                                            type="tel"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            maxLength={MOBILE_LENGTH}
                                            value={mobile}
                                            onChange={handleMobileChange}
                                            onKeyDown={(e) => e.key === 'Enter' && sendOtp()}
                                            className="block w-full pl-10 pr-3 py-3 border-0 focus:ring-0 outline-none"
                                            placeholder="10-digit mobile number"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                {mobile.length > 0 && mobile.length < MOBILE_LENGTH && (
                                    <p className="mt-1 text-xs text-gray-500">
                                        {MOBILE_LENGTH - mobile.length} digits remaining
                                    </p>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={sendOtp}
                                disabled={!isMobileValid || loading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-800 hover:bg-green-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? 'Sending OTP...' : 'Continue'}
                            </button>


                        </div>
                    </>
                ) : (
                    <OtpVerification
                        maskedPhone={`+91 ${mobile}`}
                        onVerifyOtp={verifyOtp}
                        onResendOtp={resendOtp}
                        onBack={handleBackToMobile}
                        showToast={showToast}
                    />
                )}
            </div>
        </div>
    );
};

export default Login;
