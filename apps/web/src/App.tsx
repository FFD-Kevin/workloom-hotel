import { Route, Routes } from "react-router";
import P1 from "./pages/p1/P1";
import DevMatrix from "./pages/dev/DevMatrix";
import { Bridge } from "./shell/Bridge";

/** 阶段三路由：P1 主甲板 + /dev 组件状态矩阵（F2）；P2–P9 在 F3–F11 逐页落地（总纲 §4） */
export default function App() {
  return (
    <Bridge>
      <Routes>
        <Route path="/" element={<P1 />} />
        <Route path="/dev" element={<DevMatrix />} />
        <Route path="*" element={<P1 />} />
      </Routes>
    </Bridge>
  );
}
