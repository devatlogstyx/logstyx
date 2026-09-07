const { mapUser, mapUserInvitation } = require("../internal/utils/mapper");

describe("mapUser", () => {
    it("exposes only the public user fields", () => {
        const doc = {
            _id: { toString: () => "6512f0aa11bb22cc33dd44ee" },
            email: "ada@example.com",
            fullname: "Ada Lovelace",
            image: "https://cdn.example.com/ada.png",
            permissions: ["READ_PROJECT"],
            password: "$2a$10$hashed",
            hash: { email: "deadbeef" },
        };

        expect(mapUser(doc)).toEqual({
            id: "6512f0aa11bb22cc33dd44ee",
            email: "ada@example.com",
            fullname: "Ada Lovelace",
            image: "https://cdn.example.com/ada.png",
            permissions: ["READ_PROJECT"],
        });
    });

    it("prefers an already-serialized id over _id", () => {
        expect(mapUser({ id: "plain-id", _id: { toString: () => "object-id" } }).id).toBe(
            "plain-id"
        );
    });

    it("keeps the key set stable for a missing document", () => {
        expect(mapUser(undefined)).toEqual({
            id: undefined,
            email: undefined,
            fullname: undefined,
            image: undefined,
            permissions: undefined,
        });
    });
});

describe("mapUserInvitation", () => {
    it("exposes the invitation fields", () => {
        expect(
            mapUserInvitation({
                _id: { toString: () => "6512f0aa11bb22cc33dd44ee" },
                email: "new@example.com",
                permissions: ["READ_PROJECT"],
                projects: ["6512f0aa11bb22cc33dd4400"],
            })
        ).toEqual({
            id: "6512f0aa11bb22cc33dd44ee",
            email: "new@example.com",
            permissions: ["READ_PROJECT"],
            projects: ["6512f0aa11bb22cc33dd4400"],
        });
    });

    it("drops empty and missing fields (sanitizeObject)", () => {
        expect(
            mapUserInvitation({
                id: "abc",
                email: "new@example.com",
                permissions: [],
            })
        ).toEqual({
            id: "abc",
            email: "new@example.com",
        });
    });

    it("returns an empty object for a missing document", () => {
        expect(mapUserInvitation(undefined)).toEqual({});
    });
});
