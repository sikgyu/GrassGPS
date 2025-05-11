import { useState, useCallback, useMemo, ReactNode } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { usePlaces, Place } from "../hooks/usePlaces";
import { useGeo } from "../hooks/useGeo";
import { haversine } from "../utils/haversine";

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
  routeInfo: RouteInfo;
}

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

  /* 1) Drag & Drop 순서 변경 */
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

  /* 2) 메모화된 리스트 */
  const filteredPlaces = useMemo(
    () => places.filter((p) => p.id && !p.geocodeFailed),
    [places]
  );
  const routeList = useMemo(
    () =>
      routePlaces
        .map((id) => places.find((p) => p.id === id))
        .filter((p): p is Place => !!p),
    [places, routePlaces]
  );

  /* 3) 버튼 동작 */
  const selectAll = () =>
    filteredPlaces
      .filter((p) => !routePlaces.includes(p.id))
      .forEach((p) => addToRoute(p.id));
  const deselectAll = () => routePlaces.forEach((id) => removeFromRoute(id));

  /* 4) Local TSP: Cheapest‑Insertion */
  const optimizeLocal = () => {
    if (!pos) return alert("현재 위치를 가져올 수 없습니다.");
    const [homeLat, homeLon] = pos;
    const home: Place = {
      id: "__HOME__",
      addr: "Home",
      lat: homeLat,
      lon: homeLon,
      visited: false,
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
          const costAB = haversine(A.lat, A.lon, B.lat, B.lon);
          const costAP = haversine(A.lat, A.lon, p.lat, p.lon);
          const costPB = haversine(p.lat, p.lon, B.lat, B.lon);
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

  /* 5) Optimize 클릭 */
  const onOptimizeClick = () => {
    optimizeLocal();
  };

  return (
    <aside
      className={`
        flex flex-col bg-gray-50 shrink-0 overflow-hidden
        transition-all duration-300 ${open ? "w-96" : "w-0"}
      `}
    >
      {open && (
        <>
          {/* 탭 */}
          <div className="flex border-b">
            <TabBtn act={tab} me="places" setAct={setTab}>
              Places
            </TabBtn>
            <TabBtn act={tab} me="route" setAct={setTab}>
              Route
            </TabBtn>
          </div>

          {/* 콘텐츠 */}
          <div className="flex-1 overflow-y-auto p-2">
            <DragDropContext onDragEnd={onDragEnd}>
              {tab === "places" ? (
                <>
                  {/* — Places 탭 — */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={selectAll}
                      disabled={filteredPlaces.length === routePlaces.length}
                      className="flex-1 py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
                    >
                      모두 선택
                    </button>
                    <button
                      onClick={deselectAll}
                      disabled={routePlaces.length === 0}
                      className="flex-1 py-2 px-4 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm"
                    >
                      모두 해제
                    </button>
                  </div>

                  <Droppable droppableId="places" type="places">
                    {(prov) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.droppableProps}
                        className="space-y-2"
                      >
                        {filteredPlaces.map((pl, i) => (
                          <Draggable
                            key={pl.id}
                            draggableId={pl.id}
                            index={i}
                          >
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
                <>
                  {/* — Route 탭 — */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={onOptimizeClick}
                      disabled={!pos || routeList.length < 2}
                      className="flex-none py-2 px-4 bg-green-500 hover:bg-green-600 text-white rounded"
                    >
                      Optimize
                    </button>
                  </div>

                  <div className="bg-white p-4 mb-4 rounded shadow text-sm">
                    <div>
                      <b>경로 요약:</b> {routeInfo.summary}
                    </div>
                    <div>
                      <b>총 거리:</b> {routeInfo.distance}
                    </div>
                    <div>
                      <b>소요 시간:</b> {routeInfo.duration}
                    </div>
                  </div>

                  <Droppable droppableId="route" type="route">
                    {(prov) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.droppableProps}
                        className="space-y-2"
                      >
                        {routeList.map((pl, i) => (
                          <Draggable
                            key={pl.id}
                            draggableId={pl.id}
                            index={i}
                          >
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
        <span className="flex-1 text-sm">{place.addr}</span>
      </div>

      {inRoute ? (
        <span className="text-green-500 font-bold px-2">✓</span>
      ) : (
        <button
          onClick={onAdd}
          className="text-gray-400 hover:text-green-500 px-2"
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
