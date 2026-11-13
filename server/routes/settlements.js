const express = require("express");
const Group = require("../models/Group");
const Settlement = require("../models/Settlement");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);

router.post("/", async (req, res) => {
    try {
        const { groupId, from, to, amount } = req.body;
        const payer = from || req.userId;
        const value = Number(amount);

        if (!to || !value || value <= 0) {
            return res.status(400).json({ message: "Receiver and a valid amount are required" });
        }
        if (payer === to) {
            return res.status(400).json({ message: "Cannot pay yourself" });
        }

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });

        const memberIds = group.members.map((m) => m.toString());
        if (!memberIds.includes(req.userId)) {
            return res.status(403).json({ message: "Not a member" });
        }
        if (!memberIds.includes(payer) || !memberIds.includes(to)) {
            return res.status(400).json({ message: "Both people must be group members" });
        }

        const settlement = await Settlement.create({
            group: groupId,
            from: payer,
            to,
            amount: value,
        });

        res.json(settlement);
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

        const settlements = await Settlement.find({ group: req.params.groupId })
            .populate("from", "name")
            .populate("to", "name")
            .sort({ createdAt: -1 });

        res.json(settlements);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const settlement = await Settlement.findById(req.params.id);
        if (!settlement) return res.status(404).json({ message: "Settlement not found" });

        const group = await Group.findById(settlement.group);
        if (!group.members.map((m) => m.toString()).includes(req.userId)) {
            return res.status(403).json({ message: "Not a member" });
        }

        await settlement.deleteOne();
        res.json({ message: "Deleted" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;