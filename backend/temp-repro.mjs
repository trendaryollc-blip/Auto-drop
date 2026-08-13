import express from "express";
import request from "supertest";
import imageRoutes from "./routes/images.js";

global.fetch = async (url, options) => {
  console.log("FETCH URL", url);
  return {
    ok: true,
    headers: { get: () => "image/png" },
    arrayBuffer: async () => Buffer.from([1,2,3,4]).buffer,
  };
};

const app = express();
app.use("/api/images", imageRoutes);

const res = await request(app)
  .get("/api/images/proxy")
  .query({ url: "https://example.com/image.png", w: "600", q: "80", format: "format" })
  .buffer(true);

console.log("status", res.status);
console.log("ct", res.headers["content-type"]);
console.log("isBuffer", Buffer.isBuffer(res.body));
console.log("len", res.body?.length);
console.log("body bytes", res.body ? Array.from(res.body) : null);
