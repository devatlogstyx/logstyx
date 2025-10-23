//@ts-check

const cron = require('node-cron');

//every 15th minute
cron.schedule('*/15 * * * *', () => {

});
//every day at 2 am
cron.schedule('0 2 * * *', () => {
    
});