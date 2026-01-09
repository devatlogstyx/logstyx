module.exports = {
    FULL_PAYLOAD_DEDUPLICATION_STRATEGY: "FULL_PAYLOAD",
    INDEX_ONLY_DEDUPLICATION_STRATEGY: "INDEX_ONLY",
    NONE_DEDUPLICATION_STRATEGY: "NONE",

    ACTIVE_PROBE_STATUS: "ACTIVE",
    PAUSED_PROBE_STATUS: "PAUSED",

    BEARER_PROBE_AUTH_TYPE: "BEARER",
    BASIC_PROBE_AUTH_TYPE: "BASIC",
    PROBESTYX_PROBE_AUTH_TYPE: "PROBESTYX",
    HMAC_PROBE_AUTH_TYPE: "HMAC",
    NONE_PROBE_AUTH_TYPE: "NONE",
    CUSTOM_PROBE_AUTH_TYPE: "CUSTOM",

    PRIVATE_REPORT_VISIBILITY: "PRIVATE",
    PUBLIC_REPORT_VISIBILITY: "PUBLIC",
    UNLISTED_REPORT_VISIBILITY: "UNLISTED",

    PROBE_LOG_CONTEXT_SOURCE: "PROBE",

    WIDGET_TEMPLATES: {
        total_value: {
            name: "Total Value",
            description: "Display a single numeric value (count, sum, average, etc.)",
            icon: "FaHashtag",
            requiredConfig: ["operation"],
            optionalConfig: ["field", "filters", "timeRange"],
            operations: ["count", "sum", "avg", "min", "max", "latest", "first"]
        },
        line_chart: {
            name: "Line Chart",
            description: "Show trends over time",
            icon: "FaChartLine",
            requiredConfig: ["metric", "groupByTime"],
            optionalConfig: ["filters", "timeRange"]
        },
        bar_chart: {
            name: "Bar Chart",
            description: "Compare values across categories",
            icon: "FaChartBar",
            requiredConfig: ["metric", "groupBy"],
            optionalConfig: ["filters", "limit", "sortBy"]
        },
        table: {
            name: "Table",
            description: "Display log entries in a table",
            icon: "FaTable",
            requiredConfig: ["columns"],
            optionalConfig: ["filters", "limit", "sortBy"]
        },
        pie_chart: {
            name: "Pie Chart",
            description: "Show distribution of values",
            icon: "FaChartPie",
            requiredConfig: ["groupBy"],
            optionalConfig: ["filters", "limit"]
        }
    }

}