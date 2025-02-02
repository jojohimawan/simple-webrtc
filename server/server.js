"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const static_1 = __importDefault(require("@fastify/static"));
const node_crypto_1 = require("node:crypto");
const ws_1 = require("ws");
const path_1 = __importDefault(require("path"));
const context = (0, fastify_1.default)({ logger: true });
const wss = Reflect.construct(ws_1.WebSocketServer, [context.server]);
const clients = Reflect.construct((Map), []);
context.register(static_1.default, {
    root: path_1.default.join(__dirname, '../public'),
    prefix: '/'
});
wss.on("connection", (socket) => {
    const id = (0, node_crypto_1.randomUUID)();
    clients.set(id, socket);
    context.log.info(`Client connected: ${id}`);
    const initMessage = { type: 'id', id };
    socket.send(JSON.stringify(initMessage));
    //@ts-ignore
    socket.on("message", (data) => {
        try {
            const message = JSON.parse(data);
            context.log.debug(`Message from ${id}: ${data}`);
            if (message.target && clients.has(message.target)) {
                const targetClient = clients.get(message.target);
                const relayMessage = Object.assign(Object.assign({}, message), { source: id });
                targetClient.send(JSON.stringify(relayMessage));
            }
        }
        catch (e) {
            context.log.error(`Error listening message event: ${e.message}`);
        }
    });
    //@ts-ignore
    socket.on("close", () => {
        clients.delete(id);
        context.log.info(`Client disconnected: ${id}`);
    });
});
const start = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield context.listen({ port: 3000 });
        context.log.info(`Server listening on port 3000`);
    }
    catch (e) {
        context.log.error(`Error starting server: ${e.message}`);
        process.exit(1);
    }
});
start();
