//@ts-check

const { INVALID_INPUT_ERR_CODE, INVALID_INPUT_ERR_MESSAGE } = require("../constant")
const { HttpError } = require("../function/error")
const { num2Floor, num2Ceil } = require("../function/number")
const { isObject, sanitizeObject, isArray } = require("../function/string")

const useRepository = ({
    Model,
    Mapper = (n) => n,
    ObjectIdValidator,
    decrypt = false
}) => {

    const create = async (payload, session = null) => {
        if (!isObject(payload)) throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_INPUT_ERR_MESSAGE)
        const options = session ? { session } : {}
        const raw = await Model.create([sanitizeObject(payload)], options)
        return Mapper(raw[0]?.toJSON())
    }

    const insertMany = async (payload, session = null) => {
        if (!isArray(payload)) throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_INPUT_ERR_MESSAGE)
        const options = session ? { session, ordered: true } : { ordered: false }
        const raw = await Model.create(payload, options)
        return raw?.map((n) => Mapper(n?.toJSON()))
    }


    const findById = async (id, session = null) => {
        if (!ObjectIdValidator(id)) throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_INPUT_ERR_MESSAGE)
        const query = Model.findById(id)
        if (session) query.session(session)
        const raw = await query
        return Mapper(raw?.toJSON())
    }


    const findOne = async (query, session = null) => {
        if (!isObject(query)) throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_INPUT_ERR_MESSAGE)
        const q = Model.findOne(query)
        if (session) q.session(session)
        const raw = await q
        return Mapper(raw?.toJSON())
    }


    const find = async (query, session = null) => {
        if (!isObject(query)) throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_INPUT_ERR_MESSAGE)
        const q = Model.find(query)
        if (session) q.session(session)
        const res = await q
        return res?.map((n) => Mapper(n?.toJSON()))
    }

    const distinct = async (field, query, session = null) => {
        if (!isObject(query)) throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_INPUT_ERR_MESSAGE)
        const q = Model.distinct(field, query)
        if (session) q.session(session)
        return q
    }


    const findByIdAndDelete = async (id, session = null) => {
        if (!ObjectIdValidator(id)) throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_INPUT_ERR_MESSAGE)
        const options = session ? { session } : {}
        await Model.findByIdAndDelete(id, options)
        return null
    }


    const deleteMany = async (query, session = null) => {
        if (!isObject(query)) throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_INPUT_ERR_MESSAGE)
        const options = session ? { session } : {}
        await Model.deleteMany(query, options)
        return null
    }


    const findByIdAndUpdate = async (id, payload, session = null) => {
        if (!ObjectIdValidator(id) || !isObject(payload)) throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_INPUT_ERR_MESSAGE)
        const options = session ? { new: true, session } : { new: true }
        const raw = await Model.findByIdAndUpdate(id, payload, options)
        return Mapper(raw?.toJSON())
    }


    const updateMany = async (query, payload, session = null) => {
        if (!isObject(query) || !isObject(payload)) throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_INPUT_ERR_MESSAGE)
        const options = session ? { session } : {}
        await Model.updateMany(query, payload, options)
        return null
    }

    const findOneAndUpdate = async (query, payload, session = null) => {
        if (!isObject(query) || !isObject(payload)) throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_INPUT_ERR_MESSAGE)
        const options = session ? { session, new: true } : { new: true }
        const raw = await Model.findOneAndUpdate(query, payload, options)
        return Mapper(raw?.toJSON())
    }

    const paginate = async (query, { sortBy, limit, page, session = null }) => {
        if (!isObject(query)) throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_INPUT_ERR_MESSAGE)
        page = num2Floor(page)
        limit = num2Floor(num2Ceil(limit))
        let list = await Model.paginate(query, { sortBy, limit, page, session })
        list.results = list?.results?.map((doc) => {
            if (decrypt) {
                const n = new Model(doc)
                n.decryptFieldsSync()
                return Mapper(n?.toJSON())
            }
            return Mapper(doc?.toJSON())
        })
        return list
    }



    const aggregate = async (pipeline, session = null) => {
        if (!isArray(pipeline)) throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_INPUT_ERR_MESSAGE)
        const agg = Model.aggregate(pipeline)
        if (session) agg.session(session)
        return agg
    }


    const aggregatePaginate = async (pipeline, options) => {
        if (!isArray(pipeline)) throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_INPUT_ERR_MESSAGE)
        const agg = Model.aggregate(pipeline)
        return Model.aggregatePaginate(agg, options)
    }

    const cursor = (query, session = null) => {
        if (!isObject(query)) throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_INPUT_ERR_MESSAGE)
        const q = Model.find(query)
        if (session) q.session(session)
        return q.cursor()
    }


    const count = async (query, session = null) => {
        if (!isObject(query)) throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_INPUT_ERR_MESSAGE)
        const options = session ? { session } : {}
        return Model.countDocuments(query, options)
    }

    const exists = async (query, session = null) => {
        if (!isObject(query)) throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_INPUT_ERR_MESSAGE)
        const options = session ? { session } : {}
        return Model.exists(query, options)
    }

    const upsert = async (query, payload, session = null) => {
        if (!isObject(query) || !isObject(payload)) throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_INPUT_ERR_MESSAGE)
        const options = session
            ? { new: true, upsert: true, session }
            : { new: true, upsert: true }
        const raw = await Model.findOneAndUpdate(query, payload, options)
        return Mapper(raw?.toJSON())
    }

    const bulkWrite = async (operations, session = null) => {
        if (!isArray(operations)) throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_INPUT_ERR_MESSAGE)
        const options = session ? { session } : {}
        return Model.bulkWrite(operations, options)
    }

    return {
        upsert,
        create,
        insert: create,
        insertMany,
        paginate,
        aggregate,
        cursor,
        count,
        exists,
        find,
        aggregatePaginate,
        distinct,
        findById,
        findOne,
        findByIdAndDelete,
        deleteMany,
        findByIdAndUpdate,
        updateMany,
        findOneAndUpdate,
        bulkWrite
    }
}

module.exports = { useRepository }