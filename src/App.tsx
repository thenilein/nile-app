import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Landing from "./pages/Landing";
import { AuthProvider } from "./context/AuthContext";

const AppRoutes = () => {
    return (
        <div className="min-h-screen bg-white font-sans flex flex-col items-stretch">
            <Navbar />
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="*" element={<Navigate to="/" replace />} />
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