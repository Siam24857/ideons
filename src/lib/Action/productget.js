export const allProducts = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/products`);
  const data = await res.json();
  return data;
};

export const Productsdettails = async (id) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/products/${id}`);
  const data = await res.json();
  return data;
};