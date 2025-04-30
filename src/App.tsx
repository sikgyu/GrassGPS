import { useState } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import MapView from "./components/MapView";
import PlaceDrawer from "./components/PlaceDrawer";
import "./index.css";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [optimizeTrigger, setOptimizeTrigger] = useState(false);

  return (
    <div className="flex flex-col h-full">
      {/* 햄버거 토글 */}
      <Navbar onMenuClick={() => setSidebarOpen((v) => !v)} />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar open={sidebarOpen} optimizeTrigger={optimizeTrigger} setOptimizeTrigger={setOptimizeTrigger} />
        {/* 지도 영역은 flex-1 이라 사이드바가 0-px일 때 전체를 차지함 */}
        <MapView optimizeTrigger={optimizeTrigger} setOptimizeTrigger={setOptimizeTrigger} />
        <PlaceDrawer />
      </div>
    </div>
  );
}
