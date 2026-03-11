import React from "react";
import { Link, useLocation as useRouterLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogOut, User as UserIcon } from "lucide-react";
import { useLocation as useLocationCtx } from "../context/LocationContext";

const Navbar = () => {
    const { user, signOut } = useAuth();
    const { locationData, clearLocation } = useLocationCtx();
    const routerLocation = useRouterLocation();
    const navigate = useNavigate();

    // Only show location pill when NOT on the landing page
    const showLocationPill = locationData && routerLocation.pathname !== "/";

    const handleChangeLocation = () => {
        clearLocation();
        navigate("/");
    };

    return (
        <nav className="flex items-center justify-between px-6 md:px-10 py-5 border-b border-gray-100 bg-white">
            <Link to="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-800 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    N
                </div>
                <div className="text-xl font-bold text-gray-900 tracking-tight">
                    nile ice creams
                </div>
            </Link>

            <div className="flex items-center gap-3 md:gap-6">

                {/* Location Pill */}
                {showLocationPill && (
                    <div className="hidden sm:flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-3 py-1.5">
                        <span className="text-sm">📍</span>
                        <span className="text-xs font-semibold text-green-800 max-w-[120px] truncate">
                            {locationData.displayName}
                        </span>
                        <button
                            onClick={handleChangeLocation}
                            className="text-xs text-green-600 hover:text-green-900 font-medium underline underline-offset-1 transition-colors ml-1"
                        >
                            Change
                        </button>
                    </div>
                )}

                {/* User info + Logout (only shown when logged in) */}
                {user && (
                    <div className="flex items-center gap-4 border-l pl-4 md:pl-6 border-gray-200">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <UserIcon className="w-4 h-4" />
                            <span className="hidden sm:inline-block truncate max-w-[150px]">
                                {user.user_metadata?.phone ? `+91 ${user.user_metadata.phone}` : user.email || 'User'}
                            </span>
                        </div>
                        <button
                            onClick={signOut}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline-block">Logout</span>
                        </button>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
