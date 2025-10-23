//@ts-check

const fs = require("fs/promises")
const path = require("path")
const { existsSync } = require("fs");
const { HttpError } = require("common/function");
const { INVALID_INPUT_ERR_CODE } = require("common/constant");

const handlebar = require("handlebars");
const mjml2html = require("mjml");



const findEmailTemplateByKey = async (key) => {


    const templatePath = path.join(__dirname, "../../shared/static", `${key}.mjml`);
    if (!existsSync(templatePath)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, `Unknown key ${key}`);
    }

    const defaultTemplate = await fs.readFile(templatePath, "utf-8");
    const params = [...defaultTemplate.matchAll(/{{(.*?)}}/g)].map(m => m[1]);

    return { key, template: defaultTemplate, params };
};


const renderHtml = async (key, params) => {
    const { template } = await findEmailTemplateByKey(key);

    const compiler = handlebar.compile(template);

    const compiledString = compiler(params);

    const { html } = mjml2html(compiledString);

    return html
}

module.exports = { renderHtml }