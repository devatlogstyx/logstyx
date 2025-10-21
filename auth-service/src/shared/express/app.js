//@ts-check

const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const cors = require("cors");
const morgan = require("morgan")
const DeviceDetector = require("device-detector-js")

const { ExpressNotFoundHandler, ExpressSuccessHandler, ValidateSignature, ValidateBearer, ValidateDevice, ExpressErrorHandler, ValidateCookies } = require('./middleware');
const { useCors } = require("common/hooks");

const app = express();
app.disable('x-powered-by');

app.use(useCors({
    Detector: DeviceDetector,
    Cors: cors
}));

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
app.use('/v1', require("./routes/v1"));

app.use(ExpressNotFoundHandler)
app.use(ExpressErrorHandler);

module.exports = app;
