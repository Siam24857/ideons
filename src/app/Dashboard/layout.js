import React from 'react';
import UserDashboardSidebar from './Component/Dashpordpage';

const layout = ({ children }) => {
    return (
        <div className='flex min-h-screen flex-col bg-white md:flex-row'>
            {/* Mobile top nav */}
            <div className="border-b border-gray-200 bg-white p-3 md:hidden">
                <nav className="flex gap-1 overflow-x-auto pb-1">
                    {[
                        { name: "Profile", href: "/dashboard/profile" },
                        { name: "Cart", href: "/Dashboard/Cartproduct" },
                        { name: "Orders", href: "/Dashboard/Orders" },
                    ].map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            className="flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-navy-700 hover:bg-navy-50"
                        >
                            {link.name}
                        </a>
                    ))}
                </nav>
            </div>
            <div className="hidden md:block">
                <UserDashboardSidebar />
            </div>
            <main className="flex-1 bg-navy-50 pb-12 min-w-0">{children}</main>
        </div>
    );
};

export default layout;