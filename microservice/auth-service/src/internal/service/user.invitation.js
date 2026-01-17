//@ts-check

const { INVALID_INPUT_ERR_CODE, EMAIL_PASSWORD_LOGIN_TYPE, NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE, WRITE_USER_INVITATION_USER_ROLE, NO_ACCESS_ERR_CODE, FORBIDDEN_ERR_CODE, INVALID_ID_ERR_MESSAGE } = require("common/constant");
const { HttpError, hashString, num2Ceil, num2Floor, sanitizeObject, encrypt } = require("common/function");
const { Validator } = require("node-input-validator");
const { default: striptags } = require("striptags");
const userInvitationModel = require("../model/user.invitation.model");
const userModel = require("../model/user.model");
const userLoginModel = require("../model/user.login.model");
const { mapUserInvitation, mapUser } = require("../utils/mapper");
const { mongoose, isValidObjectId } = require("../../shared/mongoose");
const bcrypt = require("bcryptjs");
const { listUsersProject } = require("../../shared/provider/core.service");
const { getUserFromCache } = require("../../shared/cache");
const { submitAddUserToProject } = require("../../shared/provider/mq-producer");
const { ObjectId } = mongoose.Types
/**
 * 
 * @param {object} params 
 * @param {string} params.email
 * @param {string[]} params.permissions
 * @param {string} [params.creator]
 * @param {string[]} [params.projects]
 */
const createUserInvitation = async (params) => {
    const v = new Validator(params, {
        email: "required|email",
        permissions: "required|arrayUnique",
        projects: "arrayUnique",
        creator: params.projects && params.projects.length > 0 ? "required|string" : "string"
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

    let payload = {
        email,
        permissions: params?.permissions,
        hash: {
            email: hashedEmail
        }
    }

    if (params?.projects && params.projects.length > 0 && params?.creator) {
        const creator = await getUserFromCache(params?.creator)
        if (!creator || !creator?.permissions?.includes(WRITE_USER_INVITATION_USER_ROLE)) {
            throw HttpError(INVALID_INPUT_ERR_CODE, `Unable to create invitation`)
        }

        const creatorsProjects = await listUsersProject(params?.creator)
        const creatorsProjectIds = new Set(creatorsProjects?.map(p => p.id) || []);

        const validProjects = params.projects.filter(id => creatorsProjectIds.has(id));
        payload.projects = validProjects.map(id => ObjectId.createFromHexString(id));

    }

    const raw = await userInvitationModel.create(payload)

    return mapUserInvitation(raw?.toJSON())

}

/**
 * 
 * @param {string} id 
 * @returns 
 */
const findInvitationById = async (id) => {

    if (!isValidObjectId(id)) {
        return null
    }

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
 * @param {string} [params.creator]
 * @param {string[]} [params.projects]
 */
const updateUserInvitation = async (id, params) => {

    if (!isValidObjectId(id)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_ID_ERR_MESSAGE)
    }

    const invitation = await userInvitationModel.findById(id)
    if (!invitation) {
        throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
    }

    const v = new Validator(params, {
        permissions: "required|arrayUnique",
        projects: "arrayUnique",
        creator: params.projects && params.projects.length > 0 ? "required|string" : "string"
    });

    let match = await v.check();
    if (!match) {
        throw HttpError(INVALID_INPUT_ERR_CODE, v.errors);
    }

    const updatePayload = {
        permissions: params.permissions
    };

    if (params?.projects && params?.projects?.length > 0) {
        if (!params.creator) {
            throw HttpError(INVALID_INPUT_ERR_CODE, "Creator required for project assignment");
        }

        const creator = await getUserFromCache(params.creator);
        if (!creator) {
            throw HttpError(INVALID_INPUT_ERR_CODE, "Creator not found");
        }

        if (!creator.permissions?.includes(WRITE_USER_INVITATION_USER_ROLE)) {
            throw HttpError(FORBIDDEN_ERR_CODE, "Insufficient permissions");
        }

        const creatorsProjects = await listUsersProject(params.creator);
        const creatorsProjectIds = new Set(creatorsProjects?.map(p => p.id) || []);

        const validProjects = params.projects.filter(id => creatorsProjectIds.has(id));

        if (validProjects.length === 0) {
            throw HttpError(INVALID_INPUT_ERR_CODE, "No valid projects provided");
        }

        updatePayload.projects = validProjects.map(id => ObjectId.createFromHexString(id));
    } else {
        updatePayload.projects = []
    }

    const raw = await userInvitationModel.findByIdAndUpdate(id, {
        $set: updatePayload
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

    if (!isValidObjectId(id)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_ID_ERR_MESSAGE)
    }

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
    if (params?.search && typeof params.search === "string") {
        query.$or = [
            {
                "hash.email": hashString(params?.search)
            }
        ]
    }

    if (params?.permissions && typeof params?.permissions === "string") {
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

    if (!isValidObjectId(id)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_ID_ERR_MESSAGE)
    }

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
    const session = await mongoose.startSession();
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

        await userInvitationModel.findByIdAndDelete(id).session(session)

        await session.commitTransaction();

        await Promise.all(invitation?.projects?.map((n) => {
            submitAddUserToProject({
                userId: newUser._id?.toString(),
                projectId: n?.toString()
            })
        }))

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