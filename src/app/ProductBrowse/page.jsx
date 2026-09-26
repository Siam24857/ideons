import React from 'react';
import ProductBrowse from './Allproductsbrowse';
import { allProducts } from '@/lib/Action/productget';
 

const BrowserData = async() => {
  const produtdata = await allProducts()
  console.log(produtdata)
  return (
    <div>
      <ProductBrowse products={produtdata}></ProductBrowse>
    </div>
  );
};

export default BrowserData;