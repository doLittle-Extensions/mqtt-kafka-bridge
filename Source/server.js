const winston = require('winston');
const mosca = require("mosca");
const process = require("process");
const pino = require("pino");

const addLoggingDetails = winston.format((entry, options) => {
    entry.source = "MQTT Bridge";
    if( !entry.correlationId ) entry.correlationId = "[Not available]";

    return entry;
});


const logger = winston.createLogger({
    level: "debug",

    format: winston.format.combine(
        winston.format.timestamp(),
        addLoggingDetails(),
        winston.format.json()
    ),

    transports: [
        new winston.transports.Console()
    ]
});

var backend = {
    type: "kafka",
    json: false,
    connectionString: "",
    clientId: "mosca",
    groupId: "mosca",
    defaultEncoding: "utf8",
    encodings: {
        "spiddal-adcp": "buffer"
    }
};

var settings = {
    port: 1883,

    stats: false,
    publishNewClient: false,
    publishClientDisconnect: false,
    publishSubscriptions: false,

    logger: {
        name: "MoscaServer", 
        level: "debug"
    },

    backend: backend,
};

const zookeeperConnectionString = "-zookeeperConnectionString:";

let args = process.argv.slice(2);
logger.info(`Args ${args}`);

args.forEach(arg => {
    logger.info(`Handling argument : ${arg}`);
    if (arg.indexOf(zookeeperConnectionString) == 0) {
        backend.connectionString = arg.substr(zookeeperConnectionString.length);
    }
});

if (process.env.ZOOKEEPER_CONNECTION_STRING) {
    backend.connectionString = process.env.ZOOKEEPER_CONNECTION_STRING;
}

backend.connectionString = "10.0.1.128:2181";

if (backend.connectionString == "") {
    logger.error(`Must specify ${zookeeperConnectionString}connectionString`);
    process.exit(1);
}

logger.info(`Creating server connecting to Zookeeper on '${backend.connectionString}'`);


function PinoToWinstonStream() {}
PinoToWinstonStream.prototype.write = function(chunk) {
    var level = "info";
    var logEntry = JSON.parse(chunk.toString());

    // {"pid":7452,"hostname":"Einars-MacBook-Pro-Private.local","name":"MoscaServer","level":30,"time":1514891554867,"msg":"server started","mqtt":1883,"v":1
    switch( logEntry.level )
    {
        case pino.levels.values.fatal: level = "fatal"; break;
        case pino.levels.values.error: level = "error"; break;
        case pino.levels.values.warn: level = "warn"; break;
        case pino.levels.values.info: level = "info"; break;
        case pino.levels.values.debug: level = "debug"; break;
        case pino.levels.values.trace: level = "trace"; break;
    };

    var translated = {
        message: logEntry.msg,
        level: level,
        "@timestamp": new Date(logEntry.time)
    };
    delete logEntry.pid;
    delete logEntry.hostname;
    delete logEntry.name;
    delete logEntry.level;
    delete logEntry.time;
    delete logEntry.msg;

    translated.content = logEntry;
    if( translated.content.packet && translated.content.packet.correlationId ) {
        translated.correlationId = translated.content.packet.correlationId;
    } 

    logger.log(translated);
}


let server = new mosca.Server(settings);
server.logger.stream = new PinoToWinstonStream();
let collection = null;

server.on("error", function (err) {
    logger.error(err);
});

server.on('clientConnected', function (client) {
    logger.info('client connected', {client: client.id });
});

server.on('ready', function () {
    logger.info('Mosca server is up and running');
});

server.on('published', function (packet, client) {
    var content = JSON.parse(packet.payload.toString());
    logger.info("Message Published", content);
});
server.on('subscribed', function (topic, client) {});
server.on('unsubscribed', function (topic, client) {});
server.on('clientDisconnecting', function (client) {});
server.on('clientDisconnected', function (client) {});