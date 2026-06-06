export default function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.status(200).json({ 
    success: true, 
    message: "Vercel Serverless is working!",
    nodeVersion: process.version,
    env: {
      NODE_ENV: process.env.NODE_ENV || "not set",
      VERCEL: process.env.VERCEL || "not set"
    }
  });
}
