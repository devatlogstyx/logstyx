//@ts-check

const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const morgan = require("morgan")

const { ExpressNotFoundHandler, ExpressSuccessHandler, ValidateSignature, ValidateBearer, ValidateDevice, ExpressErrorHandler, ValidateCookies } = require('./middleware');

const app = express();
app.disable('x-powered-by');

app.use(morgan("dev"))
app.use(bodyParser.json({ limit: '200mb' }));
app.use(bodyParser.urlencoded({ limit: '200mb', extended: true }));
app.use(cookieParser());

app.get("/health", (req, res) => {
    res.status(200).send("OK");
});

app.use(ValidateDevice)
app.use(ValidateSignature)
app.use(ValidateBearer)
app.use(ValidateCookies)
app.use(ExpressSuccessHandler)
app.use('/api/v1', require("./routes/v1"));

app.use(ExpressNotFoundHandler)
app.use(ExpressErrorHandler);

module.exports = app;
