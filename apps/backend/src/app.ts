import { IErrorResponse } from "common";
import cookieParser from "cookie-parser";
import express, { Express, NextFunction, Request, Response } from "express";
import helmet from "helmet";
import createError, { HttpError } from "http-errors";
import logger from "morgan";
import rateLimiter from "./middleware/rateLimiter.js";
import nkAccountsRouter from "./routes/nk-accounts.ts";

const app: Express = express(); // Set up the backend

// Security settings/middlewares
app.use(helmet()); // Use helmet for security
app.use(rateLimiter()); // Use the rate limiter
app.disable("x-powered-by"); // Disable the fingerprinting for security

// Setup generic middleware
app.use(
  logger("dev", {
    stream: {
      // This is a "hack" that gets the output to appear in the remote debugger :)
      write: (msg) => console.info(msg),
    },
  }),
); // This records all HTTP requests
app.use(express.json()); // This processes requests as JSON
app.use(express.urlencoded({ extended: true })); // URL parser
app.use(cookieParser()); // Cookie parser

// Setup routers. ALL ROUTERS MUST use /api as a start point, or they
// won't be reached by the default proxy and prod setup
app.use("/api/nk-accounts", nkAccountsRouter);

/**
 * Catch all 404 errors, and forward them to the error handler
 */
app.use(function (_req: Request, _res: Response, next: NextFunction): void {
  // Have the next (generic error handler) process a 404 error
  next(createError(404));
});

/**
 * Generic error handler
 */
app.use(function (
  err: HttpError,
  _req: Request,
  res: Response,
  // To be an error handler, we need a next function (because who knows).
  // So we need to suppress this error
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // Reply with the error
  res
    .status(err.status || 500)
    // Try putting on the stack trace if we're not in prod and have one. Otherwise, default to message
    .send({
      message:
        process.env.NODE_ENV != "production" && err.stack
          ? err.stack
          : err.message,
    } satisfies IErrorResponse);
});

// Generic 404 handler
app.use(
  (
    req: Request,
    res: Response,
    // Express gets cranky, so we need this param
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _: NextFunction,
  ) => {
    res.sendStatus(404); // Send a 404
  },
);

export default app; // Export the backend, so that www.ts can start it
