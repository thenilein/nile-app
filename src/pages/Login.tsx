import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Smartphone, AlertCircle } from 'lucide-react';
import OtpVerification from './OtpVerification';

const MOBILE_LENGTH = 10;

const Login = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
    const [mobile, setMobile] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const fullMobile = `+91${mobile}`;
    const isMobileValid = mobile.length === MOBILE_LENGTH;

    const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, MOBILE_LENGTH);
        setMobile(value);
        setError('');
    };

    const sendOtp = async () => {
        setError('');
        setLoading(true);
        setStep('otp');
        try {
            const { error: otpError } = await supabase.auth.signInWithOtp({
                phone: fullMobile,
            });
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

    const handleContinue = () => {
        if (!isMobileValid) return;
        sendOtp();
    };

    const handleContinueAsGuest = () => {
        navigate('/');
    };

    const handleBackToMobile = () => {
        setStep('mobile');
        setError('');
    };

    return (
        <div className="flex-1 flex items-center justify-center bg-gray-50 px-4 py-12">
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
                                onClick={handleContinue}
                                disabled={!isMobileValid || loading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-800 hover:bg-green-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? 'Sending OTP...' : 'Continue'}
                            </button>

                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-gray-500">or</span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleContinueAsGuest}
                                className="w-full flex justify-center py-3 px-4 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-800 transition-colors"
                            >
                                Continue as guest
                            </button>
                        </div>
                    </>
                ) : (
                    <OtpVerification
                        phone={fullMobile}
                        maskedPhone={`+91 ${mobile}`}
                        onVerified={() => navigate('/')}
                        onBack={handleBackToMobile}
                    />
                )}
            </div>
        </div>
    );
};

export default Login;
