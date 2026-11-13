require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("API running");
});

const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);
const groupRoutes = require("./routes/groups");
app.use("/api/groups", groupRoutes);
const expenseRoutes = require("./routes/expenses");
app.use("/api/expenses", expenseRoutes);
const balanceRoutes = require("./routes/balances");
app.use("/api/balances", balanceRoutes);
const settlementRoutes = require("./routes/settlements");
app.use("/api/settlements", settlementRoutes);
const summaryRoutes = require("./routes/summary");
app.use("/api/summary", summaryRoutes);
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log("DB connected");
        app.listen(process.env.PORT, () =>
            console.log("Server on port " + process.env.PORT)
        );
    })
    .catch((err) => console.log(err));