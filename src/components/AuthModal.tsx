import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, User, AlertCircle, X } from 'lucide-react';

type AuthModalProps = {
    isOpen: boolean;
    onClose: () => void;
    initialMode?: 'login' | 'signup';
};

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
    const [mode, setMode] = useState<'login' | 'signup'>(initialMode);

    // Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Status State
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    if (!isOpen) return null;

    const resetForm = () => {
        setError('');
        setSuccessMessage('');
        setName('');
        setEmail('');
        setPassword('');
    };

    const toggleMode = () => {
        setMode(prev => prev === 'login' ? 'signup' : 'login');
        resetForm();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setLoading(true);

        try {
            if (mode === 'signup') {
                const { error: signUpError, data } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: name,
                        }
                    }
                });

                if (signUpError) throw signUpError;

                if (data?.session) {
                    onClose();
                } else {
                    setSuccessMessage('Registration successful! Please check your email to confirm your account.');
                    setName('');
                    setEmail('');
                    setPassword('');
                }
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (signInError) throw signInError;
                onClose();
            }
        } catch (err: any) {
            setError(err.message || `Failed to ${mode}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-8">
                    <div className="text-center mb-8">
                        <div className="w-12 h-12 bg-green-800 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
                            N
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">
                            {mode === 'login' ? 'Welcome back' : 'Create an account'}
                        </h2>
                        <p className="text-gray-500 text-sm">
                            {mode === 'login' ? 'Enter your details to access your account' : 'Join Nile Ice Creams today'}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    {successMessage && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-lg flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-green-800 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-green-800">{successMessage}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'signup' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-green-800 focus:border-green-800 outline-none transition-colors"
                                        placeholder="John Doe"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-green-800 focus:border-green-800 outline-none transition-colors"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-sm font-medium text-gray-700">Password</label>
                                {mode === 'login' && (
                                    <button type="button" className="text-sm font-medium text-green-800 hover:text-green-900">
                                        Forgot password?
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-green-800 focus:border-green-800 outline-none transition-colors"
                                    placeholder="••••••••"
                                    minLength={mode === 'signup' ? 6 : undefined}
                                />
                            </div>
                            {mode === 'signup' && (
                                <p className="mt-1.5 text-xs text-gray-500">Must be at least 6 characters long</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-800 hover:bg-green-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-6"
                        >
                            {loading ? (mode === 'login' ? 'Signing in...' : 'Creating account...') : (mode === 'login' ? 'Sign in' : 'Create account')}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <p className="text-center text-sm text-gray-600">
                            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                            <button
                                onClick={toggleMode}
                                className="font-medium text-green-800 hover:text-green-900"
                            >
                                {mode === 'login' ? 'Sign up for free' : 'Log in instead'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
