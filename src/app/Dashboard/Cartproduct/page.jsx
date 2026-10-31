import React from 'react';
import Cartpage from '../Component/Cart';
import { allCarts } from '@/lib/Action/Allcartdata';

export const dynamic = "force-dynamic";

const Allcart = async() => {

      const cartdata = await allCarts()
     
    return (
        <div>
            <Cartpage cartdata={cartdata}></Cartpage>
        </div>
    );
};

export default Allcart;