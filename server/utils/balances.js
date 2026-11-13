const round = (n) => Math.round(n * 100) / 100;

function computeNet(expenses, memberIds, settlements = []) {
    const net = {};
    memberIds.forEach((id) => (net[id] = 0));

    expenses.forEach((e) => {
        const payer = e.paidBy.toString();
        net[payer] = round((net[payer] || 0) + e.amount);

        e.splits.forEach((s) => {
            const id = s.user.toString();
            net[id] = round((net[id] || 0) - s.amount);
        });
    });

    settlements.forEach((s) => {
        const from = s.from.toString();
        const to = s.to.toString();
        net[from] = round((net[from] || 0) + s.amount);
        net[to] = round((net[to] || 0) - s.amount);
    });

    return net;
}

function simplifyDebts(net) {
    const creditors = [];
    const debtors = [];

    Object.entries(net).forEach(([id, bal]) => {
        const v = round(bal);
        if (v > 0.01) creditors.push({ id, amount: v });
        else if (v < -0.01) debtors.push({ id, amount: -v });
    });

    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const result = [];
    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
        const pay = Math.min(debtors[i].amount, creditors[j].amount);

        result.push({ from: debtors[i].id, to: creditors[j].id, amount: round(pay) });

        debtors[i].amount = round(debtors[i].amount - pay);
        creditors[j].amount = round(creditors[j].amount - pay);

        if (debtors[i].amount < 0.01) i++;
        if (creditors[j].amount < 0.01) j++;
    }

    return result;
}

module.exports = { computeNet, simplifyDebts };