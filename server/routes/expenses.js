const express = require("express");
const Group = require("../models/Group");
const Expense = require("../models/Expense");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);

router.post("/", async (req, res) => {
    try {
        const { groupId, description, amount, paidBy, splitAmong } = req.body;

        const total = Number(amount);
        if (!description || !total || total <= 0) {
            return res.status(400).json({ message: "Description and a valid amount are required" });
        }

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });

        const memberIds = group.members.map((m) => m.toString());
        if (!memberIds.includes(req.userId)) {
            return res.status(403).json({ message: "Not a member" });
        }

        const payer = paidBy || req.userId;
        const people = splitAmong && splitAmong.length > 0 ? splitAmong : memberIds;

        if (!memberIds.includes(payer) || !people.every((p) => memberIds.includes(p))) {
            return res.status(400).json({ message: "Everyone must be a group member" });
        }

        const share = Math.floor((total / people.length) * 100) / 100;
        const splits = people.map((p) => ({ user: p, amount: share }));
        const leftover = Math.round((total - share * people.length) * 100) / 100;
        splits[0].amount = Math.round((splits[0].amount + leftover) * 100) / 100;

        const expense = await Expense.create({
            group: groupId,
            description,
            amount: total,
            paidBy: payer,
            splits,
        });

        res.json(expense);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get("/group/:groupId", async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });

        if (!group.members.map((m) => m.toString()).includes(req.userId)) {
            return res.status(403).json({ message: "Not a member" });
        }

        const expenses = await Expense.find({ group: req.params.groupId })
            .populate("paidBy", "name")
            .populate("splits.user", "name")
            .sort({ createdAt: -1 });

        res.json(expenses);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);
        if (!expense) return res.status(404).json({ message: "Expense not found" });

        const group = await Group.findById(expense.group);
        if (!group.members.map((m) => m.toString()).includes(req.userId)) {
            return res.status(403).json({ message: "Not a member" });
        }

        await expense.deleteOne();
        res.json({ message: "Deleted" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;