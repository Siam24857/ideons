import React from 'react';
import UserDashboardSidebar from './Component/Dashpordpage';

const layout = ({ children }) => {
    return (
        <div className='flex gap-23 bg-white h-screen '>
            <UserDashboardSidebar></UserDashboardSidebar>
            {children}
        </div>
    );
};

export default layout;