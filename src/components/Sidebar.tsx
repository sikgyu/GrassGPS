import { usePlaces } from "../hooks/usePlaces";

export default function Sidebar() {
  const { places, stops, toggleStop, clearStops } = usePlaces();

  return (
    <aside className="w-60 bg-gray-50 p-2 overflow-y-auto">
      <h2 className="font-semibold mb-2">Stops</h2>

      {places.map((p) => (
        <label key={p.id} className="block text-sm">
          <input
            type="checkbox"
            checked={stops.includes(p.id)}
            onChange={() => toggleStop(p.id)}
            className="mr-1"
          />
          {p.addr}
        </label>
      ))}

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
