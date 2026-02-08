//@ts-check

const { HttpError, hashString, num2Ceil, num2Floor, sanitizeObject, encrypt, decryptSecret, createSlug, parseSortBy, sanitizeEmail } = require("common/function")
const { getUserFromCache, updateUserCache } = require("../../shared/cache")
const { mapUser, } = require("../utils/mapper")
const { Validator } = require("node-input-validator")
const {
    INVALID_INPUT_ERR_CODE,
    EMAIL_PASSWORD_LOGIN_TYPE,
    INVALID_EMAIL_PASSWORD_ERR_MESSAGE,
    USER_CACHE_KEY,
    USER_LOGIN_CACHE_KEY,
    NOT_FOUND_ERR_CODE,
    NOT_FOUND_ERR_MESSAGE,
    WRITE_USER_USER_ROLE,
    READ_USER_USER_ROLE,
    WRITE_PROJECT_USER_ROLE,
    READ_PROJECT_USER_ROLE,
    WRITE_USER_INVITATION_USER_ROLE,
    READ_USER_INVITATION_USER_ROLE,
    INVALID_ID_ERR_MESSAGE,
    READ_REPORT_USER_ROLE,
    WRITE_REPORT_USER_ROLE,
    WRITE_WEBHOOK_USER_ROLE,
    READ_WEBHOOK_USER_ROLE,
    WRITE_BUCKET_USER_ROLE,
    WRITE_ALERT_USER_ROLE,
    READ_ALERT_USER_ROLE,
    READ_BUCKET_USER_ROLE,
    FORBIDDEN_ERR_CODE,
    NO_ACCESS_ERR_MESSAGE
} = require("common/constant")

const { striptags } = require("striptags")
const userLoginModel = require("../model/user.login.model")
const { submitRemoveCache, submitCreateProject, fanoutOnUserRemoved } = require("../../shared/provider/mq-producer")

const { mongoose, isValidObjectId } = require("../../shared/mongoose")
const userModel = require("../model/user.model")
const { verifyUserPassword } = require("../utils/helper")

const { ObjectId } = mongoose.Types
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")

const USER_AUTHENTICATION_JWT_SECRET = decryptSecret(process?.env?.ENC_USER_AUTHENTICATION_JWT_SECRET)

const USER_NAME = decryptSecret(process.env.ENC_USER_NAME)
const USER_EMAIL = decryptSecret(process.env.ENC_USER_EMAIL)
const USER_PASSWORD = decryptSecret(process.env.ENC_USER_PASSWORD)


/**
 * 
 * @param {string} id 
 * @returns 
 */
const findUserById = async (id,) => {

    if (!isValidObjectId(id)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_ID_ERR_MESSAGE)
    }

    const user = await getUserFromCache(id)
    if (!id) {
        return null
    }

    return user
}

/**
 * 
 * @param {object} params
 * @param {string} params.email 
 * @param {string} params.password
 * @param {*} params.lastLogin
 * @returns 
 */
const loginUserWithEmailPassword = async (params) => {

    const v = new Validator(params, {
        email: "required|email",
        password: "required|string"
    });

    let match = await v.check();
    if (!match) {
        throw HttpError(INVALID_INPUT_ERR_CODE, v.errors);
    }

    let email = striptags(params.email.toString()).trim().toLowerCase();
    const hashedEmail = hashString(email)
    const login = await userLoginModel.findOne({
        "hash.key": hashedEmail,
        type: EMAIL_PASSWORD_LOGIN_TYPE
    });

    if (!login) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_EMAIL_PASSWORD_ERR_MESSAGE);
    }

    const user = await getUserFromCache(login?.user?.toString())
    if (!user) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_EMAIL_PASSWORD_ERR_MESSAGE);
    }

    const isValid = await verifyUserPassword(login?.credentials, params?.password)
    if (!isValid) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_EMAIL_PASSWORD_ERR_MESSAGE);
    }

    await userLoginModel.findByIdAndUpdate(login?._id, {
        $set: {
            lastLogin: params?.lastLogin
        }
    })

    return user

}

/**
 * 
 * @param {object} params 
 * @param {string} params.email 
 * @param {string} params.password
 * @param {string} params.type
 * @returns 
 */
const handleUserLogin = async (params) => {
    if (params?.type === EMAIL_PASSWORD_LOGIN_TYPE) {
        return loginUserWithEmailPassword(params)
    }

    throw HttpError(INVALID_INPUT_ERR_CODE, `Unknown command`)
}

/**
 * 
 * @param {object} [params]
 * @param {string} [params.search]
 * @param {string} [params.group]
 * @returns 
 */
const buildUserSearchQuery = (params = {}) => {

    let query = {}
    if (params?.search && typeof params.search === "string") {
        query.$or = [
            {
                fullname: {
                    $regex: params?.search?.toString(),
                    $options: "i"
                }
            }
        ]
    }

    if (params?.group && isValidObjectId(params?.group)) {
        query.group = ObjectId.createFromHexString(params?.group?.toString())
    }

    return query

}

const paginateUser = async (query = {}, sortBy = "createdAt:desc", limit = 10, page = 1) => {

    const queryParams = buildUserSearchQuery(query)
    limit = num2Ceil(num2Floor(limit, 1), 50)
    page = num2Floor(page, 1)

    const sort = parseSortBy(sortBy)

    const aggregate = userModel.aggregate([
        {
            $match: queryParams
        },
        {
            $lookup: {
                from: 'userlogins',
                let: { userId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ['$user', '$$userId'] }
                        }
                    },
                    {
                        $sort: { "lastLogin.at": -1 }
                    },
                    {
                        $limit: 1
                    }
                ],
                as: 'userlogin'
            }
        },
        {
            $unwind: {
                path: '$userlogin',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $sort: {
                ...sort
            }
        }

    ])

    let res = await userModel.aggregatePaginate(aggregate, { limit, page });

    let list = {
        results: res?.docs?.map((doc) => {
            let n = userModel.hydrate(doc);
            n.decryptFieldsSync();
            return {
                ...mapUser(n.toObject()),
                lastLogin: doc?.userlogin?.lastLogin
            }
        }),
        page,
        totalResults: res.total,
        totalPages: res.pages,
    };

    return list

}

/**
 * 
 * @param {string} id 
 * @returns 
 */
const removeUser = async (id) => {

    if (!isValidObjectId(id)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_ID_ERR_MESSAGE)
    }

    id = id?.toString()

    const user = await getUserFromCache(id)
    if (!user) {
        throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
    }

    // remove user
    await userModel.findByIdAndDelete(id);

    // get all related logins
    const logins = await userLoginModel.find({ user: id }, { _id: 1 });

    // delete them in one go
    await userLoginModel.deleteMany({ user: id });

    // clear login caches
    for (const login of logins) {
        submitRemoveCache({
            key: USER_LOGIN_CACHE_KEY,
            id: login._id.toString(),
        });
    }

    // clear user cache
    submitRemoveCache({
        key: USER_CACHE_KEY,
        id,
    });

    fanoutOnUserRemoved({
        userId: id
    })

};

/**
 * 
 * @param {string} id 
 * @param {string[]} permissions
 * @returns 
 */
const patchUserPermission = async (id, permissions) => {

    if (!isValidObjectId(id)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_ID_ERR_MESSAGE)
    }

    const user = await getUserFromCache(id)
    if (!user) {
        throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
    }

    await userModel.findByIdAndUpdate(id, {
        $set: {
            permissions
        }
    }, {
        new: true,
        runValidators: true
    })

    return updateUserCache(id)

};

/**
 * 
 * @param {object} user 
 * @param {string} user.id
 * @param {string} user.fullname
 * @param {string} user.image
 * 
 * @param {string} refreshToken 
 * @returns 
 */
const createUserToken = async (user, refreshToken) => {
    if (!isValidObjectId(user?.id)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_ID_ERR_MESSAGE)
    }

    const token = jwt.sign(
        sanitizeObject({
            id: user?.id,
            fullname: user?.fullname,
            image: user?.image,
            refreshToken
        }),
        USER_AUTHENTICATION_JWT_SECRET || "",
        { expiresIn: 60 * 60 }
    );
    return token;
};

/**
 * 
 * @param {*} params 
 * @returns 
 */
const seedUser = async (params) => {

    const v = new Validator(params, {
        email: "required|email",
        fullname: "required|string",
        password: "required|string",
    });

    let matched = await v.check();
    if (!matched) {
        throw HttpError(INVALID_INPUT_ERR_CODE, v.errors);
    }

    const email = sanitizeEmail(params?.email)
    const hashedEmail = hashString(email);

    const projectTitle = decryptSecret(process?.env?.ENC_SELF_PROJECT_TITLE)

    // Create admin with full transaction support
    const session = await mongoose.startSession();
    session.startTransaction();

    try {

        const userCount = await userModel.countDocuments({})
        if (userCount > 0) {
            throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
        }

        const existingUser = await userModel.findOne(
            { 'hash.email': hashedEmail },
            null,
            { session }
        );

        if (existingUser) {
            await session.abortTransaction();
            throw HttpError(INVALID_INPUT_ERR_CODE, "Admin with this email already exists");
        }


        const [newUser] = await userModel.create([sanitizeObject({
            fullname: striptags(params?.fullname),
            email,
            permissions: [
                WRITE_USER_USER_ROLE,
                READ_USER_USER_ROLE,
                WRITE_PROJECT_USER_ROLE,
                READ_PROJECT_USER_ROLE,
                WRITE_USER_INVITATION_USER_ROLE,
                READ_USER_INVITATION_USER_ROLE,
                READ_REPORT_USER_ROLE,
                WRITE_REPORT_USER_ROLE,
                WRITE_WEBHOOK_USER_ROLE,
                READ_WEBHOOK_USER_ROLE,
                WRITE_BUCKET_USER_ROLE,
                WRITE_ALERT_USER_ROLE,
                READ_ALERT_USER_ROLE,
                READ_BUCKET_USER_ROLE
            ],
            hash: { email: hashedEmail }
        })], { session });

        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync(params?.password, salt);

        await userLoginModel.create([{
            user: newUser._id,
            key: email,
            type: EMAIL_PASSWORD_LOGIN_TYPE,
            credentials: encrypt(JSON.stringify({ password: passwordHash })),
            hash: { key: hashedEmail }
        }], { session });

        await session.commitTransaction();
        console.log("✓ User created successfully");



        if (!projectTitle) {
            console.warn('Self-logging not configured (ENC_SELF_PROJECT_TITLE not set)');
            return newUser.toJSON()
        }

        const projectSlug = createSlug(striptags(projectTitle));

        if (!projectSlug) {
            console.error("  Failed to create slug from project title");
            return newUser.toJSON()
        }
        
        submitCreateProject({
            title: projectTitle,
            slug: projectSlug,
            creator: newUser._id.toString(),
            settings: {
                indexes: [
                    "context.service",
                    "data.title",
                ],
                allowedOrigin: [] // internal backend only
            }
        });

        return newUser.toJSON();

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        console.error("Failed to create admin:", error);
        throw error;
    } finally {
        await session.endSession();
    }
};

/**
 * 
 * @param {string} id 
 * @param {object} params 
 * @param {string} params.fullname
 * @param {string} params.email
 */
const updateUserProfile = async (id, params) => {

    if (!isValidObjectId(id)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_ID_ERR_MESSAGE)
    }

    const user = await getUserFromCache(id);
    if (!user) {
        throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE);
    }

    const v = new Validator(params, {
        fullname: "required|string",
        email: "required|email",
    });

    let match = await v.check();
    if (!match) {
        throw HttpError(INVALID_INPUT_ERR_CODE, v.errors);
    }

    let email = striptags(params.email.toString()).trim().toLowerCase();
    const hashedEmail = hashString(email);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Check for email conflicts within transaction
        const conflictingLogin = await userLoginModel.findOne({
            "hash.key": hashedEmail,
            type: EMAIL_PASSWORD_LOGIN_TYPE,
            user: { $ne: user.id }
        }).session(session);

        if (conflictingLogin) {
            throw HttpError(INVALID_INPUT_ERR_CODE, `${email} is used by someone else`);
        }

        // Find user's own login document
        const userLogin = await userLoginModel.findOne({
            user: user.id,
            type: EMAIL_PASSWORD_LOGIN_TYPE
        }).session(session);

        if (!userLogin) {
            throw HttpError(NOT_FOUND_ERR_CODE, 'User login not found');
        }

        // Update both documents
        await userModel.findByIdAndUpdate(user.id, {
            $set: sanitizeObject({
                fullname: striptags(params.fullname),
                email,
                hash: { email: hashedEmail }
            })
        }).session(session);

        await userLoginModel.findByIdAndUpdate(userLogin._id, {
            $set: {
                key: email,
                hash: { key: hashedEmail }
            }
        }).session(session);

        await session.commitTransaction();

        return updateUserCache(user.id)

    } catch (e) {
        await session.abortTransaction();
        throw e;
    } finally {
        await session.endSession();
    }
};
/**
 * 
 * @param {string} id 
 * @param {object} params 
 * @param {string} params.oldpassword
 * @param {string} params.newpassword
 * @param {string} params.repassword
 */
const patchUserPassword = async (id, params) => {

    if (!isValidObjectId(id)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_ID_ERR_MESSAGE)
    }

    const user = await getUserFromCache(id);
    if (!user) {
        throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE);
    }

    const v = new Validator(params, {
        oldpassword: "required|string",
        newpassword: "required|string", // Add minimum length
        repassword: "required|string",
    });

    let match = await v.check();
    if (!match) {
        throw HttpError(INVALID_INPUT_ERR_CODE, v.errors);
    }

    if (params.newpassword !== params.repassword) {
        throw HttpError(INVALID_INPUT_ERR_CODE, `New password did not match`);
    }

    // Find user's login document OUTSIDE transaction
    const userLogin = await userLoginModel.findOne({
        user: user.id,
        type: EMAIL_PASSWORD_LOGIN_TYPE
    });

    if (!userLogin) {
        throw HttpError(NOT_FOUND_ERR_CODE, 'User login not found');
    }

    // Verify old password OUTSIDE transaction (slow operation)
    const isValid = await verifyUserPassword(userLogin.credentials, params.oldpassword);
    if (!isValid) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_EMAIL_PASSWORD_ERR_MESSAGE);
    }

    // Hash new password OUTSIDE transaction (slow operation)
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(params.newpassword, salt);
    const encryptedCredentials = encrypt(JSON.stringify({ password: hash }));

    // Only the fast database update happens in transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Quick update operation
        await userLoginModel.findByIdAndUpdate(userLogin._id, {
            $set: {
                credentials: encryptedCredentials,
            }
        }).session(session);

        await session.commitTransaction();

    } catch (e) {
        await session.abortTransaction();
        throw e;
    } finally {
        await session.endSession();
    }
};

module.exports = {
    findUserById,
    handleUserLogin,
    paginateUser,
    removeUser,
    createUserToken,
    seedUser,
    patchUserPermission,
    updateUserProfile,
    patchUserPassword
}