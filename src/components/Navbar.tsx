import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogOut, User as UserIcon } from "lucide-react";
import AuthModal from "./AuthModal";

const Navbar = () => {
    const { user, signOut } = useAuth();

    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

    const openAuthModal = (mode: 'login' | 'signup') => {
        setAuthModalMode(mode);
        setIsAuthModalOpen(true);
    };

    return (
        <>
            <nav className="flex items-center justify-between px-10 py-5 border-b border-gray-100 bg-white">
                <Link to="/" className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-800 rounded-full flex items-center justify-center text-white font-bold text-xl">
                        N
                    </div>
                    <div className="text-xl font-bold text-gray-900 tracking-tight">
                        nile ice creams
                    </div>
                </Link>

                <div className="flex items-center gap-4">
                    {user ? (
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                <UserIcon className="w-4 h-4" />
                                <span className="hidden sm:inline-block truncate max-w-[150px]">{user.email}</span>
                            </div>
                            <button
                                onClick={signOut}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Logout
                            </button>
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={() => openAuthModal('login')}
                                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                Log in
                            </button>
                            <button
                                onClick={() => openAuthModal('signup')}
                                className="px-4 py-2 text-sm font-medium text-white bg-green-800 hover:bg-green-900 rounded-md transition-colors cursor-pointer"
                            >
                                Sign up
                            </button>
                        </>
                    )}
                </div>
            </nav>

            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                initialMode={authModalMode}
            />
        </>
    );
};

export default Navbar;
