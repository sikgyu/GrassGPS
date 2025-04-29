// NOTE: You must install react-beautiful-dnd: npm install react-beautiful-dnd
import { useCallback, useMemo, useState, useEffect } from "react";
import { usePlaces, type Place } from "../hooks/usePlaces";
import { useGeo } from "../hooks/useGeo";
import { haversine } from "../utils-haversine";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult
} from "@hello-pangea/dnd";

// Tab type for managing active tab
type TabType = 'places' | 'route';

export default function Sidebar() {
  const { 
    places, 
    routePlaces,
    reorderPlaces, 
    addToRoute,
    removeFromRoute,
    reorderRoute
  } = usePlaces();
  const pos = useGeo();
  const [activeTab, setActiveTab] = useState<TabType>('places');

  // Handle drag end for both places and route lists
  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    
    console.log('Drag end:', result);  // 드래그 결과 로깅
    
    if (result.type === 'places') {
      const items = Array.from(places);
      const [removed] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, removed);
      reorderPlaces(items);
    } else if (result.type === 'route') {
      // 현재 route에 있는 places의 순서를 변경
      const newOrder = Array.from(routePlaces);
      const [movedId] = newOrder.splice(result.source.index, 1);
      newOrder.splice(result.destination.index, 0, movedId);
      reorderRoute(newOrder);
    }
  }, [places, routePlaces, reorderPlaces, reorderRoute]);

  // routePlaces 변경 감지를 위한 useEffect 추가
  useEffect(() => {
    console.log('routePlaces updated:', routePlaces);
  }, [routePlaces]);

  const filteredPlaces = useMemo(() => 
    places.filter(p => p.id && !p.geocodeFailed),
    [places]
  );

  const routeFilteredPlaces = useMemo(() =>
    // routePlaces의 순서를 정확히 유지하면서 Place 객체 배열 생성
    routePlaces.map(id => places.find(p => p.id === id)).filter((p): p is Place => p !== undefined),
    [places, routePlaces]
  );

  const optimizeByCurrentLocation = useCallback(() => {
    if (!pos) {
      alert('Unable to get current location. Please check location permissions.');
      return;
    }

    const [lat, lon] = pos;
    // Sort only the route places
    const sorted = [...routeFilteredPlaces].sort(
      (a, b) => haversine(lat, lon, a.lat, a.lon) - haversine(lat, lon, b.lat, b.lon)
    );
    // Update route order with sorted IDs
    reorderRoute(sorted.map(p => p.id));
  }, [pos, routeFilteredPlaces, reorderRoute]);

  const removePlace = useCallback((id: string) => {
    if (window.confirm('정말 이 장소를 제거하시겠습니까?')) {
      reorderPlaces(places.filter(p => p.id !== id));
      removeFromRoute(id); // Also remove from route if it exists there
    }
  }, [places, reorderPlaces, removeFromRoute]);

  // Mobile detection
  const isMobile = useMemo(() => window.innerWidth < 768, []);

  // 모두 선택 기능
  const selectAll = useCallback(() => {
    const notInRoute = filteredPlaces
      .filter(place => !routePlaces.includes(place.id))
      .map(place => place.id);
    notInRoute.forEach(id => addToRoute(id));
  }, [filteredPlaces, routePlaces, addToRoute]);

  // 모두 해제 기능
  const deselectAll = useCallback(() => {
    routePlaces.forEach(id => removeFromRoute(id));
  }, [routePlaces, removeFromRoute]);

  return (
    <aside className="w-96 bg-gray-50 flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          className={`flex-1 py-2 px-4 text-sm font-medium ${
            activeTab === 'places'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('places')}
        >
          Places
        </button>
        <button
          className={`flex-1 py-2 px-4 text-sm font-medium ${
            activeTab === 'route'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('route')}
        >
          Route
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-2">
        <DragDropContext onDragEnd={onDragEnd}>
          {activeTab === 'places' ? (
            <>
              {/* 모두 선택/해제 버튼 */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={selectAll}
                  className="flex-1 py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors"
                  disabled={filteredPlaces.length === routePlaces.length}
                >
                  모두 선택
                </button>
                <button
                  onClick={deselectAll}
                  className="flex-1 py-2 px-4 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                  disabled={routePlaces.length === 0}
                >
                  모두 해제
                </button>
              </div>

              {!filteredPlaces.length ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  아직 등록된 장소가 없습니다.
                </p>
              ) : (
                <Droppable droppableId="places" type="places">
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
                              {routePlaces.includes(place.id) ? (
                                <span
                                  className="text-green-500 px-2 py-1"
                                  title="경로에 추가됨"
                                >
                                  ✓
                                </span>
                              ) : (
                                <button
                                  onClick={() => addToRoute(place.id)}
                                  className="text-gray-400 hover:text-green-500 px-2 py-1 rounded transition-colors"
                                  title="경로에 추가"
                                >
                                  +
                                </button>
                              )}
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
              )}
            </>
          ) : (
            <>
              <button 
                onClick={optimizeByCurrentLocation}
                className="btn w-full mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!pos || routeFilteredPlaces.length < 2}
                title={!pos ? "Unable to get current location" : 
                       routeFilteredPlaces.length < 2 ? "Need at least 2 places to optimize" : 
                       "Optimize route based on current location"}
              >
                Optimize from Current Location
              </button>

              <Droppable droppableId="route" type="route">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                    role="list"
                  >
                    {routeFilteredPlaces.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        경로에 추가된 장소가 없습니다.
                      </p>
                    ) : (
                      routeFilteredPlaces.map((place, index) => (
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
                                onClick={() => removeFromRoute(place.id)}
                                className="text-gray-400 hover:text-red-500 px-2 py-1 rounded transition-colors"
                                title="경로에서 제거"
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </>
          )}
        </DragDropContext>
      </div>

      {/* Mobile bottom tabs */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 flex bg-white border-t border-gray-200 z-50">
          <button
            className={`flex-1 py-3 ${
              activeTab === 'places'
                ? 'text-blue-600 border-t-2 border-blue-500'
                : 'text-gray-500'
            }`}
            onClick={() => setActiveTab('places')}
          >
            Places
          </button>
          <button
            className={`flex-1 py-3 ${
              activeTab === 'route'
                ? 'text-blue-600 border-t-2 border-blue-500'
                : 'text-gray-500'
            }`}
            onClick={() => setActiveTab('route')}
          >
            Route
          </button>
        </div>
      )}
    </aside>
  );
}
