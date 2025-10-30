//@ts-check

const { HttpError, hashString, num2Ceil, num2Floor, sanitizeObject, encrypt, decryptSecret, createSlug } = require("common/function")
const { getUserFromCache } = require("../../shared/cache")
const { mapUser, } = require("../utils/mapper")
const { Validator } = require("node-input-validator")
const {
    INVALID_INPUT_ERR_CODE,
    EMAIL_PASSWORD_LOGIN_TYPE,
    NO_ACCESS_ERR_CODE,
    INVALID_EMAIL_PASSWORD_ERR_MESSAGE,
    USER_CACHE_KEY,
    USER_LOGIN_CACHE_KEY,
    NOT_FOUND_ERR_CODE,
    NOT_FOUND_ERR_MESSAGE,
} = require("common/constant")

const { striptags } = require("striptags")
const userLoginModel = require("../model/user.login.model")
const { submitRemoveCache, submitCreateProject } = require("../../shared/provider/mq-producer")

const { mongoose } = require("../../shared/mongoose")
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

    if (!id) return null;

    const user = await getUserFromCache(id)
    if (!id) {
        return null
    }

    return user
}

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

const handleUserLogin = async (params) => {
    if (params?.type === EMAIL_PASSWORD_LOGIN_TYPE) {
        return loginUserWithEmailPassword(params)
    }

    throw HttpError(INVALID_INPUT_ERR_CODE, `Unknown command`)
}

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


    let list = await userModel.pagimate(queryParams, { sortBy, limit, page });

    list.results = list?.results?.map((doc) => {
        let n = new userModel(doc);
        n.decryptFieldsSync();
        return mapUser(n?.toJSON())
    })

    return list
}

const removeUser = async (id) => {
    id = id?.toString();
    if (!id) return;

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
};

const createUserToken = async (user, refreshToken) => {
    const token = jwt.sign(
        sanitizeObject({
            id: user?.id,
            fullname: user?.fullname,
            image: user?.image,
            partner: user?.partner?.toString(),
            refreshToken
        }),
        USER_AUTHENTICATION_JWT_SECRET || "",
        { expiresIn: 60 * 60 }
    );
    return token;
};


const seedUser = async () => {
    if (!USER_NAME || !USER_EMAIL || !USER_PASSWORD) {
        console.warn("Skipping user seed: USER_NAME, USER_EMAIL, or USER_PASSWORD not set");
        return null;
    }

    const hashedEmail = hashString(USER_EMAIL);

    // Check if user already exists
    let user = await userModel.findOne({ 'hash.email': hashedEmail });

    if (!user) {
        // Create user if doesn't exist
        const session = await mongoose.connection.startSession();
        session.startTransaction();

        try {
            const [newUser] = await userModel.create([sanitizeObject({
                fullname: USER_NAME,
                email: USER_EMAIL,
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
            await session.abortTransaction();
            console.error("Failed to create user:", e);
            throw e;
        } finally {
            await session.endSession();
        }
    } else {
        console.log("✓ User already exists");
    }

    // Always try to create self-project (whether user was just created or already existed)
    await ensureSelfProject(user._id);

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
    const projectTitle = decryptSecret(process.env.ENC_SELF_PROJECT_TITLE);

    if (!projectTitle) {
        console.log("  No ENC_SELF_PROJECT_TITLE set, skipping self-project");
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
        creator: userId.toString(),
        settings: {
            indexes: [
                "context.service",
                "data.title",
            ],
            allowedOrigin: [] // internal backend only
        }
    });
};

module.exports = {
    findUserById,
    handleUserLogin,
    paginateUser,
    removeUser,
    createUserToken,
    seedUser
}