import { useState } from "react";
import Navbar      from "./components/Navbar";
import Sidebar     from "./components/Sidebar";
import MapView     from "./components/MapView";
import PlaceDrawer from "./components/PlaceDrawer";
import "./index.css";

export default function App() {
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [optTrig,      setOptTrig]        = useState(false);
  const [routeInfo, setRouteInfo] = useState({
    summary: "", distance: "", duration: "", waypointOrder: [],
  });

  return (
    <div className="flex flex-col h-full">
      <Navbar onMenuClick={() => setSidebarOpen(v => !v)} />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          open={sidebarOpen}
          optimizeTrigger={optTrig}
          setOptimizeTrigger={setOptTrig}
          routeInfo={routeInfo}
        />
        <MapView
          optimizeTrigger={optTrig}
          setOptimizeTrigger={setOptTrig}
          onRouteInfo={setRouteInfo}
        />
        <PlaceDrawer />
      </div>
    </div>
  );
}
