import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Component to protect authenticated routes (if needed in future)
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <div className="flex-1 flex justify-center items-center h-screen">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

// Component to redirect authenticated users away from auth pages
const AuthRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <div className="flex-1 flex justify-center items-center h-screen">Loading...</div>;
    }

    if (user) {
        return <Navigate to="/" replace />;
    }

    return children;
};

const AppRoutes = () => {
    return (
        <div className="min-h-screen bg-white font-sans flex flex-col items-stretch">
            <Navbar />
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route
                    path="/login"
                    element={
                        <AuthRoute>
                            <Login />
                        </AuthRoute>
                    }
                />
                <Route
                    path="/signup"
                    element={
                        <AuthRoute>
                            <Signup />
                        </AuthRoute>
                    }
                />
            </Routes>
        </div>
    );
};

const App = () => {
    return (
        <AuthProvider>
            <Router>
                <AppRoutes />
            </Router>
        </AuthProvider>
    );
};

export default App;