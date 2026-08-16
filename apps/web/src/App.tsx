import { Route, Routes } from "react-router";
import P1 from "./pages/p1/P1";
import { Bridge } from "./shell/Bridge";

/** A6 壳：仅 P1；P2–P9 与 /dev 状态矩阵在阶段三逐页落地（总纲 §4 F3–F11） */
export default function App() {
  return (
    <Bridge>
      <Routes>
        <Route path="/" element={<P1 />} />
        <Route path="*" element={<P1 />} />
      </Routes>
    </Bridge>
  );
}
