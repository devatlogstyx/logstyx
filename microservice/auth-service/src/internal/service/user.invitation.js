//@ts-check

const { INVALID_INPUT_ERR_CODE, EMAIL_PASSWORD_LOGIN_TYPE, NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE } = require("common/constant");
const { HttpError, hashString, num2Ceil, num2Floor, sanitizeObject, encrypt } = require("common/function");
const { Validator } = require("node-input-validator");
const { default: striptags } = require("striptags");
const userInvitationModel = require("../model/user.invitation.model");
const userModel = require("../model/user.model");
const userLoginModel = require("../model/user.login.model");
const { mapUserInvitation, mapUser } = require("../utils/mapper");
const { mongoose } = require("../../shared/mongoose");
const bcrypt = require("bcryptjs")

/**
 * 
 * @param {object} params 
 * @param {string} params.email
 * @param {string[]} params.permissions
 */
const createUserInvitation = async (params) => {
    const v = new Validator(params, {
        email: "required|email",
        permissions: "required|arrayUnique"
    });

    let match = await v.check();
    if (!match) {
        throw HttpError(INVALID_INPUT_ERR_CODE, v.errors);
    }

    let email = striptags(params.email.toString()).trim().toLowerCase();

    const hashedEmail = hashString(email)

    const [invitation, user, login] = await Promise.all([
        userInvitationModel.findOne({
            "hash.email": hashedEmail
        }),
        userModel.findOne({
            "hash.email": hashedEmail
        }),
        userLoginModel.findOne({
            "hash.key": hashedEmail,
            type: EMAIL_PASSWORD_LOGIN_TYPE
        })
    ])

    if (invitation || user || login) {
        throw HttpError(INVALID_INPUT_ERR_CODE, `Unable to create invitation`)
    }

    const raw = await userInvitationModel.create({
        email,
        permissions: params?.permissions,
        hash: {
            email: hashedEmail
        }
    })

    return mapUserInvitation(raw?.toJSON())

}

/**
 * 
 * @param {string} id 
 * @returns 
 */
const findInvitationById = async (id) => {

    const raw = await userInvitationModel.findById(id)
    if (!raw) {
        return null
    }

    return mapUserInvitation(raw?.toJSON())

}

/**
 * @param {string} id
 * @param {object} params 
 * @param {string[]} params.permissions
 */
const updateUserInvitation = async (id, params) => {

    const invitation = await userInvitationModel.findById(id)
    if (!invitation) {
        throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
    }

    const v = new Validator(params, {
        permissions: "required|arrayUnique"
    });

    let match = await v.check();
    if (!match) {
        throw HttpError(INVALID_INPUT_ERR_CODE, v.errors);
    }


    const raw = await userInvitationModel.findByIdAndUpdate(id, {
        $set: {
            permissions: params?.permissions
        }
    }, {
        new: true,
        runValidators: true
    })

    return mapUserInvitation(raw?.toJSON())

}

/**
 * 
 * @param {string} id 
 * @returns 
 */
const removeUserInvitation = async (id) => {

    const invitation = await userInvitationModel.findById(id)
    if (!invitation) {
        throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
    }


    await userInvitationModel.findByIdAndDelete(id)

    return null

}
/**
 * 
 * @param {object} [params] 
 * @param {string} [params.search]
 * @param {string} [params.permissions]
 * @returns 
 */
const buildUserInvitationSearchQuery = (params) => {
    let query = {}
    if (params?.search) {
        query.$or = [
            {
                "hash.email": hashString(params?.search)
            }
        ]
    }

    if (params?.permissions) {
        query.permissions = {
            $in: params?.permissions?.split(",")
        }
    }

    return query
}

const paginateUserInvitation = async (query = {}, sortBy = "createdAt:desc", limit = 10, page = 1) => {

    const queryParams = buildUserInvitationSearchQuery(query)
    limit = num2Ceil(num2Floor(limit, 1), 50)
    page = num2Floor(page, 1)


    let list = await userInvitationModel.paginate(queryParams, { sortBy, limit, page });

    list.results = list?.results?.map((/** @type {any} */ doc) => {
        let n = new userInvitationModel(doc);
        n.decryptFieldsSync();
        return mapUserInvitation(n?.toJSON())
    })

    return list

}

/**
 * 
 * @param {string} id 
 * @param {object} params 
 * @param {string} params.fullname
 * @param {string} params.email
 * @param {string} params.password
 */
const validateUserInvitation = async (id, params) => {
    const invitation = await userInvitationModel.findById(id)
    if (!invitation) {
        throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
    }

    const v = new Validator(params, {
        fullname: "required|string",
        email: "required|email",
        password: "required|string",
    });

    let match = await v.check();
    if (!match) {
        throw HttpError(INVALID_INPUT_ERR_CODE, v.errors);
    }

    if (invitation?.email !== params?.email) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_INPUT_ERR_CODE);
    }

    let email = striptags(params.email.toString()).trim().toLowerCase();

    const hashedEmail = hashString(email);

    // Check if user already exists
    let user = await userModel.findOne({ 'hash.email': hashedEmail });

    if (user) {
        await userInvitationModel.findByIdAndDelete(id)
        throw HttpError(INVALID_INPUT_ERR_CODE, `already registered`)
    }

    // Create user if doesn't exist
    const session = await mongoose.connection.startSession();
    session.startTransaction();

    try {
        const [newUser] = await userModel.create([sanitizeObject({
            fullname: striptags(params?.fullname),
            email,
            permissions: invitation?.permissions,
            hash: { email: hashedEmail }
        })], { session });

        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(params?.password, salt);

        await userLoginModel.create([{
            user: newUser._id,
            key: params?.email,
            type: EMAIL_PASSWORD_LOGIN_TYPE,
            credentials: encrypt(JSON.stringify({ password: hash })),
            hash: { key: hashedEmail }
        }], { session });

        await userInvitationModel.findByIdAndDelete(id).session({ session })

        await session.commitTransaction();
        return mapUser(newUser?.toJSON())

    } catch (e) {
        await session.abortTransaction();
        throw e;
    } finally {
        await session.endSession();
    }


}

module.exports = {
    createUserInvitation,
    findInvitationById,
    updateUserInvitation,
    removeUserInvitation,
    paginateUserInvitation,
    validateUserInvitation
}