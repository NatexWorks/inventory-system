import DashboardClient from "../components/DashboardClient";

export const metadata = {
  title: "Dashboard",
  description: "Your private inventory management workspace.",
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return <DashboardClient />;
}
