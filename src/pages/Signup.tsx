import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Lock, User, AlertCircle } from 'lucide-react';

const Signup = () => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setLoading(true);

        try {
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
                // User is automatically signed in (email confirmation is off in Supabase)
                navigate('/');
            } else {
                // Email confirmation is required
                setSuccessMessage('Registration successful! Please check your email to confirm your account.');
                setName('');
                setEmail('');
                setPassword('');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to sign up');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 flex items-center justify-center bg-gray-50 px-4 py-12">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Create an account</h2>
                    <p className="text-gray-500">Join Nile Ice Creams today</p>
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

                <form onSubmit={handleSignup} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Full name</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-green-800 focus:border-green-800 outline-none transition-colors"
                                placeholder="John Doe"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-green-800 focus:border-green-800 outline-none transition-colors"
                                placeholder="you@example.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-green-800 focus:border-green-800 outline-none transition-colors"
                                placeholder="••••••••"
                                minLength={6}
                            />
                        </div>
                        <p className="mt-2 text-xs text-gray-500">Must be at least 6 characters long</p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-800 hover:bg-green-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-4"
                    >
                        {loading ? 'Creating account...' : 'Create account'}
                    </button>
                </form>

                <p className="mt-8 text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium text-green-800 hover:text-green-900">
                        Log in instead
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Signup;
