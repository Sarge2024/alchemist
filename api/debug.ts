export default async function handler(req: any, res: any) {
  try {
    const server = await import('../server.js');
    res.json({ success: true, message: "Server loaded successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
}
