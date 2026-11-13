const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
    {
        group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
        description: { type: String, required: true },
        amount: { type: Number, required: true },
        paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        splits: [
            {
                user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                amount: Number,
            },
        ],
    },
    { timestamps: true }
);

module.exports = mongoose.model("Expense", expenseSchema);