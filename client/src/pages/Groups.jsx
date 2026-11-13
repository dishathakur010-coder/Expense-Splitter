import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";

export default function Groups() {
    const [groups, setGroups] = useState([]);
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    async function loadGroups() {
        try {
            const res = await api.get("/groups");
            setGroups(res.data);
        } catch (err) {
            if (err.response?.status === 401) logout();
            else setError("Could not load groups");
        }
    }

    useEffect(() => {
        loadGroups();
    }, []);

    async function createGroup(e) {
        e.preventDefault();
        if (!name.trim()) return;
        try {
            await api.post("/groups", { name });
            setName("");
            loadGroups();
        } catch (err) {
            setError(err.response?.data?.message || "Could not create group");
        }
    }

    function logout() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
    }

    return (
        <div className="container">
            <div className="row">
                <h1>Hi, {user.name}</h1>
                <button className="secondary" onClick={logout}>
                    Logout
                </button>
            </div>

            {error && <div className="error">{error}</div>}

            <div className="card">
                <h3>Create a group</h3>
                <form onSubmit={createGroup}>
                    <input
                        placeholder="Group name (e.g. Room 204)"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <button type="submit">Create</button>
                </form>
            </div>

            <h3>Your groups</h3>
            {groups.length === 0 && <p>No groups yet.</p>}
            {groups.map((g) => (
                <div className="card" key={g._id}>
                    <Link to={"/groups/" + g._id}>{g.name}</Link>
                </div>
            ))}
        </div>
    );
}