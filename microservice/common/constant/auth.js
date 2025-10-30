module.exports = {
    BEARER_MIDDLEWARE_VALIDATION_SOURCE: "BEARER",
    COOKIE_MIDDLEWARE_VALIDATION_SOURCE: "COOKIE",
    SIGNATURE_MIDDLEWARE_VALIDATION_SOURCE: "SIGNATURE",

    REFRESH_TOKEN_COOKIE_NAME: "REFRESH_TOKEN",
    ADMIN_TOKEN_COOKIE_NAME: "ADMIN_COOKIE",
    USER_TOKEN_COOKIE_NAME: "USER_TOKEN",

    CREATE_COOKIE_OPTION: {
        maxAge: 1000 * 60 * 60, // 1 hour
        httpOnly: true,
        sameSite: 'lax',
        secure: false 
    },

    CLEAR_COOKIE_OPTION: {
        httpOnly: true,
        sameSite: 'lax',
        secure: false
    },

    ALLOWED_ORIGIN: [
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    BROWSER_CLIENT_TYPE: "browser",

    EMAIL_PASSWORD_LOGIN_TYPE:"EMAIL_PASSWORD"
}