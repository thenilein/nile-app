import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { LogOut, User as UserIcon, ShoppingBag } from "lucide-react";
import AuthModal from "./AuthModal";

const Navbar = () => {
    const { user, isGuest, signOut } = useAuth();
    const { totalItems } = useCart();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

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

                <div className="flex items-center gap-6">
                    <Link to="/cart" className="relative text-gray-600 hover:text-green-800 transition-colors">
                        <ShoppingBag className="w-6 h-6" />
                        {totalItems > 0 && (
                            <span className="absolute -top-2 -right-2 bg-green-800 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                                {totalItems}
                            </span>
                        )}
                    </Link>

                    {user ? (
                        <div className="flex items-center gap-4 border-l pl-6 border-gray-200">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                <UserIcon className="w-4 h-4" />
                                <span className="hidden sm:inline-block truncate max-w-[150px]">{user.phone || user.email || 'User'}</span>
                            </div>
                            <button
                                onClick={signOut}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="hidden sm:inline-block">Logout</span>
                            </button>
                        </div>
                    ) : isGuest ? (
                        <div className="flex items-center gap-4 border-l pl-6 border-gray-200">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                <UserIcon className="w-4 h-4" />
                                <span className="hidden sm:inline-block truncate max-w-[150px]">Guest User</span>
                            </div>
                            <button
                                onClick={signOut}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="hidden sm:inline-block">Leave</span>
                            </button>
                        </div>
                    ) : (
                        <div className="border-l pl-6 border-gray-200">
                            <button
                                onClick={() => setIsAuthModalOpen(true)}
                                className="px-6 py-2 text-sm font-medium text-white bg-green-800 hover:bg-green-900 rounded-md transition-colors"
                            >
                                Login
                            </button>
                        </div>
                    )}
                </div>
            </nav>

            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
            />
        </>
    );
};

export default Navbar;
