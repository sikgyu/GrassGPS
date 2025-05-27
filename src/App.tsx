import { useState, useCallback } from "react";
import Navbar from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";
import MapView from "./components/MapView";
import "./index.css";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [optimizeTrigger, setOptimizeTrigger] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{
    summary: string;
    distance: string;
    duration: string;
    waypointOrder?: number[];
  }>({ summary: "", distance: "", duration: "" });

  const handleRouteInfo = useCallback((info: {
    summary: string;
    distance: string;
    duration: string;
    waypointOrder?: number[];
  }) => {
    setRouteInfo(info);
  }, []);

  const handleOptimizeHandled = useCallback(() => {
    setOptimizeTrigger(false);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <Navbar onMenuClick={() => setSidebarOpen((v) => !v)} />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          open={sidebarOpen}
          optimizeTrigger={optimizeTrigger}
          setOptimizeTrigger={setOptimizeTrigger}
          routeInfo={routeInfo}
        />
        <MapView 
          optimizeTrigger={optimizeTrigger}
          setOptimizeTrigger={setOptimizeTrigger}
          onRouteInfo={handleRouteInfo}
          onOptimizeHandled={handleOptimizeHandled}
        />
      </div>
    </div>
  );
}
console.log("★TEST★")
console.log("🧩 import.meta.env =", import.meta.env);
