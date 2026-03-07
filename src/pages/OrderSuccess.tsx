import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

const OrderSuccess = () => {
    return (
        <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
            <div className="bg-white p-10 rounded-2xl shadow-lg border border-gray-100 max-w-md w-full text-center animate-in zoom-in duration-300">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
                    <CheckCircle2 className="w-10 h-10" />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
                <p className="text-gray-500 mb-8">
                    Thank you for your order. We've received it and are preparing your delicious ice creams right now.
                </p>

                <div className="space-y-3">
                    <Link
                        to="/menu"
                        className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-800 hover:bg-green-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-800 transition-colors"
                    >
                        Order More
                    </Link>

                    <button
                        className="w-full flex items-center justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-800 transition-colors"
                    >
                        Track Order Status
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderSuccess;
