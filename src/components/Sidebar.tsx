// NOTE: You must install react-beautiful-dnd: npm install react-beautiful-dnd
import { useCallback, useMemo } from "react";
import { usePlaces } from "../hooks/usePlaces";
import { useGeo } from "../hooks/useGeo";
import { haversine } from "../utils-haversine";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult
} from "@hello-pangea/dnd";

export default function Sidebar() {
  const { places, reorderPlaces } = usePlaces();
  const pos = useGeo();

  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(places);
    const [removed] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, removed);
    reorderPlaces(items);
  }, [places, reorderPlaces]);

  const optimizeByCurrentLocation = useCallback(() => {
    if (!pos) {
      alert('현재 위치를 가져올 수 없습니다. 위치 권한을 확인해주세요.');
      return;
    }

    const [lat, lon] = pos;
    const sorted = [...places].sort(
      (a, b) => haversine(lat, lon, a.lat, a.lon) - haversine(lat, lon, b.lat, b.lon)
    );
    reorderPlaces(sorted);
  }, [pos, places, reorderPlaces]);

  const removePlace = useCallback((id: string) => {
    if (window.confirm('정말 이 장소를 제거하시겠습니까?')) {
      reorderPlaces(places.filter(p => p.id !== id));
    }
  }, [places, reorderPlaces]);

  const filteredPlaces = useMemo(() => 
    places.filter(p => p.id && !p.geocodeFailed),
    [places]
  );

  return (
    <aside className="w-60 bg-gray-50 p-2 overflow-y-auto">
      <h2 className="font-semibold mb-2">Stops</h2>
      <button 
        onClick={optimizeByCurrentLocation}
        className="btn w-full mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!pos || filteredPlaces.length < 2}
        title={!pos ? "위치 정보를 가져올 수 없습니다" : 
               filteredPlaces.length < 2 ? "최적화하려면 최소 2개의 장소가 필요합니다" : 
               "현재 위치를 기준으로 최적의 경로를 계산합니다"}
      >
        현재 위치 기준 최적화
      </button>

      {!filteredPlaces.length ? (
        <p className="text-sm text-gray-500 text-center py-4">
          아직 등록된 장소가 없습니다.
        </p>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="stops">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
                role="list"
              >
                {filteredPlaces.map((place, index) => (
                  <Draggable
                    key={place.id}
                    draggableId={place.id}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`
                          bg-white rounded-lg shadow p-2 flex items-center gap-2
                          ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500 opacity-90 z-50' : ''}
                          transition-all duration-200 hover:shadow-md
                        `}
                        style={provided.draggableProps.style}
                      >
                        <div
                          {...provided.dragHandleProps}
                          className={`flex items-center gap-2 flex-1 ${snapshot.isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                        >
                          <span className="w-6 text-gray-500 select-none">{index + 1}.</span>
                          <span className="flex-1 text-sm">{place.addr}</span>
                        </div>
                        <button
                          onClick={() => removePlace(place.id)}
                          className="text-gray-400 hover:text-red-500 px-2 py-1 rounded transition-colors"
                          title="제거"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </aside>
  );
}
