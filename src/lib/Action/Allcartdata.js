export const allCarts = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/Carts`);
  const data = await res.json();
  return data;
};