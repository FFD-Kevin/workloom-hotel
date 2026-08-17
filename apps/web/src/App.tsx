import { Route, Routes } from "react-router";
import P1 from "./pages/p1/P1";
import P2 from "./pages/p2/P2";
import P9 from "./pages/p9/P9";
import DevMatrix from "./pages/dev/DevMatrix";
import { Bridge } from "./shell/Bridge";

/** 阶段三路由：页面自包 Bridge（注入真实左右栏）；/dev 矩阵保持壳内平铺 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<P1 />} />
      <Route path="/p2/:threadId" element={<P2 />} />
      <Route path="/p9" element={<P9 />} />
      <Route path="/dev" element={<Bridge><DevMatrix /></Bridge>} />
      <Route path="*" element={<P1 />} />
    </Routes>
  );
}
