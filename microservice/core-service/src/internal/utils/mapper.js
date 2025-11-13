const { decrypt } = require("common/function");
const { decryptAndDecompress } = require("./compression");


const parseContent = async (content, version) => {
    let result
    if (content?.iv && content?.content) {
        if (version === 2) {
            // New: decrypt then decompress
            result = JSON.parse(await decryptAndDecompress(content));
        } else {
            // Old: just decrypt
            result = JSON.parse(decrypt(content));
        }
    } else {
        result = content;
    }

    return result

}


module.exports = {
    mapProjectUser: (json) => {
        return {
            id: json?.user?.userId?.toString(),
            fullname: json?.user?.fullname,
            createdAt: json?.createdAt
        }
    },
    mapProject: (json) => {
        return {
            id: json?.id || json?._id?.toString(),
            slug: json?.slug,
            secret: json?.secret,
            settings: {
                indexes: json?.settings?.indexes,
                allowedOrigin: json?.settings?.allowedOrigin,
                retentionDays: json?.settings?.retentionDays,
            },
            createdAt: json?.createdAt
        }
    },
    mapLog: async (json) => {
        // Check version to determine how to decrypt
        const version = json?.version || 1; // Default to v1 for old records

        return {
            id: json?.id || json?._id?.toString(),
            key: json?.key,
            level: json?.level,
            device: json?.device,
            context: await parseContent(json?.context, version),
            data: await parseContent(json?.data, version),
            hash: json?.hash,
            count: json?.count,
            createdAt: json?.createdAt,
            updatedAt: json?.updatedAt,
        }
    }
}