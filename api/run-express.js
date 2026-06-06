export default async function handler(req, res) {
  try {
    // Dynamically import the bundled express app
    const { default: app } = await import("./index.js");
    
    // Forward the request to Express
    if (typeof app === "function" || (app && typeof app.handle === "function")) {
      return app(req, res);
    } else {
      throw new Error(`Imported app is not an Express application or handler function. Type: ${typeof app}`);
    }
  } catch (error) {
    res.setHeader("Content-Type", "application/json");
    res.status(500).json({
      success: false,
      error: error.message || String(error),
      stack: error.stack || "No stack trace available"
    });
  }
}
