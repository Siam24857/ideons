import { auth } from "@/lib/auth";

export const userdata = async ()=>{
     const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}