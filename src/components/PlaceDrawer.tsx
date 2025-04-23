import { useEffect, useState } from "react";
import { usePlaces } from "../hooks/usePlaces";
import { useDropzone } from "react-dropzone";

export default function PlaceDrawer() {
  const { places, toggleVisited, addPhoto } = usePlaces();
  const [openId, setOpenId] = useState<string>();
  const place = places.find((p) => p.id === openId);

  useEffect(() => {
    const h = (e: Event) => setOpenId((e as CustomEvent).detail);
    window.addEventListener("open-place", h as EventListener);
    return () => window.removeEventListener("open-place", h as EventListener);
  }, []);

  const onDrop = (files: File[]) =>
    files.forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (place) {
          addPhoto(place.id, reader.result as string);
        }
      };
      reader.readAsDataURL(f);
    });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  if (!place) return null;

  return (
    <div className="fixed right-0 top-0 z-40 w-80 h-full bg-white shadow p-4 overflow-y-auto">
      <button className="float-right" onClick={() => setOpenId(undefined)}>
        &times;
      </button>

      <h2 className="font-semibold mb-2 pr-6">{place.addr}</h2>

      <label className="flex items-center mb-2">
        <input
          type="checkbox"
          checked={place.visited}
          onChange={() => toggleVisited(place.id)}
        />
        <span className="ml-1">Visited</span>
      </label>

      <div
        {...getRootProps()}
        className="border border-dashed p-4 text-center text-sm mb-2"
      >
        <input {...getInputProps()} />
        {isDragActive ? "Drop photos" : "Click or drag photo"}
      </div>

      <div className="grid grid-cols-2 gap-1 mb-4">
        {(place.photos || []).map((src, i) => (
          <img key={i} src={src} className="object-cover w-full h-24" />
        ))}
      </div>

      <button
        className="btn w-full"
        onClick={() =>
          window.open(
            `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
              place.addr
            )}`,
            "_blank"
          )
        }
      >
        Let’s Go
      </button>
    </div>
  );
}
