export const Addproducttocart = async (dettails) =>{
    const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/addcartdata`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(dettails)
    })
    const data = await res.json()
    return data
}