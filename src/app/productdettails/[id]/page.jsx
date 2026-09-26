import React from 'react';
import ProductDetails from './Productdettails';
import { Productsdettails } from '@/lib/Action/productget';

const Dettailspage = async({params}) => {
    const { id } = await params
     const prodduscdettail = await Productsdettails(id)
      
    return (
        <div>
            <ProductDetails productDetails={prodduscdettail} />
        </div>
    );
};

export default Dettailspage;