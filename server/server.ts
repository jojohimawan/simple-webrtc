/**
 * Simple WebRTC Signaling Server
 *
 * This server acts as a signaling mechanism to facilitate WebRTC peer connections.
 * It does NOT handle media transmission, only exchanging WebRTC offer, answer, and ICE candidates.
 *
 * Flow:
 * 1. A client connects via WebSocket.
 * 2. The server assigns a unique ID and stores the client's WebSocket connection.
 * 3. When a client sends a message (offer/answer/ICE candidate), the server relays it to the intended target.
 * 4. If the target client exists, it forwards the message; otherwise, the message is dropped.
 * 5. When a client disconnects, it is removed from the list of active clients.
 */

import fastify, { FastifyInstance } from "fastify";
import fastifyStatic from "@fastify/static";

import { randomUUID } from "node:crypto";
import { WebSocketServer } from "ws";
import path from "path";

import type { SignalingMessage, WebSocketClient } from "./types";

const context: FastifyInstance = fastify({ logger: true });
const wss: WebSocketServer = new WebSocketServer({ server: context.server })
const clients: Map<string, WebSocketClient> = new Map<string, WebSocketClient>();

context.register(fastifyStatic, {
    root: path.join(__dirname, '../public'),
    prefix: '/'
});

wss.on("connection", (socket: WebSocketClient): void => {
    const id = randomUUID();
    clients.set(id, socket);
    context.log.info(`Client connected: ${id}`);

    const initMessage: SignalingMessage = { type: 'id', id };
    socket.send(JSON.stringify(initMessage));

    //@ts-ignore
    socket.on("message", (data: string): void => {
        try {
            const message: SignalingMessage = JSON.parse(data);
            context.log.debug(`Message from ${ id }: ${ data }`);

            if(message.target && clients.has(message.target)) {
                const targetClient: WebSocketClient = clients.get(message.target)!;
                const relayMessage: SignalingMessage = {
                    ...message,
                    source: id
                };

                targetClient.send(JSON.stringify(relayMessage));
            }
        } catch(e: any) {
            context.log.error(`Error listening message event: ${ e.message }`);
        }
    });

    //@ts-ignore
    socket.on("close", (): void => {
        clients.delete(id);
        context.log.info(`Client disconnected: ${ id }`);
    });
});

const start = async (): Promise<void> => {
    try {
        await context.listen({ port: 3000 });
        context.log.info(`Server listening on port 3000`);
    } catch(e: any) {
        context.log.error(`Error starting server: ${ e.message }`);
        process.exit(1);
    }
};

start();