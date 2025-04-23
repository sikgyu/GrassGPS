import { useState, useEffect } from "react";

export function useGeo() {
  const [pos, setPos] = useState<[number, number]>();

  useEffect(() => {
    const upd = () =>
      navigator.geolocation.getCurrentPosition((p) =>
        setPos([p.coords.latitude, p.coords.longitude])
      );
    upd();
    const id = setInterval(upd, 300_000); // 5 분
    return () => clearInterval(id);
  }, []);

  return pos;
}
