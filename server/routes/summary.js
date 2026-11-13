const express = require("express");
const Group = require("../models/Group");
const Expense = require("../models/Expense");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);

const round = (n) => Math.round(n * 100) / 100;

router.get("/group/:groupId", async (req, res) => {
    try {
        const now = new Date();
        const month =
            req.query.month ||
            now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");

        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
            return res.status(400).json({ message: "Month must look like 2026-11" });
        }

        const [year, mon] = month.split("-").map(Number);
        const start = new Date(year, mon - 1, 1);
        const end = new Date(year, mon, 1);

        const group = await Group.findById(req.params.groupId).populate(
            "members",
            "name"
        );
        if (!group) return res.status(404).json({ message: "Group not found" });

        const memberIds = group.members.map((m) => m._id.toString());
        if (!memberIds.includes(req.userId)) {
            return res.status(403).json({ message: "Not a member" });
        }

        const expenses = await Expense.find({
            group: group._id,
            createdAt: { $gte: start, $lt: end },
        }).sort({ amount: -1 });

        const stats = {};
        group.members.forEach((m) => {
            stats[m._id.toString()] = { name: m.name, paid: 0, share: 0 };
        });

        let total = 0;
        expenses.forEach((e) => {
            total += e.amount;
            stats[e.paidBy.toString()].paid += e.amount;
            e.splits.forEach((s) => {
                stats[s.user.toString()].share += s.amount;
            });
        });

        const perPerson = Object.entries(stats).map(([id, s]) => ({
            id,
            name: s.name,
            paid: round(s.paid),
            share: round(s.share),
            net: round(s.paid - s.share),
        }));

        const biggest = expenses[0]
            ? { description: expenses[0].description, amount: expenses[0].amount }
            : null;

        res.json({
            month,
            total: round(total),
            expenseCount: expenses.length,
            biggest,
            perPerson,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;