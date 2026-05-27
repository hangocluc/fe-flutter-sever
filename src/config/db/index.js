const mongoose = require('mongoose');

function redactMongoUri(uri) {
    if (!uri) return uri;
    // Redact credentials if present: mongodb(+srv)://user:pass@host -> mongodb(+srv)://***:***@host
    return uri.replace(/^(mongodb(?:\+srv)?:\/\/)([^@]+)@/i, (_, prefix) => `${prefix}***:***@`);
}

function isDeployedEnvironment() {
    return (
        process.env.RENDER === 'true' ||
        process.env.NODE_ENV === 'production' ||
        Boolean(process.env.RENDER_EXTERNAL_URL)
    )
}

async function connect() {
    const uri = process.env.MONGODB_URI

    if (!uri) {
        if (isDeployedEnvironment()) {
            throw new Error(
                'MONGODB_URI is not set. On Render (or any cloud host), add MONGODB_URI in ' +
                'Environment — use a MongoDB Atlas connection string (mongodb+srv://...), not localhost.'
            )
        }

        // Local dev fallback only.
        return connectWithUri(
            'mongodb://127.0.0.1:27017/flutter_server?directConnection=true'
        )
    }

    if (!/^mongodb(\+srv)?:\/\//i.test(uri)) {
        throw new Error('Invalid MONGODB_URI (must start with mongodb:// or mongodb+srv://)');
    }

    return connectWithUri(uri)
}

async function connectWithUri(uri) {

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