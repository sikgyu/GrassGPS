import { useState } from "react";
import Modal from "./Modal";
import { usePlaces } from "../hooks/usePlaces";

export default function Navbar() {
  const [mode, setMode] = useState<null | "import" | "add">(null);
  const [text, setText] = useState("");
  const loadCsv = usePlaces((s) => s.loadCsv);
  const addAddresses = usePlaces((s) => s.addAddresses);

  const save = async () => {
    try {
      if (mode === "import") {
        await loadCsv(text);
      } else if (mode === "add") {
        await addAddresses(text);
      }
      setText("");
      setMode(null);
    } catch (error) {
      console.error('Failed to save addresses:', error);
      alert('주소를 처리하는 중 오류가 발생했습니다.');
    }
  };

  return (
    <header className="bg-green-600 text-white flex justify-between px-4 py-2">
      <h1 className="font-bold">GrassGPS</h1>
      <div className="space-x-2">
        <button
          className="btn bg-white text-green-700"
          onClick={() => setMode("import")}
        >
          Import List
        </button>
        <button
          className="btn bg-white text-green-700"
          onClick={() => setMode("add")}
        >
          Add Addr
        </button>
      </div>

      {mode && (
        <Modal onClose={() => setMode(null)}>
          <h3 className="font-semibold mb-2">
            {mode === "import" ? "Import CSV/text" : "Add addresses"}
          </h3>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="주소를 한 줄에 하나씩 입력"
            className="border w-full h-40 p-1 text-sm mb-2"
          />
          <button 
            onClick={save} 
            className="btn w-full"
            disabled={!text.trim()}
          >
            Save
          </button>
        </Modal>
      )}
    </header>
  );
}
