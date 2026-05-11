const selectedMonth = '2026-05';
const d = new Date(selectedMonth + '-01T12:00:00'); // Use noon to avoid TZ issues
d.setMonth(d.getMonth() + 1);
console.log('Next Month:', d.toISOString().slice(0, 7));

const d2 = new Date(selectedMonth + '-01T12:00:00');
d2.setMonth(d2.getMonth() - 1);
console.log('Prev Month:', d2.toISOString().slice(0, 7));
