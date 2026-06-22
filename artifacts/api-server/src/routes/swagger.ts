import { Router } from "express";
import swaggerUi from "swagger-ui-express";

const router = Router();

const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "KaliGPT / mr7.ai API",
    version: "3.0.0",
    description: "Cybersecurity AI platform REST API — اختبار الاختراق والأمن السيبراني",
    contact: { name: "mr7.ai Support", url: "https://mr7.ai" },
  },
  servers: [
    { url: "/api", description: "Production API" },
  ],
  components: {
    securitySchemes: {
      BearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      ApiKeyAuth: { type: "apiKey", in: "header", name: "x-api-key" },
    },
  },
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  paths: {
    "/auth/register": {
      post: {
        tags: ["Authentication"],
        summary: "Register new account",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["email", "password"], properties: { email: { type: "string" }, password: { type: "string", minLength: 8 }, firstName: { type: "string" }, lastName: { type: "string" } } } } },
        },
        responses: {
          201: { description: "User created", content: { "application/json": { schema: { type: "object", properties: { user: { type: "object" }, accessToken: { type: "string" }, refreshToken: { type: "string" } } } } } },
          409: { description: "Email already registered" },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Login with email and password",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["email", "password"], properties: { email: { type: "string" }, password: { type: "string" } } } } } },
        responses: {
          200: { description: "Login successful" },
          401: { description: "Invalid credentials" },
        },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["Authentication"],
        summary: "Refresh access token",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["refreshToken"], properties: { refreshToken: { type: "string" } } } } } },
        responses: { 200: { description: "New tokens issued" } },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Authentication"],
        summary: "Get current user profile",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "User profile" }, 401: { description: "Unauthorized" } },
      },
    },
    "/chat": {
      post: {
        tags: ["AI"],
        summary: "Stream AI chat response",
        security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["messages"], properties: { messages: { type: "array", items: { type: "object", properties: { role: { type: "string", enum: ["user", "assistant", "system"] }, content: { type: "string" } } } }, model: { type: "string" }, persona: { type: "string" } } } } } },
        responses: { 200: { description: "SSE stream of tokens" } },
      },
    },
    "/scan/code": {
      post: {
        tags: ["Security Scanner"],
        summary: "AI-powered code vulnerability scanner",
        security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["code"], properties: { code: { type: "string", description: "Source code to analyze" }, filename: { type: "string" }, apiKey: { type: "string", description: "OpenAI API key (optional if set server-side)" } } } } } },
        responses: { 200: { description: "Vulnerability analysis results" } },
      },
    },
    "/stripe/plans": {
      get: {
        tags: ["Billing"],
        summary: "Get available subscription plans",
        responses: { 200: { description: "List of plans with pricing" } },
      },
    },
    "/stripe/create-checkout": {
      post: {
        tags: ["Billing"],
        summary: "Create Stripe checkout session",
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["planId"], properties: { planId: { type: "string", enum: ["pro", "enterprise"] } } } } } },
        responses: { 200: { description: "Checkout URL" } },
      },
    },
    "/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "Get user notifications",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "List of notifications with unread count" } },
      },
    },
    "/developer/keys": {
      get: { tags: ["Developer API"], summary: "List API keys", security: [{ BearerAuth: [] }], responses: { 200: { description: "User API keys" } } },
      post: {
        tags: ["Developer API"],
        summary: "Create new API key",
        security: [{ BearerAuth: [] }],
        requestBody: { required: false, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, permissions: { type: "array", items: { type: "string" } }, expiresInDays: { type: "number" } } } } } },
        responses: { 201: { description: "API key created — key shown only once" } },
      },
    },
    "/osint/url": {
      post: {
        tags: ["OSINT"],
        summary: "OSINT URL analysis",
        security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["url"], properties: { url: { type: "string" } } } } } },
        responses: { 200: { description: "OSINT analysis result" } },
      },
    },
  },
};

router.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: `
    .swagger-ui { background: #0a0a0a; color: #fff; }
    .swagger-ui .topbar { background: linear-gradient(135deg, #e21227, #a00d1a); }
    .swagger-ui .info .title { color: #e21227; }
    .swagger-ui .scheme-container { background: #111; }
    .swagger-ui .opblock { background: rgba(255,255,255,0.03); border-color: rgba(226,18,39,0.2); }
    .swagger-ui .opblock .opblock-summary { border-color: rgba(226,18,39,0.15); }
  `,
  customSiteTitle: "KaliGPT API Docs",
}));

router.get("/docs.json", (_req, res) => res.json(swaggerDocument));

export default router;
