const { ERROR_LOG_LEVEL, INFO_LOG_LEVEL } = require("common/constant");
const { evaluateAlertFilter, buildAlertSearchQuery } = require("../internal/factory/alert");

describe("evaluateAlertFilter", () => {
    const log = {
        level: ERROR_LOG_LEVEL,
        context: { retries: 3, region: "ap-southeast-1" },
        data: { message: "connection reset by peer", tags: ["db", "slow"] },
    };

    it("fires when every filter matches", () => {
        expect(
            evaluateAlertFilter(log, [
                { field: "level", operator: "eq", value: ERROR_LOG_LEVEL },
                { field: "context.retries", operator: "gte", value: 3 },
                { field: "data.message", operator: "contains", value: "connection reset" },
            ])
        ).toBe(true);
    });

    it("does not fire when any filter fails", () => {
        expect(
            evaluateAlertFilter(log, [
                { field: "level", operator: "eq", value: ERROR_LOG_LEVEL },
                { field: "context.retries", operator: "gt", value: 10 },
            ])
        ).toBe(false);
    });

    it("does not fire on a level the filter excludes", () => {
        expect(
            evaluateAlertFilter({ ...log, level: INFO_LOG_LEVEL }, [
                { field: "level", operator: "in", value: [ERROR_LOG_LEVEL, "CRITICAL"] },
            ])
        ).toBe(false);
    });

    it("does not fire when the filtered field is absent from the log", () => {
        expect(
            evaluateAlertFilter(log, [{ field: "context.missing", operator: "eq", value: "x" }])
        ).toBe(false);
    });

    it("fires on an empty filter list, so an unfiltered alert matches everything", () => {
        expect(evaluateAlertFilter(log, [])).toBe(true);
    });

    it("matches array membership with contains", () => {
        expect(
            evaluateAlertFilter(log, [{ field: "data.tags", operator: "contains", value: "db" }])
        ).toBe(true);
        expect(
            evaluateAlertFilter(log, [{ field: "data.tags", operator: "contains", value: "cpu" }])
        ).toBe(false);
    });
});

describe("buildAlertSearchQuery", () => {
    it("returns an empty query with no params", () => {
        expect(buildAlertSearchQuery()).toEqual({});
        expect(buildAlertSearchQuery({})).toEqual({});
    });

    it("builds a case-insensitive title regex for search", () => {
        expect(buildAlertSearchQuery({ search: "timeout" })).toEqual({
            $or: [{ title: { $regex: "timeout", $options: "i" } }],
        });
    });

    it("ignores a non-string search term", () => {
        expect(buildAlertSearchQuery({ search: 42 })).toEqual({});
        expect(buildAlertSearchQuery({ search: "" })).toEqual({});
    });
});
