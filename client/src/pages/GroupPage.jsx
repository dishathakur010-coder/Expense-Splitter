import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api";

function currentMonth() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

export default function GroupPage() {
    const { id } = useParams();
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const [group, setGroup] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [data, setData] = useState({ balances: [], settlements: [] });
    const [summary, setSummary] = useState(null);
    const [month, setMonth] = useState(currentMonth());
    const [error, setError] = useState("");

    const [memberEmail, setMemberEmail] = useState("");
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [paidBy, setPaidBy] = useState(user.id);
    const [splitAmong, setSplitAmong] = useState([]);

    async function loadAll() {
        try {
            const [g, e, b] = await Promise.all([
                api.get("/groups/" + id),
                api.get("/expenses/group/" + id),
                api.get("/balances/group/" + id),
            ]);
            setGroup(g.data);
            setExpenses(e.data);
            setData(b.data);
            setSplitAmong((prev) =>
                prev.length === 0 ? g.data.members.map((m) => m._id) : prev
            );
        } catch (err) {
            setError(err.response?.data?.message || "Could not load group");
        }
    }

    async function loadSummary() {
        try {
            const res = await api.get("/summary/group/" + id + "?month=" + month);
            setSummary(res.data);
        } catch (err) {
            setSummary(null);
        }
    }

    useEffect(() => {
        loadAll();
    }, [id]);

    useEffect(() => {
        loadSummary();
    }, [id, month, expenses]);

    async function addMember(e) {
        e.preventDefault();
        setError("");
        try {
            await api.post("/groups/" + id + "/members", { email: memberEmail });
            setMemberEmail("");
            setSplitAmong([]);
            loadAll();
        } catch (err) {
            setError(err.response?.data?.message || "Could not add member");
        }
    }

    function toggleSplit(memberId) {
        setSplitAmong((prev) =>
            prev.includes(memberId)
                ? prev.filter((x) => x !== memberId)
                : [...prev, memberId]
        );
    }

    async function addExpense(e) {
        e.preventDefault();
        setError("");
        if (splitAmong.length === 0) {
            setError("Pick at least one person to split with");
            return;
        }
        try {
            await api.post("/expenses", {
                groupId: id,
                description,
                amount: Number(amount),
                paidBy,
                splitAmong,
            });
            setDescription("");
            setAmount("");
            loadAll();
        } catch (err) {
            setError(err.response?.data?.message || "Could not add expense");
        }
    }

    async function deleteExpense(expenseId) {
        try {
            await api.delete("/expenses/" + expenseId);
            loadAll();
        } catch (err) {
            setError(err.response?.data?.message || "Could not delete");
        }
    }

    async function settle(s) {
        try {
            await api.post("/settlements", {
                groupId: id,
                from: s.from.id,
                to: s.to.id,
                amount: s.amount,
            });
            loadAll();
        } catch (err) {
            setError(err.response?.data?.message || "Could not settle");
        }
    }

    if (!group) {
        return (
            <div className="container">
                <Link to="/">Back</Link>
                {error ? <div className="error">{error}</div> : <p>Loading...</p>}
            </div>
        );
    }

    return (
        <div className="container">
            <Link to="/">&larr; Back to groups</Link>
            <h1>{group.name}</h1>

            {error && <div className="error">{error}</div>}

            <div className="card">
                <h3>Members</h3>
                <p>{group.members.map((m) => m.name).join(", ")}</p>
                <form onSubmit={addMember}>
                    <input
                        type="email"
                        placeholder="Friend's email"
                        value={memberEmail}
                        onChange={(e) => setMemberEmail(e.target.value)}
                        required
                    />
                    <button type="submit">Add member</button>
                </form>
            </div>

            <div className="card">
                <h3>Balances</h3>
                {data.balances.map((b) => (
                    <div className="row" key={b.user.id}>
                        <span>{b.user.name}</span>
                        <span style={{ color: b.balance >= 0 ? "#16a34a" : "#dc2626" }}>
                            {b.balance >= 0 ? "gets back " : "owes "}₹{Math.abs(b.balance)}
                        </span>
                    </div>
                ))}

                <h4>Who pays whom</h4>
                {data.settlements.length === 0 && <p>All settled up.</p>}
                {data.settlements.map((s, i) => (
                    <div className="row" key={i} style={{ marginBottom: 8 }}>
                        <span>
                            {s.from.name} pays {s.to.name} ₹{s.amount}
                        </span>
                        <button onClick={() => settle(s)}>Mark paid</button>
                    </div>
                ))}
            </div>

            <div className="card">
                <h3>Add expense</h3>
                <form onSubmit={addExpense}>
                    <input
                        placeholder="What was it for?"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                    />
                    <input
                        type="number"
                        placeholder="Amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                    />
                    <p>Paid by</p>
                    <select
                        value={paidBy}
                        onChange={(e) => setPaidBy(e.target.value)}
                        style={{ fontSize: 16, padding: 10, marginBottom: 10 }}
                    >
                        {group.members.map((m) => (
                            <option key={m._id} value={m._id}>
                                {m.name}
                            </option>
                        ))}
                    </select>
                    <p>Split between</p>
                    {group.members.map((m) => (
                        <label key={m._id} style={{ display: "block", marginBottom: 6 }}>
                            <input
                                type="checkbox"
                                checked={splitAmong.includes(m._id)}
                                onChange={() => toggleSplit(m._id)}
                                style={{ width: "auto", marginRight: 8 }}
                            />
                            {m.name}
                        </label>
                    ))}
                    <button type="submit">Add expense</button>
                </form>
            </div>

            <div className="card">
                <h3>Expenses</h3>
                {expenses.length === 0 && <p>No expenses yet.</p>}
                {expenses.map((e) => (
                    <div className="row" key={e._id} style={{ marginBottom: 8 }}>
                        <span>
                            {e.description} - ₹{e.amount}
                            <br />
                            <small>paid by {e.paidBy?.name}</small>
                        </span>
                        <button className="secondary" onClick={() => deleteExpense(e._id)}>
                            Delete
                        </button>
                    </div>
                ))}
            </div>

            <div className="card">
                <h3>Monthly summary</h3>
                <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                />
                {summary && (
                    <>
                        <p>
                            Total spent: <b>₹{summary.total}</b> ({summary.expenseCount}{" "}
                            expenses)
                        </p>
                        {summary.biggest && (
                            <p>
                                Biggest: {summary.biggest.description} - ₹
                                {summary.biggest.amount}
                            </p>
                        )}
                        {summary.perPerson.map((p) => (
                            <div className="row" key={p.id}>
                                <span>{p.name}</span>
                                <span>
                                    paid ₹{p.paid}, share ₹{p.share}
                                </span>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}