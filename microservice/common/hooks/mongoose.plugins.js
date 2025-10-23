const paginate = (schema) => {
    /**
     * @typedef {Object} QueryResult
     * @property {Document[]} results - Results found
     * @property {number} page - Current page
     * @property {number} limit - Maximum number of results per page
     * @property {number} totalPages - Total number of pages
     * @property {number} totalResults - Total number of documents
     */
    /**
     * Query for documents with pagination
     * @param {Object} [filter] - Mongo filter
     * @param {Object} [options] - Query options
     * @param {string} [options.sortBy] - Sorting criteria using the format: sortField:(desc|asc). Multiple sorting criteria should be separated by commas (,)
     * @param {string} [options.populate] - Populate data fields. Hierarchy of fields should be separated by (.). Multiple populating criteria should be separated by commas (,)
     * @param {number} [options.limit] - Maximum number of results per page (default = 10)
     * @param {number} [options.page] - Current page (default = 1)
     * @returns {Promise<QueryResult>}
     */
    schema.statics.paginate = async function (filter, options, select) {
        let sort = "";
        if (options.sortBy) {
            const sortingCriteria = [];
            options.sortBy.split(",").forEach((sortOption) => {
                const [key, order] = sortOption.split(":");
                sortingCriteria.push((order === "desc" ? "-" : "") + key);
            });
            sort = sortingCriteria.join(" ");
        } else {
            sort = "createdAt";
        }

        const limit =
            options.limit && parseInt(options.limit, 10) > 0
                ? parseInt(options.limit, 10)
                : 10;
        const page =
            options.page && parseInt(options.page, 10) > 0
                ? parseInt(options.page, 10)
                : 1;
        const skip = (page - 1) * limit;

        const countPromise = this.countDocuments(filter).exec();
        let docsPromise = this.find(filter).sort(sort).skip(skip).limit(limit);

        if (options.populate) {
            options.populate.split(",").forEach((populateOption) => {
                docsPromise = docsPromise.populate(
                    populateOption
                        .split(".")
                        .reverse()
                        .reduce((a, b) => ({ path: b, populate: a }))
                );
            });
        }
        if (select) {
            docsPromise = docsPromise.select(select);
        }

        return Promise.all([countPromise, docsPromise.exec()]).then((values) => {
            const [totalResults, results] = values;
            const totalPages = Math.ceil(totalResults / limit);
            const result = {
                results,
                page,
                limit,
                totalPages,
                totalResults,
            };
            return Promise.resolve(result);
        });
    };
};

const deleteAtPath = (obj, path, index) => {
    if (index === path.length - 1) {
        delete obj[path[index]];
        return;
    }
    deleteAtPath(obj[path[index]], path, index + 1);
};

const toJSON = (schema) => {
    let transform;
    if (schema.options.toJSON && schema.options.toJSON.transform) {
        transform = schema.options.toJSON.transform;
    }

    schema.options.toJSON = Object.assign(schema.options.toJSON || {}, {
        transform(doc, ret, options) {
            Object.keys(schema.paths).forEach((path) => {
                if (schema.paths[path].options && schema.paths[path].options.private) {
                    deleteAtPath(ret, path.split('.'), 0);
                }
            });

            ret.id = ret._id.toString();
            delete ret._id;
            delete ret.__v;

            if (transform) {
                return transform(doc, ret, options);
            }
        },
    });
};

const useMongoosePlugins = () => {
    return {
        paginate,
        toJSON,
    }
}

module.exports = {
    useMongoosePlugins
}