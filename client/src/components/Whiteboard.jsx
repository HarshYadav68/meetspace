import { useEffect, useRef, useState } from "react";
import { Canvas, Circle, PencilBrush, Rect } from "fabric";

const Whiteboard = ({ socket, roomId, open, onClose }) => {
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const syncingRef = useRef(false);
  const [color, setColor] = useState("#ffffff");

  useEffect(() => {
    if (!open || !canvasRef.current) return;
    const canvas = new Canvas(canvasRef.current, {
      isDrawingMode: true,
      width: window.innerWidth - 40,
      height: Math.min(500, window.innerHeight - 140)
    });
    const brush = new PencilBrush(canvas);
    brush.color = "#ffffff";
    brush.width = 2;
    canvas.freeDrawingBrush = brush;
    fabricRef.current = canvas;

    const onResize = () =>
      canvas.setDimensions({
        width: window.innerWidth - 40,
        height: Math.min(500, window.innerHeight - 140)
      });
    window.addEventListener("resize", onResize);

    const emitCanvas = () => {
      if (syncingRef.current) return;
      socket.emit("whiteboard-draw", { roomId, payload: canvas.toJSON() });
    };

    canvas.on("path:created", emitCanvas);
    canvas.on("object:added", emitCanvas);
    canvas.on("object:modified", emitCanvas);
    canvas.on("object:removed", emitCanvas);

    socket.on("whiteboard-draw", (payload) => {
      if (!fabricRef.current || !payload) return;
      syncingRef.current = true;
      fabricRef.current.loadFromJSON(payload).then(() => {
        fabricRef.current?.renderAll();
        syncingRef.current = false;
      });
    });
    socket.on("whiteboard-clear", () => {
      if (!fabricRef.current) return;
      fabricRef.current.clear();
      fabricRef.current.backgroundColor = "transparent";
      fabricRef.current.renderAll();
    });

    return () => {
      window.removeEventListener("resize", onResize);
      canvas.off("path:created", emitCanvas);
      canvas.off("object:added", emitCanvas);
      canvas.off("object:modified", emitCanvas);
      canvas.off("object:removed", emitCanvas);
      socket.off("whiteboard-draw");
      socket.off("whiteboard-clear");
      canvas.dispose();
    };
  }, [open, roomId, socket]);

  useEffect(() => {
    if (fabricRef.current?.freeDrawingBrush) {
      fabricRef.current.freeDrawingBrush.color = color;
      fabricRef.current.freeDrawingBrush.width = 2;
    }
  }, [color]);

  const addRect = () => {
    const rect = new Rect({ left: 60, top: 60, width: 120, height: 80, fill: "transparent", stroke: color, strokeWidth: 2 });
    fabricRef.current?.add(rect);
  };

  const addCircle = () => {
    const circle = new Circle({ left: 80, top: 80, radius: 40, fill: "transparent", stroke: color, strokeWidth: 2 });
    fabricRef.current?.add(circle);
  };

  const clearBoard = () => {
    fabricRef.current?.clear();
    socket.emit("whiteboard-clear", { roomId });
  };

  if (!open) return null;

  return (
    <div className="absolute inset-x-5 top-16 z-50 rounded-lg border border-slate-700 bg-slate-950 p-3">
      <div className="mb-3 flex flex-wrap gap-2">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        <button onClick={addRect} className="rounded bg-slate-800 px-2 py-1 text-xs">Rect</button>
        <button onClick={addCircle} className="rounded bg-slate-800 px-2 py-1 text-xs">Circle</button>
        <button
          onClick={() => {
            if (fabricRef.current?.freeDrawingBrush) {
              fabricRef.current.freeDrawingBrush.color = "#0f172a";
              fabricRef.current.freeDrawingBrush.width = 12;
            }
          }}
          className="rounded bg-slate-800 px-2 py-1 text-xs"
        >
          Eraser
        </button>
        <button onClick={clearBoard} className="rounded bg-red-600 px-2 py-1 text-xs">Clear</button>
        <button onClick={onClose} className="rounded bg-slate-700 px-2 py-1 text-xs">Close</button>
      </div>
      <canvas ref={canvasRef} className="w-full rounded border border-slate-700" />
    </div>
  );
};

export default Whiteboard;
