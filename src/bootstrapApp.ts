import "dotenv/config";

import bluebird from "bluebird";
import gracefulShutdown from "http-graceful-shutdown";
import http, { Server } from "http";

import { Application as _expressApp } from "express";
type _serverListen = (port: string) => Promise<void>
type _service = { close: () => Promise<void>, stop?: () => Promise<void> } | { close?: () => Promise<void>, stop: () => Promise<void> }
type _serviceFn = (app: _expressApp) => Promise<_service>
type _wrappedService = { count: number, shutdown: () => Promise<[]> }

async function initializeServer(app: _expressApp) {
    const port: string = process.env.PORT || "3000";

    console.info("Initializing Http Server...");
    app.set("port", port);
    const server = http.createServer(app);
    server.on("close", () => console.info("Http Server closed"));

    const listen: _serverListen = bluebird.promisify(server.listen, { context: server });
    await listen(port);

    console.info("Http Server initialized!");
    return server;
}

async function initializeServices(app: _expressApp, services: _serviceFn[]) {
    const parallel = process.env.PARALLEL;
    const mapper = parallel ? bluebird.map : bluebird.mapSeries;

    console.info("Initializing Services...");
    const servicesPromise: _service[] = await mapper(services, (service) => service(app));
    console.info("Services Initialized!");

    return {
        count: servicesPromise.length,
        shutdown: () => mapper(servicesPromise, (service: _service) => service.stop && service.stop() || service.close && service.close())
    };
}

async function initializeShutdownHook(server: Server, services: _wrappedService) {
    const shutdownTimeout: number = Number(process.env.SHUTDOWN_TIMEOUT) || 3000;

    return gracefulShutdown(server, {
        onShutdown: /* istanbul ignore next */ async function (signal) {
            console.info("received notice to shut down (%s)...", signal);
            console.info("Shutting down %s services...", services.count);
            await services.shutdown();
            console.info("Done shutting down services");
        },
        timeout: shutdownTimeout,
        finally: /* istanbul ignore next */ function () {
            console.info("Server gracefully shut down...");
        }
    });
}

export default function (app: _expressApp, initServices: _serviceFn[]) {
    return {
        start: async function () {
            const services = await initializeServices(app, initServices);
            const server = await initializeServer(app);
            const shutdown = await initializeShutdownHook(server, services);
            return {
                server,
                shutdown
            };
        }
    };
}
