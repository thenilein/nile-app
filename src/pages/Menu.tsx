import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';

// Define TS types based on our schema
interface Category {
    id: string;
    name: string;
    slug: string;
}

interface Product {
    id: string;
    category_id: string;
    name: string;
    description: string;
    price: number;
    image_url: string;
    is_active: boolean;
}

const Menu = () => {
    const { isGuest } = useAuth();
    const { addToCart } = useCart();

    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMenu = async () => {
            setLoading(true);
            try {
                // Fetch Categories
                const { data: catData, error: catError } = await supabase
                    .from('categories')
                    .select('*')
                    .order('name');
                if (catError) throw catError;
                setCategories(catData || []);

                // Fetch Products
                const { data: prodData, error: prodError } = await supabase
                    .from('products')
                    .select('*')
                    .eq('is_active', true)
                    .order('name');
                if (prodError) throw prodError;
                setProducts(prodData || []);
            } catch (err) {
                console.error("Failed to load menu", err);
            } finally {
                setLoading(false);
            }
        };

        fetchMenu();
    }, []);

    if (loading) {
        return <div className="flex-1 flex justify-center items-center p-8">Loading menu...</div>;
    }

    return (
        <div className="flex-1 p-8 bg-gray-50 flex flex-col items-center">
            <h1 className="text-3xl font-bold mb-4">Ice Cream Menu</h1>
            {isGuest && <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-md mb-6 inline-block">Viewing as Guest</div>}

            {categories.length === 0 ? (
                <div className="text-gray-500 text-center py-10">
                    <p>The menu is currently empty.</p>
                </div>
            ) : (
                <div className="w-full max-w-6xl space-y-12">
                    {categories.map(category => {
                        const categoryProducts = products.filter(p => p.category_id === category.id);
                        if (categoryProducts.length === 0) return null;

                        return (
                            <div key={category.id} className="space-y-4">
                                <h2 className="text-2xl font-bold text-gray-800 border-b border-gray-200 pb-2">{category.name}</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                    {categoryProducts.map(product => (
                                        <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                                            {product.image_url ? (
                                                <img src={product.image_url} alt={product.name} className="w-full h-48 object-cover" />
                                            ) : (
                                                <div className="h-48 bg-gray-200 flex items-center justify-center text-gray-400">
                                                    No Image
                                                </div>
                                            )}
                                            <div className="p-4 flex flex-col flex-1">
                                                <h3 className="font-bold text-lg mb-1">{product.name}</h3>
                                                {product.description && <p className="text-gray-500 text-sm mb-4 line-clamp-2">{product.description}</p>}
                                                <div className="flex items-center justify-between mt-auto pt-4">
                                                    <span className="font-semibold text-green-800">₹{product.price}</span>
                                                    <button
                                                        onClick={() => addToCart(product)}
                                                        className="px-3 py-1.5 bg-gray-100 hover:bg-green-50 text-green-800 text-sm font-medium rounded-md transition-colors"
                                                    >
                                                        Add to cart
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Menu;
