const mongoose = require('mongoose');

function redactMongoUri(uri) {
    if (!uri) return uri;
    // Redact credentials if present: mongodb(+srv)://user:pass@host -> mongodb(+srv)://***:***@host
    return uri.replace(/^(mongodb(?:\+srv)?:\/\/)([^@]+)@/i, (_, prefix) => `${prefix}***:***@`);
}

async function connect() {
    // Prefer env var so each machine can configure its own DB.
    // Fallback to local MongoDB for easy dev.
    const uri =
        process.env.MONGODB_URI ||
        'mongodb://127.0.0.1:27017/flutter_server?directConnection=true';

    if (!/^mongodb(\+srv)?:\/\//i.test(uri)) {
        throw new Error('Invalid MONGODB_URI (must start with mongodb:// or mongodb+srv://)');
    }

    // Silence Mongoose 7 strictQuery deprecation warning.
    mongoose.set('strictQuery', true);

    mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error', err);
    });

    try {
        await mongoose.connect(uri);
        console.log('Connect to db success ' + redactMongoUri(uri));
        return mongoose.connection;
    } catch (e) {
        console.error('Connect to db failed ' + redactMongoUri(uri), e);
        throw e;
    }
}

module.exports = { connect }