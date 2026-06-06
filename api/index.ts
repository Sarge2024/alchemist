import app from '../server.js';

export default function handler(req: any, res: any) {
  try {
    return app(req, res);
  } catch (error: any) {
    console.error("FATAL VERCEL ERROR:", error);
    res.status(500).json({
      error: "Fatal server error",
      details: error.message || String(error)
    });
  }
}
