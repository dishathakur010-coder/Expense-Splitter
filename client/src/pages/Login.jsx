import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function Login() {
    const [isRegister, setIsRegister] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        try {
            if (isRegister) {
                await api.post("/auth/register", { name, email, password });
            }
            const res = await api.post("/auth/login", { email, password });
            localStorage.setItem("token", res.data.token);
            localStorage.setItem("user", JSON.stringify(res.data.user));
            navigate("/");
        } catch (err) {
            setError(err.response?.data?.message || "Something went wrong");
        }
    }

    return (
        <div className="container">
            <h1>Expense Splitter</h1>
            <div className="card">
                <h2>{isRegister ? "Register" : "Login"}</h2>
                {error && <div className="error">{error}</div>}
                <form onSubmit={handleSubmit}>
                    {isRegister && (
                        <input
                            placeholder="Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    )}
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button type="submit">{isRegister ? "Register" : "Login"}</button>
                </form>
                <p>
                    {isRegister ? "Already have an account? " : "New here? "}
                    <a href="#" onClick={(e) => { e.preventDefault(); setIsRegister(!isRegister); }}>
                        {isRegister ? "Login" : "Register"}
                    </a>
                </p>
            </div>
        </div>
    );
}