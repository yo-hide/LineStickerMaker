
const stickers = [
    { id: 1, fileName: "01.png" },
    { id: 2, fileName: "02.png" },
    { id: 3, fileName: "03.png" },
    { id: 4, fileName: "04.png" }
];

const idToRemove = 2; // Remove "02.png"

console.log("Original:", stickers.map(s => s.fileName));

const filtered = stickers.filter(p => p.id !== idToRemove);
const result = filtered.map((img, index) => ({
    ...img,
    fileName: `${String(index + 1).padStart(2, "0")}.png`,
}));

console.log("Result:", result.map(s => s.fileName));

if (result[0].fileName === "01.png" && result[1].fileName === "02.png" && result[2].fileName === "03.png") {
    console.log("SUCCESS: filenames are sequential.");
} else {
    console.log("FAILURE: filenames are NOT sequential.");
}
