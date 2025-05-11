// src/components/Navbar.tsx

import { useState } from "react";
import Modal from "./Modal";
import { usePlaces } from "../hooks/usePlaces";

interface Props {
  onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: Props) {
  const [mode, setMode] = useState<null | "import" | "add">(null);
  const [text, setText] = useState("");

  const loadCsv = usePlaces((s) => s.loadCsv);
  const addAddresses = usePlaces((s) => s.addAddresses);

  const save = async () => {
    if (mode === "import") {
      await loadCsv(text);
    } else if (mode === "add") {
      await addAddresses(text);
    }
    setText("");
    setMode(null);
  };

  return (
    <header className="bg-green-600 text-white h-12 flex items-center px-3">
      <button
        onClick={onMenuClick}
        className="text-2xl mr-3"
        aria-label="menu"
      >
        ≡
      </button>

      <h1 className="font-bold mr-auto select-none">GrassGPS</h1>

      <button
        className="btn bg-white text-green-700"
        onClick={() => setMode("import")}
      >
        Import List
      </button>
      <button
        className="btn bg-white text-green-700 ml-2"
        onClick={() => setMode("add")}
      >
        Add Addr
      </button>

      {mode && (
        <Modal onClose={() => setMode(null)}>
          <h3 className="font-semibold mb-2">
            {mode === "import" ? "Import CSV/text" : "Add addresses"}
          </h3>
          <textarea
            className="border w-full h-40 p-1 text-sm mb-2"
            placeholder="주소를 한 줄에 하나씩 입력"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            className="btn w-full"
            onClick={save}
            disabled={!text.trim()}
          >
            Save
          </button>
        </Modal>
      )}
    </header>
);
}
