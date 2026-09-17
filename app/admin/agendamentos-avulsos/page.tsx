import AdminBookingsPage, {
  type AdminPageProps,
} from "@/components/AdminBookingsPage";

export const dynamic = "force-dynamic";
export default function ManualBookingsPage(props: AdminPageProps) {
  return <AdminBookingsPage {...props} bookingType="avulso" />;
}
