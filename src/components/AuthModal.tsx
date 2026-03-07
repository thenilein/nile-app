import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Phone, AlertCircle, X } from 'lucide-react';
import OtpVerification from '../pages/OtpVerification';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type AuthModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    // Form State
    const [phone, setPhone] = useState('');
    const [step, setStep] = useState<'phone' | 'otp'>('phone');

    // Status State
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const { continueAsGuest } = useAuth();

    if (!isOpen) return null;

    const resetForm = () => {
        setError('');
        setPhone('');
        setStep('phone');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Basic phone number validation (adjust regex based on requirements)
        // Here we ensure it starts with a plus and has digits, or just digits and add a country code
        let formattedPhone = phone.trim();
        if (!formattedPhone.startsWith('+')) {
            // Default to India country code if none provided (adjust as needed)
            formattedPhone = '+91' + formattedPhone;
        }

        setLoading(true);

        try {
            const { error: otpError } = await supabase.auth.signInWithOtp({
                phone: formattedPhone,
            });

            if (otpError) throw otpError;

            // Proceed to OTP step
            setPhone(formattedPhone);
            setStep('otp');
        } catch (err: any) {
            setError(err.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerified = () => {
        handleClose();
        navigate('/menu');
    };

    const handleGuest = () => {
        continueAsGuest();
        handleClose();
        navigate('/menu');
    };

    const maskPhoneNumber = (num: string) => {
        if (num.length > 4) {
            return num.substring(0, num.length - 4).replace(/[0-9]/g, 'X') + num.substring(num.length - 4);
        }
        return num;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Close button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-8">
                    {step === 'phone' ? (
                        <>
                            <div className="text-center mb-8">
                                <div className="w-12 h-12 bg-green-800 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
                                    N
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">
                                    Welcome
                                </h2>
                                <p className="text-gray-500 text-sm">
                                    Enter your phone number to login or sign up
                                </p>
                            </div>

                            {error && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-600">{error}</p>
                                </div>
                            )}

                            <form onSubmit={handleSendOtp} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Phone className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="tel"
                                            required
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-green-800 focus:border-green-800 outline-none transition-colors"
                                            placeholder="+91 98765 43210"
                                        />
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500">
                                        We'll send you a One Time Password (OTP)
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !phone}
                                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-800 hover:bg-green-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-6"
                                >
                                    {loading ? 'Sending OTP...' : 'Send OTP'}
                                </button>
                            </form>

                            <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col items-center">
                                <button
                                    onClick={handleGuest}
                                    type="button"
                                    className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-800 transition-colors"
                                >
                                    Continue as guest
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="mt-4">
                            <OtpVerification
                                phone={phone}
                                maskedPhone={maskPhoneNumber(phone)}
                                onVerified={handleVerified}
                                onBack={() => setStep('phone')}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
