//@ts-check

const { HttpError, hashString, num2Ceil, num2Floor, sanitizeObject, encrypt, decryptSecret, createSlug } = require("common/function")
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
    WRITE_SETTINGS_USER_ROLE,
    READ_SETTINGS_USER_ROLE,
    WRITE_USER_INVITATION_USER_ROLE,
    READ_USER_INVITATION_USER_ROLE,
    INVALID_ID_ERR_MESSAGE
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
 * @returns 
 */
const loginUserWithEmailPassword = async (params) => {

    const v = new Validator(params, {
        email: "required|string",
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
            lastLoginAt: new Date()
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
    if (params?.search) {
        query.$or = [
            {
                fullname: {
                    $regex: params?.search?.toString(),
                    $options: "i"
                }
            }
        ]
    }

    if (params?.group) {
        query.group = ObjectId.createFromHexString(params?.group?.toString())
    }

    return query

}

const paginateUser = async (query = {}, sortBy = "createdAt:desc", limit = 10, page = 1) => {

    const queryParams = buildUserSearchQuery(query)
    limit = num2Ceil(num2Floor(limit, 1), 50)
    page = num2Floor(page, 1)


    let list = await userModel.paginate(queryParams, { sortBy, limit, page });

    list.results = list?.results?.map((/** @type {any} */ doc) => {
        let n = new userModel(doc);
        n.decryptFieldsSync();
        return mapUser(n?.toJSON())
    })

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


const seedUser = async () => {

    await new Promise(resolve => setTimeout(resolve, 5000));

    if (!USER_NAME || !USER_EMAIL || !USER_PASSWORD) {
        console.warn("Skipping user seed: USER_NAME, USER_EMAIL, or USER_PASSWORD not set");
        return null;
    }

    const hashedEmail = hashString(USER_EMAIL);

    // Check if user already exists
    let user = await userModel.findOne({ 'hash.email': hashedEmail });

    if (!user) {
        // Create user if doesn't exist
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const [newUser] = await userModel.create([sanitizeObject({
                fullname: USER_NAME,
                email: USER_EMAIL,
                permissions: [
                    WRITE_USER_USER_ROLE,
                    READ_USER_USER_ROLE,
                    WRITE_PROJECT_USER_ROLE,
                    READ_PROJECT_USER_ROLE,
                    WRITE_SETTINGS_USER_ROLE,
                    READ_SETTINGS_USER_ROLE,
                    WRITE_USER_INVITATION_USER_ROLE,
                    READ_USER_INVITATION_USER_ROLE
                ],
                hash: { email: hashedEmail }
            })], { session });

            const salt = bcrypt.genSaltSync(10);
            const hash = bcrypt.hashSync(USER_PASSWORD, salt);

            await userLoginModel.create([{
                user: newUser._id,
                key: USER_EMAIL,
                type: EMAIL_PASSWORD_LOGIN_TYPE,
                credentials: encrypt(JSON.stringify({ password: hash })),
                hash: { key: hashedEmail }
            }], { session });

            await session.commitTransaction();
            console.log("✓ User created successfully");

            user = newUser;

        } catch (e) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            console.error("Failed to create user:", e);
            throw e;
        } finally {
            await session.endSession();
        }
    } else {
        console.log("✓ User already exists");
    }

    // Always try to create self-project (whether user was just created or already existed)
    await ensureSelfProject(user?._id?.toString());

    return user;
};

/**
 * Ensure self-project exists for internal logging
 */
/**
 * 
 * @param {string} userId 
 * @returns 
 */
const ensureSelfProject = async (userId) => {

    if (!isValidObjectId(userId)) {
        console.error("  No userId set, skipping self-project");
        return null;
    }

    const projectTitle = decryptSecret(process.env.ENC_SELF_PROJECT_TITLE);

    if (!projectTitle) {
        console.error("  No ENC_SELF_PROJECT_TITLE set, skipping self-project");
        return null;
    }

    const projectSlug = createSlug(projectTitle);

    if (!projectSlug) {
        console.error("  Failed to create slug from project title");
        return null;
    }

    submitCreateProject({
        title: projectTitle,
        slug: projectSlug,
        creator: userId,
        settings: {
            indexes: [
                "context.service",
                "data.title",
            ],
            allowedOrigin: [] // internal backend only
        }
    });
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
        email: "required|string",
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