import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import MapView from "./components/MapView";
import PlaceDrawer from "./components/PlaceDrawer";
import "./index.css";

export default function App() {
  return (
    <div className="flex flex-col h-full">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <MapView />
        <PlaceDrawer />
      </div>
    </div>
  );
}
