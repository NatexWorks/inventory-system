"use client";

import MaintenanceScreen from "./components/MaintenanceScreen";

export default function ErrorBoundary({ reset }) {
  return <MaintenanceScreen onRetry={reset} />;
}
