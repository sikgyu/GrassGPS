// NOTE:  npm i @hello-pangea/dnd
import {
  useState, useCallback, useMemo, type ReactNode
} from "react";
import {
  DragDropContext, Droppable, Draggable, type DropResult
} from "@hello-pangea/dnd";
import { usePlaces, type Place } from "../hooks/usePlaces";
import { useGeo } from "../hooks/useGeo";
import { haversine } from "../utils-haversine";

type Tab = "places" | "route";

interface Props {
  open: boolean;          // App → 상태 전달
}

export default function Sidebar({ open }: Props) {
  const {
    places, routePlaces, reorderPlaces,
    addToRoute, removeFromRoute, reorderRoute
  } = usePlaces();
  const pos = useGeo();

  const [tab, setTab] = useState<Tab>("places");

  /* -------- 드래그 -------- */
  const onDragEnd = useCallback((r: DropResult) => {
    if (!r.destination) return;
    if (r.type === "places") {
      const arr = Array.from(places);
      const [m] = arr.splice(r.source.index, 1);
      arr.splice(r.destination.index, 0, m);
      reorderPlaces(arr);
    } else {
      const arr = Array.from(routePlaces);
      const [id] = arr.splice(r.source.index, 1);
      arr.splice(r.destination.index, 0, id);
      reorderRoute(arr);
    }
  }, [places, routePlaces, reorderPlaces, reorderRoute]);

  /* -------- 데이터 -------- */
  const filtered = useMemo(
    () => places.filter((p) => p.id && !p.geocodeFailed),
    [places]
  );
  const routeList = useMemo(
    () => routePlaces.map(id => places.find(p => p.id === id))
                     .filter((p): p is Place => !!p),
    [places, routePlaces]
  );

  /* -------- 버튼 -------- */
  const selectAll   = () => filtered
      .filter(p => !routePlaces.includes(p.id))
      .forEach(p => addToRoute(p.id));

  const deselectAll = () => routePlaces.forEach(removeFromRoute);

  const optimize = () => {
    if (!pos) return alert("현재 위치를 가져올 수 없습니다.");
    const [lat, lon] = pos;
    const sorted = [...routeList].sort(
      (a, b) => haversine(lat, lon, a.lat, a.lon) - haversine(lat, lon, b.lat, b.lon)
    );
    reorderRoute(sorted.map(p => p.id));
  };

  /* -------- 렌더 -------- */
  return (
    <aside
      className={`
        flex flex-col bg-gray-50 shrink-0 overflow-hidden
        transition-all duration-300
        ${open ? "w-96" : "w-0"}
      `}
    >
      {open && (
        <>
          {/* Tabs */}
          <div className="flex border-b">
            <TabBtn act={tab} me="places" setAct={setTab}>Places</TabBtn>
            <TabBtn act={tab} me="route"  setAct={setTab}>Route</TabBtn>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-2">
            <DragDropContext onDragEnd={onDragEnd}>
              {tab === "places" ? (
                <>
                  <div className="flex gap-2 mb-4">
                    <button
                      className="flex-1 py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
                      onClick={selectAll}
                      disabled={filtered.length === routePlaces.length}
                    >
                      모두 선택
                    </button>
                    <button
                      className="flex-1 py-2 px-4 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm"
                      onClick={deselectAll}
                      disabled={routePlaces.length === 0}
                    >
                      모두 해제
                    </button>
                  </div>

                  <Droppable droppableId="places" type="places">
                    {(p) => (
                      <div ref={p.innerRef} {...p.droppableProps} className="space-y-2">
                        {filtered.map((pl, i) => (
                          <Draggable key={pl.id} draggableId={pl.id} index={i}>
                            {(d, s) => (
                              <Card
                                d={d} s={s} i={i} place={pl}
                                inRoute={routePlaces.includes(pl.id)}
                                onAdd={() => addToRoute(pl.id)}
                                onRemove={() => {
                                  reorderPlaces(places.filter(p => p.id !== pl.id));
                                  removeFromRoute(pl.id);
                                }}
                              />
                            )}
                          </Draggable>
                        ))}
                        {p.placeholder}
                      </div>
                    )}
                  </Droppable>
                </>
              ) : (
                <>
                  <button
                    className="btn w-full mb-4 disabled:opacity-50"
                    onClick={optimize}
                    disabled={!pos || routeList.length < 2}
                  >
                    Optimize from Current Location
                  </button>

                  <Droppable droppableId="route" type="route">
                    {(p) => (
                      <div ref={p.innerRef} {...p.droppableProps} className="space-y-2">
                        {routeList.map((pl, i) => (
                          <Draggable key={pl.id} draggableId={pl.id} index={i}>
                            {(d, s) => (
                              <Card
                                d={d} s={s} i={i} place={pl}
                                inRoute
                                onRemove={() => removeFromRoute(pl.id)}
                              />
                            )}
                          </Draggable>
                        ))}
                        {p.placeholder}
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

/* ------------ 하위 컴포넌트 ------------ */
function TabBtn({ act, me, setAct, children }:{
  act: Tab; me: Tab; children: ReactNode; setAct: (t: Tab)=>void;
}) {
  const active = act === me;
  return (
    <button
      onClick={() => setAct(me)}
      className={`flex-1 py-2 font-medium ${
        active ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"}`}
    >
      {children}
    </button>
  );
}

function Card({
  d, s, i, place, inRoute, onAdd, onRemove
}:{
  d:any; s:any; i:number; place:Place; inRoute:boolean;
  onAdd?:()=>void; onRemove:()=>void;
}) {
  return (
    <div
      ref={d.innerRef}
      {...d.draggableProps}
      className={`bg-white rounded shadow p-2 flex items-center gap-2 ${
        s.isDragging && "shadow-lg ring-2 ring-blue-500"}`}
      style={d.draggableProps.style}
    >
      <div
        {...d.dragHandleProps}
        className={`flex items-center gap-2 flex-1 ${
          s.isDragging ? "cursor-grabbing" : "cursor-grab"}`}
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
          title="경로에 추가"
        >
          +
        </button>
      )}

      <button
        onClick={onRemove}
        className="text-gray-400 hover:text-red-500 px-2"
        title="삭제"
      >
        ×
      </button>
    </div>
  );
}
