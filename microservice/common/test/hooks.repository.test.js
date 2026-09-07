const { useRepository } = require("../hooks/repository");
const { INVALID_INPUT_ERR_CODE, INVALID_INPUT_ERR_MESSAGE } = require("../constant");

const VALID_ID = "6512f0aa11bb22cc33dd44ee";
const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(String(id ?? ""));

/** A mongoose document stand-in: only toJSON is ever called on it. */
const doc = (json) => ({ toJSON: () => json });

/** A chainable query stand-in that also records whether .session() was used. */
const query = (resolved) => {
    const q = Promise.resolve(resolved);
    q.session = jest.fn(() => q);
    q.cursor = jest.fn(() => "cursor-handle");
    return q;
};

const makeModel = () => ({
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    distinct: jest.fn(),
    findByIdAndDelete: jest.fn(),
    deleteMany: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    updateMany: jest.fn(),
    findOneAndUpdate: jest.fn(),
    paginate: jest.fn(),
    aggregate: jest.fn(),
    aggregatePaginate: jest.fn(),
    countDocuments: jest.fn(),
    exists: jest.fn(),
    bulkWrite: jest.fn(),
});

const badInput = { error: INVALID_INPUT_ERR_CODE, message: INVALID_INPUT_ERR_MESSAGE };

let Model;
let repo;

beforeEach(() => {
    Model = makeModel();
    repo = useRepository({ Model, ObjectIdValidator: isValidObjectId });
});

describe("create", () => {
    it("strips empty fields before writing and maps the result", async () => {
        Model.create.mockResolvedValue([doc({ _id: VALID_ID, title: "Errors" })]);

        await expect(repo.create({ title: "Errors", note: "", tags: [] })).resolves.toEqual({
            _id: VALID_ID,
            title: "Errors",
        });
        expect(Model.create).toHaveBeenCalledWith([{ title: "Errors" }], {});
    });

    it("threads a session through when given one", async () => {
        Model.create.mockResolvedValue([doc({ _id: VALID_ID })]);
        const session = { id: "s1" };

        await repo.create({ title: "Errors" }, session);

        expect(Model.create).toHaveBeenCalledWith([{ title: "Errors" }], { session });
    });

    it("applies the mapper", async () => {
        Model.create.mockResolvedValue([doc({ _id: VALID_ID, title: "Errors", secret: "s" })]);
        const mapped = useRepository({
            Model,
            ObjectIdValidator: isValidObjectId,
            Mapper: (n) => ({ id: n._id, title: n.title }),
        });

        await expect(mapped.create({ title: "Errors" })).resolves.toEqual({
            id: VALID_ID,
            title: "Errors",
        });
    });

    it("rejects a non-object payload", async () => {
        for (const bad of [undefined, null, "string", 7, []]) {
            await expect(repo.create(bad)).rejects.toMatchObject(badInput);
        }
        expect(Model.create).not.toHaveBeenCalled();
    });

    it("is aliased as insert", () => {
        expect(repo.insert).toBe(repo.create);
    });
});

describe("insertMany", () => {
    it("writes unordered without a session", async () => {
        Model.create.mockResolvedValue([doc({ _id: "1" }), doc({ _id: "2" })]);

        await expect(repo.insertMany([{ a: 1 }, { a: 2 }])).resolves.toEqual([
            { _id: "1" },
            { _id: "2" },
        ]);
        expect(Model.create).toHaveBeenCalledWith([{ a: 1 }, { a: 2 }], { ordered: false });
    });

    it("writes ordered inside a session", async () => {
        Model.create.mockResolvedValue([]);
        const session = { id: "s1" };

        await repo.insertMany([{ a: 1 }], session);

        expect(Model.create).toHaveBeenCalledWith([{ a: 1 }], { session, ordered: true });
    });

    it("rejects a non-array payload", async () => {
        await expect(repo.insertMany({ a: 1 })).rejects.toMatchObject(badInput);
    });
});

describe("findById", () => {
    it("maps the document", async () => {
        Model.findById.mockReturnValue(query(doc({ _id: VALID_ID, title: "Errors" })));

        await expect(repo.findById(VALID_ID)).resolves.toEqual({
            _id: VALID_ID,
            title: "Errors",
        });
    });

    it("resolves undefined when nothing is found", async () => {
        Model.findById.mockReturnValue(query(null));
        await expect(repo.findById(VALID_ID)).resolves.toBeUndefined();
    });

    it("binds the session onto the query", async () => {
        const q = query(doc({ _id: VALID_ID }));
        Model.findById.mockReturnValue(q);
        const session = { id: "s1" };

        await repo.findById(VALID_ID, session);

        expect(q.session).toHaveBeenCalledWith(session);
    });

    it("rejects a malformed id without touching the model", async () => {
        await expect(repo.findById("nope")).rejects.toMatchObject(badInput);
        expect(Model.findById).not.toHaveBeenCalled();
    });
});

describe("findOne / find", () => {
    it("maps a single document", async () => {
        Model.findOne.mockReturnValue(query(doc({ _id: VALID_ID })));
        await expect(repo.findOne({ title: "Errors" })).resolves.toEqual({ _id: VALID_ID });
    });

    it("maps every document in a list", async () => {
        Model.find.mockReturnValue(query([doc({ _id: "1" }), doc({ _id: "2" })]));
        await expect(repo.find({})).resolves.toEqual([{ _id: "1" }, { _id: "2" }]);
    });

    it("rejects a non-object query", async () => {
        await expect(repo.findOne("title")).rejects.toMatchObject(badInput);
        await expect(repo.find([])).rejects.toMatchObject(badInput);
    });
});

describe("findByIdAndUpdate", () => {
    it("always asks for the updated document", async () => {
        Model.findByIdAndUpdate.mockResolvedValue(doc({ _id: VALID_ID, title: "New" }));

        await expect(repo.findByIdAndUpdate(VALID_ID, { $set: { title: "New" } })).resolves.toEqual({
            _id: VALID_ID,
            title: "New",
        });
        expect(Model.findByIdAndUpdate).toHaveBeenCalledWith(
            VALID_ID,
            { $set: { title: "New" } },
            { new: true }
        );
    });

    it("rejects a malformed id or a non-object payload", async () => {
        await expect(repo.findByIdAndUpdate("nope", { a: 1 })).rejects.toMatchObject(badInput);
        await expect(repo.findByIdAndUpdate(VALID_ID, "a")).rejects.toMatchObject(badInput);
    });
});

describe("upsert", () => {
    it("asks for an upsert returning the new document", async () => {
        Model.findOneAndUpdate.mockResolvedValue(doc({ _id: VALID_ID }));

        await repo.upsert({ key: "k" }, { $set: { count: 1 } });

        expect(Model.findOneAndUpdate).toHaveBeenCalledWith(
            { key: "k" },
            { $set: { count: 1 } },
            { new: true, upsert: true }
        );
    });
});

describe("delete helpers", () => {
    it("findByIdAndDelete resolves null", async () => {
        Model.findByIdAndDelete.mockResolvedValue(doc({}));
        await expect(repo.findByIdAndDelete(VALID_ID)).resolves.toBeNull();
        expect(Model.findByIdAndDelete).toHaveBeenCalledWith(VALID_ID, {});
    });

    it("deleteMany resolves null", async () => {
        Model.deleteMany.mockResolvedValue({ deletedCount: 3 });
        await expect(repo.deleteMany({ level: "INFO" })).resolves.toBeNull();
    });

    it("rejects a malformed id and a non-object query", async () => {
        await expect(repo.findByIdAndDelete("nope")).rejects.toMatchObject(badInput);
        await expect(repo.deleteMany("level")).rejects.toMatchObject(badInput);
    });
});

describe("paginate", () => {
    it("caps limit at 50 so a caller cannot ask for an unbounded page", async () => {
        Model.paginate.mockResolvedValue({ results: [], totalResults: 0 });

        await repo.paginate({}, { sortBy: "createdAt:desc", limit: 999, page: 2 });

        expect(Model.paginate).toHaveBeenCalledWith(
            {},
            { sortBy: "createdAt:desc", limit: 50, page: 2, session: null }
        );
    });

    it("floors a negative page and limit at 1", async () => {
        Model.paginate.mockResolvedValue({ results: [] });

        await repo.paginate({}, { limit: -10, page: -5 });

        expect(Model.paginate).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ limit: 1, page: 1 })
        );
    });

    it("keeps a limit already inside the window", async () => {
        Model.paginate.mockResolvedValue({ results: [] });

        await repo.paginate({}, { limit: 25, page: 3 });

        expect(Model.paginate).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ limit: 25, page: 3 })
        );
    });

    it("maps each result and leaves the envelope intact", async () => {
        Model.paginate.mockResolvedValue({
            results: [doc({ _id: "1" }), doc({ _id: "2" })],
            totalResults: 2,
            totalPages: 1,
        });

        await expect(repo.paginate({}, { limit: 10, page: 1 })).resolves.toEqual({
            results: [{ _id: "1" }, { _id: "2" }],
            totalResults: 2,
            totalPages: 1,
        });
    });

    it("decrypts encrypted fields when the repository is built with decrypt", async () => {
        const decryptFieldsSync = jest.fn();
        const EncryptedModel = function (source) {
            this.decryptFieldsSync = decryptFieldsSync;
            this.toJSON = () => ({ ...source, decrypted: true });
        };
        EncryptedModel.paginate = jest.fn().mockResolvedValue({ results: [{ _id: "1" }] });

        const encryptedRepo = useRepository({
            Model: EncryptedModel,
            ObjectIdValidator: isValidObjectId,
            decrypt: true,
        });

        await expect(encryptedRepo.paginate({}, { limit: 10, page: 1 })).resolves.toEqual({
            results: [{ _id: "1", decrypted: true }],
        });
        expect(decryptFieldsSync).toHaveBeenCalledTimes(1);
    });

    it("rejects a non-object query", async () => {
        await expect(repo.paginate("q", { limit: 10, page: 1 })).rejects.toMatchObject(badInput);
    });
});

describe("aggregate helpers", () => {
    it("aggregate passes the pipeline through", async () => {
        Model.aggregate.mockReturnValue(query(["row"]));
        await expect(repo.aggregate([{ $match: {} }])).resolves.toEqual(["row"]);
    });

    it("aggregatePaginate feeds the aggregation into the paginator", async () => {
        const agg = query([]);
        Model.aggregate.mockReturnValue(agg);
        Model.aggregatePaginate.mockResolvedValue({ docs: [] });

        await repo.aggregatePaginate([{ $match: {} }], { page: 1, limit: 10 });

        expect(Model.aggregatePaginate).toHaveBeenCalledWith(agg, { page: 1, limit: 10 });
    });

    it("rejects a non-array pipeline", async () => {
        await expect(repo.aggregate({ $match: {} })).rejects.toMatchObject(badInput);
        await expect(repo.aggregatePaginate({}, {})).rejects.toMatchObject(badInput);
    });
});

describe("cursor", () => {
    it("returns a cursor over the query", () => {
        const q = query([]);
        Model.find.mockReturnValue(q);

        expect(repo.cursor({ level: "ERROR" })).toBe("cursor-handle");
        expect(Model.find).toHaveBeenCalledWith({ level: "ERROR" });
    });

    it("throws synchronously on a non-object query", () => {
        expect(() => repo.cursor("level")).toThrow(INVALID_INPUT_ERR_MESSAGE);
    });
});

describe("count / exists / distinct / bulkWrite", () => {
    it("count forwards to countDocuments", async () => {
        Model.countDocuments.mockResolvedValue(7);
        await expect(repo.count({ level: "ERROR" })).resolves.toBe(7);
        expect(Model.countDocuments).toHaveBeenCalledWith({ level: "ERROR" }, {});
    });

    it("exists forwards to exists", async () => {
        Model.exists.mockResolvedValue({ _id: VALID_ID });
        await expect(repo.exists({ key: "k" })).resolves.toEqual({ _id: VALID_ID });
    });

    it("distinct forwards field and query", async () => {
        Model.distinct.mockReturnValue(query(["a", "b"]));
        await expect(repo.distinct("level", {})).resolves.toEqual(["a", "b"]);
        expect(Model.distinct).toHaveBeenCalledWith("level", {});
    });

    it("bulkWrite forwards the operations", async () => {
        Model.bulkWrite.mockResolvedValue({ nModified: 2 });
        const ops = [{ updateOne: {} }];

        await expect(repo.bulkWrite(ops)).resolves.toEqual({ nModified: 2 });
        expect(Model.bulkWrite).toHaveBeenCalledWith(ops, {});
    });

    it("rejects malformed input", async () => {
        await expect(repo.count("q")).rejects.toMatchObject(badInput);
        await expect(repo.exists("q")).rejects.toMatchObject(badInput);
        await expect(repo.distinct("level", "q")).rejects.toMatchObject(badInput);
        await expect(repo.bulkWrite({})).rejects.toMatchObject(badInput);
    });
});
