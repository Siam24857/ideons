import React from 'react';
import ProductBrowse from './Allproductsbrowse';
import { allProducts } from '@/lib/Action/productget';

export const dynamic = "force-dynamic";

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