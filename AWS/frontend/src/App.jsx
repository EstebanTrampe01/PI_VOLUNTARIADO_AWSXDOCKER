import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Management from "./pages/Management";
import Console from "./pages/Console";
import FileManagement from "./pages/FileManagement";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/management" element={<Management />} />
        <Route path="/console" element={<Console />} />
        <Route path="/file-management" element={<FileManagement />} />
      </Routes>
    </Router>
  );
}

export default App;
