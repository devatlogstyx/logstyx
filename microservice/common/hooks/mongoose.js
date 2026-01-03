const { decryptSecret } = require("../function/encryptor");

//@ts-check
const useMongoose = ({ Mongoose, DbName, Log }) => {
  let isConnected = false;

  async function connectToDB() {
    if (isConnected) {
      return Mongoose.connection;
    }

    const MONGO_DB_SERVER = (process.env.ENC_MONGODB_HOST && decryptSecret(process.env.ENC_MONGODB_HOST))
      || process.env.MONGODB_HOST
      || 'mongodb://mongodb:27017'
    const uri = `${MONGO_DB_SERVER}/${DbName}`;

    try {
      await Mongoose.connect(uri, {
        maxPoolSize: 40,
        minPoolSize: 10,
      });


      Mongoose.connection.on("error", (e) => Log?.error?.(e));
      Mongoose.connection.once("connected", () => {
        Log?.info?.(`✅ Connected to MongoDB: ${DbName}`);
      });

      isConnected = true;
      return Mongoose.connection;
    } catch (err) {
      Log?.error?.("❌ Failed to connect to MongoDB", err);
      throw err;
    }
  }

  function isValidObjectId(id) {
    if (id == null) return false;

    // Convert anything with .toString() into a string (numbers, ObjectId instances, etc.)
    if (typeof id !== 'string') {
      id = id.toString();
    }

    // Mongoose validity + hex length check
    return (
      Mongoose.Types.ObjectId.isValid(id) &&
      /^[0-9a-fA-F]{24}$/.test(id)
    );
  }
  return {
    connectToDB,
    mongoose: Mongoose,
    isValidObjectId
  };
};

module.exports = { useMongoose };
