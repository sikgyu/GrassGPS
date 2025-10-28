// src/components/Sidebar.tsx
import { useState, useCallback, useMemo, useRef, ReactNode } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { usePlaces, type Place } from "../hooks/usePlaces";
import { useGeo } from "../hooks/useGeo";
import { haversine } from "../utils/haversine";
import { ChevronDown, ChevronUp } from "lucide-react";

/* ───────────────────────────────────────────────────────────── */
type Tab = "places" | "route";

interface RouteInfo {
  summary: string;
  distance: string;
  duration: string;
  waypointOrder?: number[];
}

interface Props {
  open: boolean;
  optimizeTrigger: boolean;
  setOptimizeTrigger: React.Dispatch<React.SetStateAction<boolean>>;
  routeInfo?: RouteInfo; // 옵션: 안 넘겨도 렌더 안전
}

/* ───────────────────────────── utils & constants ─────────────────────────── */
const CITY_WHITELIST = [
  "All",
  "Vancouver",
  "North Vancouver",
  "Burnaby",
  "New Westminster",
  "Coquitlam",
  "Langley",
  "Surrey",
  "Richmond",
];

const CITY_ALIASES: Record<string, string> = {
  "District of North Vancouver": "North Vancouver",
  "City of North Vancouver": "North Vancouver",
};

function cityOf(addr: string) {
  const tok = addr
    .split(",")
    .map((t) => t.trim())
    .map((t) => CITY_ALIASES[t] ?? t)
    .find((t) =>
      CITY_WHITELIST.some((c) => c.toLowerCase() === t.toLowerCase())
    );
  return tok ?? "Other";
}

function shortAddr(addr: string) {
  const cut = addr.split(/,\s*Metro Vancouver/i)[0];
  return cut;
}

function regionOf(addr: string) {
  return cityOf(addr);
}

function hasCoords(p: any) {
  const lon = (p as any).lon ?? (p as any).lng;
  return (
    Number.isFinite(p.lat) &&
    Number.isFinite(lon) &&
    (p.lat !== 0 || lon !== 0) &&
    !(p as any).geocodeFailed
  );
}

/* ───────────────────────────────────────────────────────────── */
export function Sidebar({
  open,
  optimizeTrigger,
  setOptimizeTrigger,
  routeInfo,
}: Props) {
  const {
    places,
    routePlaces,
    reorderPlaces,
    addToRoute,
    removeFromRoute,
    reorderRoute,
  } = usePlaces();

  const pos = useGeo();
  const [tab, setTab] = useState<Tab>("places");
  const __hmrGuard = useRef(0);

  /* ───── Drag & Drop ───── */
  const onDragEnd = useCallback(
    (r: DropResult) => {
      if (!r.destination) return;
      if (r.type === "places") {
        const arr = [...places];
        const [m] = arr.splice(r.source.index, 1);
        arr.splice(r.destination.index, 0, m);
        reorderPlaces(arr);
      } else {
        const arr = [...routePlaces];
        const [id] = arr.splice(r.source.index, 1);
        arr.splice(r.destination.index, 0, id);
        reorderRoute(arr);
      }
    },
    [places, routePlaces, reorderPlaces, reorderRoute]
  );

  /* ───── Region filter state ───── */
  const allRegions = useMemo(() => {
    const s = new Set<string>();
    places.forEach((p) =>
      s.add(regionOf((p as any).addr ?? (p as any).address ?? ""))
    );
    return Array.from(s).sort();
  }, [places]);

  const [openDropdown, setOpenDropdown] = useState(false);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]); // empty ⇒ show all

  const toggleRegion = (rg: string) => {
    setSelectedRegions((cur) =>
      cur.includes(rg) ? cur.filter((x) => x !== rg) : [...cur, rg]
    );
  };

  /* ───── Filtered lists ───── */
  const filteredPlaces = useMemo(() => {
    // 좌표 없어도 목록은 보여준다(지금 CSV 로드만 목표)
    const base = places.filter((p) => p.id);
    if (selectedRegions.length === 0) return base;
    return base.filter((p) =>
      selectedRegions.includes(
        regionOf((p as any).addr ?? (p as any).address ?? "")
      )
    );
  }, [places, selectedRegions]);

  const routeList = useMemo(
    () =>
      routePlaces
        .map((id) => places.find((p) => p.id === id))
        .filter((p): p is Place => !!p),
    [places, routePlaces]
  );

  /* ───── Select / Deselect buttons ───── */
  const selectAll = () =>
    filteredPlaces
      .filter((p) => hasCoords(p) && !routePlaces.includes(p.id))
      .forEach((p) => addToRoute(p.id));

  const deselectAll = () => routePlaces.forEach((id) => removeFromRoute(id));

  /* ───── Local TSP (unchanged) ───── */
  const optimizeLocal = () => {
    if (!pos) return alert("Current location unavailable");
    const [homeLat, homeLon] = pos;
    const home: Place = {
      id: "__HOME__",
      addr: "Home",
      rawAddr: "Home",
      lat: homeLat,
      lon: homeLon,
      visited: false,
      logs: [],
      photos: [],
    };
    let unvisited = [...routeList];
    let tour: Place[] = [home, home];

    while (unvisited.length > 0) {
      let bestInc = Infinity,
        bestPi = 0,
        bestInsertPos = 0;
      unvisited.forEach((p, pi) => {
        for (let j = 0; j < tour.length - 1; j++) {
          const A = tour[j],
            B = tour[j + 1];
          const Alon = (A as any).lon ?? (A as any).lng;
          const Blon = (B as any).lon ?? (B as any).lng;
          const Plon = (p as any).lon ?? (p as any).lng;

          const costAB = haversine(A.lat, Alon, B.lat, Blon);
          const costAP = haversine(A.lat, Alon, p.lat, Plon);
          const costPB = haversine(p.lat, Plon, B.lat, Blon);
          const inc = costAP + costPB - costAB;
          if (inc < bestInc) {
            bestInc = inc;
            bestPi = pi;
            bestInsertPos = j + 1;
          }
        }
      });
      const [nextP] = unvisited.splice(bestPi, 1);
      tour.splice(bestInsertPos, 0, nextP);
    }

    reorderRoute(tour.slice(1, -1).map((p) => p.id));
  };
  const onOptimizeClick = () => optimizeLocal();

  /* ───── UI ───── */
  return (
    <aside
      className={`flex flex-col bg-gray-50 shrink-0 overflow-hidden transition-all duration-300 ${
        open ? "w-96" : "w-0"
      }`}
    >
      {open && (
        <>
          {/* ── Tabs ── */}
          <div className="flex border-b">
            <TabBtn act={tab} me="places" setAct={setTab}>
              Places
            </TabBtn>
            <TabBtn act={tab} me="route" setAct={setTab}>
              Route
            </TabBtn>
          </div>

          {/* ── Content ── */}
          <div className="flex-1 overflow-y-auto p-2">
            <DragDropContext onDragEnd={onDragEnd}>
              {tab === "places" ? (
                <>
                  {/* --- Toolbar --- */}
                  <div className="flex flex-col gap-2 mb-4">
                    <div className="flex gap-2">
                      <button
                        onClick={selectAll}
                        disabled={
                          filteredPlaces.filter((p) => hasCoords(p)).length ===
                          routePlaces.length
                        }
                        className="flex-1 py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
                      >
                        Select All
                      </button>
                      <button
                        onClick={deselectAll}
                        disabled={routePlaces.length === 0}
                        className="flex-1 py-2 px-4 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm"
                      >
                        Deselect All
                      </button>
                    </div>
                    {/* Region dropdown */}
                    <div className="relative">
                      <button
                        className="w-full bg-white border rounded flex items-center justify-between px-3 py-2 text-sm"
                        onClick={() => setOpenDropdown(!openDropdown)}
                      >
                        {selectedRegions.length === 0
                          ? "All regions"
                          : `${selectedRegions.length} selected`}
                        {openDropdown ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </button>
                      {openDropdown && (
                        <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow">
                          {/* All regions option */}
                          <label
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer font-semibold"
                            onClick={() => setSelectedRegions([])}
                          >
                            <input
                              type="checkbox"
                              checked={selectedRegions.length === 0}
                              readOnly
                            />
                            All regions
                          </label>

                          {/* Region list */}
                          {allRegions.map((rg) => {
                            const checked = selectedRegions.includes(rg);
                            return (
                              <label
                                key={rg}
                                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleRegion(rg)}
                                />
                                {rg}
                              </label>
                            );
                          })}

                          <div className="py-1" />
                        </div>
                      )}
                    </div>
                    {/* Total count */}
                    <div className="text-xs text-gray-600 px-1">
                      Total addresses: {filteredPlaces.length}
                    </div>
                  </div>

                  {/* --- Draggable list --- */}
                  <Droppable droppableId="places" type="places">
                    {(prov) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.droppableProps}
                        className="space-y-2"
                      >
                        {filteredPlaces.map((pl, i) => (
                          <Draggable key={pl.id} draggableId={pl.id} index={i}>
                            {(drag, snap) => (
                              <Card
                                d={drag}
                                s={snap}
                                i={i}
                                place={pl}
                                inRoute={routePlaces.includes(pl.id)}
                                onAdd={() => addToRoute(pl.id)}
                                onRemove={() => removeFromRoute(pl.id)}
                              />
                            )}
                          </Draggable>
                        ))}
                        {prov.placeholder}
                      </div>
                    )}
                  </Droppable>
                </>
              ) : (
                /* --- Route tab --- */
                <>
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={onOptimizeClick}
                      disabled={!pos || routeList.length < 2}
                      className="flex-none py-2 px-4 bg-green-500 hover:bg-green-600 text-white rounded"
                    >
                      Optimize
                    </button>
                  </div>

                  {/* 요약 박스: routeInfo 있으면만 표시 */}
                  {routeInfo && (
                    <div className="bg-white p-4 mb-4 rounded shadow text-sm">
                      <div>
                        <b>Summary:</b> {routeInfo.summary}
                      </div>
                      <div>
                        <b>Total distance:</b> {routeInfo.distance}
                      </div>
                      <div>
                        <b>Duration:</b> {routeInfo.duration}
                      </div>
                    </div>
                  )}

                  <Droppable droppableId="route" type="route">
                    {(prov) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.droppableProps}
                        className="space-y-2"
                      >
                        {routeList.map((pl, i) => (
                          <Draggable key={pl.id} draggableId={pl.id} index={i}>
                            {(drag, snap) => (
                              <Card
                                d={drag}
                                s={snap}
                                i={i}
                                place={pl}
                                inRoute
                                onRemove={() => removeFromRoute(pl.id)}
                              />
                            )}
                          </Draggable>
                        ))}
                        {prov.placeholder}
                      </div>
                    )}
                  </Droppable>
                </>
              )}
            </DragDropContext>
          </div>
        </>
      )}
    </aside>
  );
}

/* ───── Sub-components ───── */
function TabBtn({
  act,
  me,
  setAct,
  children,
}: {
  act: Tab;
  me: Tab;
  setAct: (t: Tab) => void;
  children: ReactNode;
}) {
  const active = act === me;
  return (
    <button
      onClick={() => setAct(me)}
      className={`flex-1 py-2 font-medium ${
        active
          ? "border-b-2 border-blue-500 text-blue-600"
          : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

function Card({
  d,
  s,
  i,
  place,
  inRoute,
  onAdd,
  onRemove,
}: {
  d: any;
  s: any;
  i: number;
  place: Place;
  inRoute: boolean;
  onAdd?: () => void;
  onRemove: () => void;
}) {
  const noGeo = !hasCoords(place);

  return (
    <div
      ref={d.innerRef}
      {...d.draggableProps}
      style={d.draggableProps.style}
      className={`bg-white rounded shadow p-2 flex items-center gap-2 ${
        s.isDragging ? "shadow-lg ring-2 ring-blue-500" : ""
      }`}
    >
      <div
        {...d.dragHandleProps}
        className={`flex-1 flex items-center gap-2 ${
          s.isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <span className="w-6 text-gray-500">{i + 1}.</span>
        <span className="flex-1 text-sm whitespace-normal break-words">
          {shortAddr((place as any).addr ?? (place as any).address ?? "")}
        </span>
        {noGeo && (
          <span className="text-xs text-gray-400 select-none">· no coords</span>
        )}
      </div>

      {inRoute ? (
        <span className="text-green-500 font-bold px-2">✓</span>
      ) : (
        <button
          onClick={onAdd}
          className="text-gray-400 hover:text-green-500 px-2 disabled:opacity-40"
          disabled={noGeo}
          title={noGeo ? "No coordinates" : ""}
        >
          +
        </button>
      )}
      <button
        onClick={onRemove}
        className="text-gray-400 hover:text-red-500 px-2"
      >
        ×
      </button>
    </div>
  );
}
