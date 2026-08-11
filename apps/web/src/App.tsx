import { Route, Routes } from "react-router-dom";
import { LinkDetailPage } from "./features/analytics/LinkDetailPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { StatusBar } from "./features/dashboard/StatusBar";

export function App() {
  return (
    <>
      <StatusBar />
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/links/:slug" element={<LinkDetailPage />} />
      </Routes>
    </>
  );
}
