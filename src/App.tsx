import React from "react";

const Navbar = () => {
    return (
        <nav className="flex justify-between items-center px-10 py-4 shadow-md bg-white">
            <div className="text-2xl font-bold text-starbucks">
                Starbucks
            </div>

            <div className="flex gap-6 font-medium">
                <a href="#" className="hover:text-starbucks">Home</a>
                <a href="#" className="hover:text-starbucks">Menu</a>
                <a href="#" className="hover:text-starbucks">Rewards</a>
                <a href="#" className="hover:text-starbucks">Stores</a>
            </div>

            <button className="bg-starbucks text-white px-5 py-2 rounded-full">
                Order Now
            </button>
        </nav>
    );
};

const Hero = () => {
    return (
        <section className="grid md:grid-cols-2 items-center px-10 py-20 bg-green-50">
            <div>
                <h1 className="text-5xl font-bold mb-6">
                    Brewed for those who love coffee
                </h1>

                <p className="text-lg mb-6 text-gray-600">
                    Discover handcrafted beverages and delicious food.
                    Order ahead and skip the line.
                </p>

                <button className="bg-starbucks text-white px-6 py-3 rounded-full">
                    Explore Menu
                </button>
            </div>

            <img
                className="rounded-xl shadow-lg"
                src="https://images.unsplash.com/photo-1509042239860-f550ce710b93"
            />
        </section>
    );
};

const MenuSection = () => {
    const items = [
        {
            name: "Cappuccino",
            price: "₹280",
            img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93"
        },
        {
            name: "Cold Brew",
            price: "₹320",
            img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085"
        },
        {
            name: "Latte",
            price: "₹300",
            img: "https://images.unsplash.com/photo-1511920170033-f8396924c348"
        }
    ];

    return (
        <section className="px-10 py-20">
            <h2 className="text-3xl font-bold mb-10 text-center">
                Popular Drinks
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
                {items.map((item) => (
                    <div
                        key={item.name}
                        className="bg-white rounded-xl shadow-md overflow-hidden"
                    >
                        <img src={item.img} className="h-56 w-full object-cover" />

                        <div className="p-6">
                            <h3 className="text-xl font-semibold">
                                {item.name}
                            </h3>

                            <p className="text-gray-500 mb-3">
                                {item.price}
                            </p>

                            <button className="bg-starbucks text-white px-4 py-2 rounded-full">
                                Add to Cart
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

const App = () => {
    return (
        <div className="font-sans">
            <Navbar />
            <Hero />
            <MenuSection />
        </div>
    );
};

export default App;