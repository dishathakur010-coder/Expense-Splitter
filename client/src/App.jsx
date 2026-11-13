import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Groups from "./pages/Groups";
import GroupPage from "./pages/GroupPage";

function Private({ children }) {
  return localStorage.getItem("token") ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Private>
            <Groups />
          </Private>
        }
      />
      <Route
        path="/groups/:id"
        element={
          <Private>
            <GroupPage />
          </Private>
        }
      />
    </Routes>
  );
}