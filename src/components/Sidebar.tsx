import { usePlaces } from "../hooks/usePlaces";

export default function Sidebar() {
  const { places, toggleStop, clearStops } = usePlaces();

  return (
    <aside className="w-60 bg-gray-50 p-2 overflow-y-auto">
      <h2 className="font-semibold mb-2">Stops</h2>

      {places && places.length > 0 ? (
        places
          .filter((p) => p.id)
          .map((p) => (
            <label key={`sidebar-${p.id}`} className="block text-sm">
              <input
                type="checkbox"
                checked={p.visited}
                onChange={() => toggleStop(p.id)}
                className="mr-1"
                disabled={p.geocodeFailed}
              />
              <span className={p.geocodeFailed ? "text-red-500" : ""}>
                {p.addr}
                {p.geocodeFailed && (
                  <span className="text-xs text-red-500 ml-1">(주소를 찾을 수 없음)</span>
                )}
              </span>
            </label>
          ))
      ) : (
        <p className="text-sm text-gray-500">No places available</p>
      )}

      <button
        className="btn w-full mt-2"
        onClick={() => window.dispatchEvent(new Event("calc-route"))}
      >
        Calc Route
      </button>
      <button onClick={clearStops} className="btn bg-gray-300 w-full mt-1">
        Clear
      </button>
    </aside>
  );
}
