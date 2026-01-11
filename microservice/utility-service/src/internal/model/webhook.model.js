//@ts-check
const { mongoose } = require("../../shared/mongoose");

const webhookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxLength: 128,
        index: true
    },
     // After decryption, connection contains:
    // {
    //   url: string,
    //   method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    //   headers: { [key: string]: string },
    //   body_template: object | string,
    //   timeout: number (ms),
    //   retry: {
    //     enabled: boolean,
    //     max_attempts: number,
    //     backoff_multiplier: number
    //   },
    //   auth: {
    //     type: 'none' | 'basic' | 'bearer' | 'api_key' | 'oauth2',
    //     // For basic:
    //     username?: string,
    //     password?: string,
    //     // For bearer:
    //     token?: string,
    //     // For api_key:
    //     key_name?: string, // e.g., "X-API-Key"
    //     key_value?: string,
    //     key_location?: 'header' | 'query', // Where to send the key
    //     // For oauth2:
    //     client_id?: string,
    //     client_secret?: string,
    //     token_url?: string,
    //     scope?: string
    //   }
    // }
    connection: {
        type: String,
        required: true
    },

}, { timestamps: true });

webhookSchema.index({ createdAt: 1 });
webhookSchema.index({ updatedAt: 1 });

module.exports = mongoose.model('webhook', webhookSchema);
