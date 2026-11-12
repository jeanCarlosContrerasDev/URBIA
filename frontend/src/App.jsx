import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import MonitoringPage from "./modules/monitoring/MonitoringPage.jsx";
import TrainingPage from "./modules/training/TrainingPage.jsx";
import WarRoomPage from "./modules/warroom/WarRoomPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/monitoring" replace />} />
        <Route path="/monitoring" element={<MonitoringPage />} />
        <Route path="/warroom" element={<WarRoomPage />} />
        <Route path="/training" element={<TrainingPage />} />
        <Route path="*" element={<Navigate to="/monitoring" replace />} />
      </Route>
    </Routes>
  );
}
