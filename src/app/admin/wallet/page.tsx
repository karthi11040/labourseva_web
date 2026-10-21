import { redirect } from "next/navigation";

export default function AdminWalletRedirect() {
  redirect("/admin/finance");
}
