const { buildWebhookSearchQuery } = require("../internal/factory/webhook");

describe("buildWebhookSearchQuery", () => {
    it("returns an empty query with no params", () => {
        expect(buildWebhookSearchQuery()).toEqual({});
        expect(buildWebhookSearchQuery({})).toEqual({});
    });

    it("builds a case-insensitive title regex for search", () => {
        expect(buildWebhookSearchQuery({ search: "slack" })).toEqual({
            $or: [{ title: { $regex: "slack", $options: "i" } }],
        });
    });

    it("ignores a non-string or empty search term", () => {
        expect(buildWebhookSearchQuery({ search: 42 })).toEqual({});
        expect(buildWebhookSearchQuery({ search: "" })).toEqual({});
    });

    it("ignores unrelated params", () => {
        expect(buildWebhookSearchQuery({ enabled: true })).toEqual({});
    });
});
