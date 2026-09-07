const {
    num2Float,
    num2Int,
    num2Floor,
    num2Ceil,
    sumFloat,
    sumInt,
} = require("../function/number");

describe("num2Float", () => {
    it("parses numeric input", () => {
        expect(num2Float("3.75")).toBe(3.75);
        expect(num2Float(3.75)).toBe(3.75);
    });

    it("falls back to 0 for non-numeric input", () => {
        expect(num2Float("abc")).toBe(0);
        expect(num2Float(undefined)).toBe(0);
    });

    it("falls back to 0 for inputs that coerce to 0 but don't parse (empty string, null, [])", () => {
        expect(num2Float("")).toBe(0);
        expect(num2Float(null)).toBe(0);
        expect(num2Float([])).toBe(0);
    });
});

describe("num2Int", () => {
    it("truncates towards zero", () => {
        expect(num2Int("10.9")).toBe(10);
        expect(num2Int(-10.9)).toBe(-10);
    });

    it("falls back to 0 for non-numeric input", () => {
        expect(num2Int("abc")).toBe(0);
        expect(num2Int(undefined)).toBe(0);
    });

    it("falls back to 0 for inputs that coerce to 0 but don't parse (empty string, null, [])", () => {
        expect(num2Int("")).toBe(0);
        expect(num2Int(null)).toBe(0);
        expect(num2Int([])).toBe(0);
    });
});

describe("num2Floor", () => {
    it("clamps up to the floor", () => {
        expect(num2Floor(0, 1)).toBe(1);
        expect(num2Floor(-5, 1)).toBe(1);
    });

    it("leaves values above the floor alone", () => {
        expect(num2Floor(7, 1)).toBe(7);
    });

    it("defaults the floor to 0", () => {
        expect(num2Floor(-3)).toBe(0);
    });
});

describe("num2Ceil", () => {
    it("clamps down to the ceiling", () => {
        expect(num2Ceil(500, 50)).toBe(50);
    });

    it("leaves values below the ceiling alone", () => {
        expect(num2Ceil(10, 50)).toBe(10);
    });

    it("defaults the ceiling to 50 (the pagination page size cap)", () => {
        expect(num2Ceil(999)).toBe(50);
    });
});

describe("sumFloat", () => {
    it("sums numeric strings and numbers", () => {
        expect(sumFloat([1.5, "2.25", 0.25])).toBe(4);
    });

    it("treats non-numeric entries as 0", () => {
        expect(sumFloat([1.5, "abc"])).toBe(1.5);
    });

    it("returns 0 for an empty list", () => {
        expect(sumFloat([])).toBe(0);
    });
});

describe("sumInt", () => {
    it("sums numeric strings and numbers", () => {
        expect(sumInt(["3", 4, 5.9])).toBe(12);
    });

    it("returns 0 for an empty list", () => {
        expect(sumInt([])).toBe(0);
    });
});
