var mosca = require("mosca");
var process = require("process");

var backend = {
    type: "kafka",
    json: false,
    connectionString: "kafka01:2181,kafka02:2181,kafka03:2181",
    clientId: "mosca",
    groupId: "mosca",
    defaultEncoding: "utf8",
    encodings: {
        "spiddal-adcp": "buffer"
    }
};

var settings = {
    port: 1883,
    backend: backend,
    stats: false,
    publishNewClient: false,
    publishClientDisconnect: false,
    publishSubscriptions: false,
    logger: { name: 'MoscaServer', level: 'debug' },
};

const zookeeperConnectionString = "-zookeeperConnectionString:";
let args = process.argv.slice(2);
console.log("Args : "+args);
args.forEach(arg => {
    console.log(`Handling argument : ${arg}`);
    if (arg.indexOf(zookeeperConnectionString) == 0) {
        backend.connectionString = arg.substr(zookeeperConnectionString.length);
    }
});

if( process.env.ZOOKEEPER_CONNECTION_STRING ) {
    backend.connectionString = process.env.ZOOKEEPER_CONNECTION_STRING;
}

if( backend.connectionString == "" ) {
    console.error(`Must specify ${zookeeperConnectionString}:connectionString`);
    process.exit(1);
}

console.log(`Creating server connecting to Zookeeper on '${backend.connectionString}'`);
var server = new mosca.Server(settings);

server.on('clientConnected', function (client) {
    console.log('client connected', client.id);
});

// fired when a message is received
server.on('published', function (packet, client) {
    console.log('Published', packet.payload);
});

server.on('ready', function () {
    console.log('Mosca server is up and running');
});

server.on('subscribed', function (topic, client) {
    console.log("Subscribed :=", topic);
});

server.on('unsubscribed', function (topic, client) {
    console.log('unsubscribed := ', topic);
});

server.on('clientDisconnecting', function (client) {
    console.log('clientDisconnecting := ', client.id);
});

server.on('clientDisconnected', function (client) {
    console.log('Client Disconnected     := ', client.id);
});